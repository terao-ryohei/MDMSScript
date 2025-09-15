import { type Player, system, world } from "@minecraft/server";
import { BGM_EVENT_MAPPING, BGM_TRACKS } from "../data/MusicDefinitions";
import type {
	AudioSettings,
	BGMEvent,
	Instrument,
	InstrumentPart,
	Key,
	Melody,
	Note,
	PlayingBGM,
} from "../types/AudioTypes";
import { transposeNote } from "../types/AudioTypes";

/**
 * BGM管理マネージャー（シンプル版）
 * playsoundコマンドを使用したBGM・音響システム
 */

// モジュールスコープの状態変数
let currentBGM: PlayingBGM | null = null;
const playbackTimers: Map<string, number> = new Map();
let isInitialized: boolean = false;

let audioSettings: AudioSettings = {
	masterVolume: 1.0,
	bgmVolume: 0.8,
	sfxVolume: 0.8,
	enableBGM: true,
	enableSFX: true,
	maxSimultaneousNotes: 50,
};

/**
 * BGMManagerを初期化
 */
export function initializeBGMManager(): void {
	if (isInitialized) return;

	isInitialized = true;
	console.log("BGMManager initialized");
}

/**
 * BGMを再生
 */
export function playBGM(trackId: string): boolean {
	const track = BGM_TRACKS[trackId];
	if (!track) {
		console.warn(`BGM track not found: ${trackId}`);
		return false;
	}

	stopBGM();

	const bgm: PlayingBGM = {
		track: track,
		startTime: Date.now(),
		currentBeat: 0,
		isPlaying: true,
		volume: audioSettings.bgmVolume,
	};

	currentBGM = bgm;

	// 少し待ってから再生開始
	system.runTimeout(() => {
		if (track.melodies && track.melodies.length > 0) {
			track.melodies.forEach((melody: Melody) => playMelody(melody, bgm));
		}
	}, 5);

	return true;
}

/**
 * BGMイベントによる再生
 */
export function playBGMEvent(event: BGMEvent): boolean {
	const trackId = BGM_EVENT_MAPPING[event];
	return trackId ? playBGM(trackId) : false;
}

/**
 * BGMを停止
 */
export function stopBGM(): void {
	if (currentBGM) {
		currentBGM.isPlaying = false;
		currentBGM = null;
	}

	// 全タイマーをクリア
	playbackTimers.forEach((timerId) => system.clearRun(timerId));
	playbackTimers.clear();
}

/**
 * メロディーを再生
 */
function playMelody(melody: Melody, bgm: PlayingBGM): void {
	// メロディーの存在確認
	if (!melody) {
		console.warn("Melody is undefined or null");
		return;
	}

	// パーツの存在確認
	if (!melody.parts) {
		console.warn(`Melody ${melody.id} has no parts defined`);
		return;
	}

	if (melody.parts.length === 0) {
		console.warn(`Melody ${melody.id} has empty parts array`);
		return;
	}

	const beatDuration = (60 / melody.tempo) * 20; // 1拍の長さ（ticks）

	const playMelodyCycle = () => {
		if (!bgm.isPlaying) return;

		melody.parts.forEach((part, index) => {
			// 各パートの存在確認
			if (!part) {
				console.warn(`Part ${index} in melody ${melody.id} is undefined`);
				return;
			}
			playInstrumentPart(part, bgm, beatDuration);
		});

		// ループ設定がある場合は再スケジュール
		if (melody.loop) {
			const totalDuration = (melody.totalBeats || 16) * beatDuration;
			const timerId = system.runTimeout(() => {
				if (bgm.isPlaying) playMelodyCycle();
			}, totalDuration);

			playbackTimers.set(`${melody.id}_loop`, timerId);
		}
	};

	playMelodyCycle();
}

/**
 * 楽器パートを再生
 */
function playInstrumentPart(
	part: InstrumentPart,
	bgm: PlayingBGM,
	beatDuration: number,
): void {
	let currentBeat = part.delay || 0;

	part.notes.forEach((note, index) => {
		const waitTime = currentBeat * beatDuration;

		const timerId = system.runTimeout(() => {
			if (bgm.isPlaying) {
				// 調性変換を適用
				const transposedNote = part.key
					? transposeNote(note, part.key as Key)
					: note;

				playNote(part.instrument, transposedNote, part.volume * bgm.volume);
			}
		}, waitTime);

		playbackTimers.set(`${part.id}_note_${index}`, timerId);

		// 次の音符のタイミングを計算
		const duration = "duration" in note ? note.duration : 1.0;
		currentBeat += duration;
	});
}

/**
 * 音符を再生
 */
function playNote(instrument: Instrument, note: Note, volume: number): void {
	if (!audioSettings.enableBGM) return;

	// 休符の場合はスキップ
	if (note.volume === 0 || note.duration === 0) return;

	const effectiveVolume = Math.min(
		1.0,
		Math.max(0.0, (note.volume || 1.0) * volume * audioSettings.masterVolume),
	);

	// 全プレイヤーに音を再生
	world.getAllPlayers().forEach((player) => {
		try {
			player.playSound(instrument, {
				volume: effectiveVolume,
				pitch: note.pitch,
			});
		} catch (error) {
			// プレイヤーが無効な場合は無視
		}
	});
}

/**
 * 効果音を再生
 */
export function playSFX(
	sound: string,
	volume = 1.0,
	pitch = 1.0,
	player?: Player,
): void {
	if (!audioSettings.enableSFX) return;

	const effectiveVolume =
		volume * audioSettings.sfxVolume * audioSettings.masterVolume;

	try {
		if (player) {
			player.playSound(sound, { volume: effectiveVolume, pitch });
		} else {
			world.getAllPlayers().forEach((p) => {
				p.playSound(sound, { volume: effectiveVolume, pitch });
			});
		}
	} catch (error) {
		console.warn("Failed to play SFX:", error);
	}
}

/**
 * 音響設定を更新
 */
export function updateAudioSettings(settings: Partial<AudioSettings>): void {
	audioSettings = { ...audioSettings, ...settings };

	if (currentBGM) {
		currentBGM.volume = audioSettings.bgmVolume;
	}
}

/**
 * 現在の音響設定を取得
 */
export function getAudioSettings(): AudioSettings {
	return { ...audioSettings };
}

/**
 * 現在再生中のBGM情報を取得
 */
export function getCurrentBGM(): PlayingBGM | null {
	return currentBGM;
}

/**
 * システム終了時のクリーンアップ
 */
export function dispose(): void {
	stopBGM();
	isInitialized = false;
}
