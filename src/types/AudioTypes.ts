/**
 * 音楽・音響システムの型定義
 */

/**
 * 楽器（音色）の定義
 */
export enum Instrument {
	// Minecraft標準音
	BLOCK_NOTE_HARP = "note.harp", // ハープ（ピアノ音）
	BLOCK_NOTE_BASS = "note.bass", // ベース（低音）
	BLOCK_NOTE_SNARE = "note.snare", // スネアドラム
	BLOCK_NOTE_HAT = "note.hat", // ハイハット
	BLOCK_NOTE_BASEDRUM = "note.basedrum", // バスドラム
	BLOCK_NOTE_BELL = "note.bell", // ベル（金属音）
	BLOCK_NOTE_FLUTE = "note.flute", // フルート
	BLOCK_NOTE_CHIME = "note.chime", // チャイム
	BLOCK_NOTE_GUITAR = "note.guitar", // ギター
	BLOCK_NOTE_XYLOPHONE = "note.xylophone", // 木琴
	BLOCK_NOTE_PLING = "note.pling", // プリング（高音ピアノ）
	BLOCK_NOTE_DIDGERIDOO = "note.didgeridoo", // ディジュリドゥ

	// 効果音
	BLOCK_IRON_TRAPDOOR_OPEN = "open.iron_trapdoor", // 金床
	BLOCK_ANVIL_LAND = "random.anvil_land", // 金床
	ENTITY_VILLAGER_NO = "mob.villager.no", // 村人（いいえ）

	REST = "", // 休符（音なし）
}

/**
 * 音の高さ（ピッチ）
 * 半音階（シャープ・フラット）対応版
 */
export enum Pitch {
	// 超低音域（オクターブ1）
	C1 = 0.25, // ド（超低音）
	DS1 = 0.265, // ド♯/レ♭（超低音）
	D1 = 0.281, // レ（超低音）
	ES1 = 0.297, // レ♯/ミ♭（超低音）
	E1 = 0.315, // ミ（超低音）
	F1 = 0.334, // ファ（超低音）
	GS1 = 0.354, // ファ♯/ソ♭（超低音）
	G1 = 0.375, // ソ（超低音）
	AS1 = 0.397, // ソ♯/ラ♭（超低音）
	A1 = 0.42, // ラ（超低音）
	BS1 = 0.445, // ラ♯/シ♭（超低音）
	B1 = 0.472, // シ（超低音）

	// 低音域（オクターブ2）
	C2 = 0.5, // ド（低）
	DS2 = 0.53, // ド♯/レ♭（低）
	D2 = 0.561, // レ（低）
	ES2 = 0.595, // レ♯/ミ♭（低）
	E2 = 0.63, // ミ（低）
	F2 = 0.667, // ファ（低）
	GS2 = 0.707, // ファ♯/ソ♭（低）
	G2 = 0.749, // ソ（低）
	AS2 = 0.794, // ソ♯/ラ♭（低）
	A2 = 0.841, // ラ（低）
	BS2 = 0.891, // ラ♯/シ♭（低）
	B2 = 0.944, // シ（低）

	// 中音域（オクターブ3）
	C3 = 1.0, // ド
	DS3 = 1.059, // ド♯/レ♭
	D3 = 1.122, // レ
	ES3 = 1.189, // レ♯/ミ♭
	E3 = 1.26, // ミ
	F3 = 1.335, // ファ
	GS3 = 1.414, // ファ♯/ソ♭
	G3 = 1.498, // ソ
	AS3 = 1.587, // ソ♯/ラ♭
	A3 = 1.682, // ラ
	BS3 = 1.782, // ラ♯/シ♭
	B3 = 1.888, // シ

	// 高音域（オクターブ4）
	C4 = 2.0, // ド（高）
	DS4 = 2.118, // ド♯/レ♭（高）
	D4 = 2.244, // レ（高）
	ES4 = 2.378, // レ♯/ミ♭（高）
	E4 = 2.52, // ミ（高）
	F4 = 2.67, // ファ（高）
	GS4 = 2.828, // ファ♯/ソ♭（高）
	G4 = 2.996, // ソ（高）
	AS4 = 3.175, // ソ♯/ラ♭（高）
	A4 = 3.364, // ラ（高）
	BS4 = 3.564, // ラ♯/シ♭（高）
	B4 = 3.776, // シ（高）

	// さらなる高音域（オクターブ5）
	C5 = 4.0, // ド（最高）
	DS5 = 4.237, // ド♯/レ♭（最高）
	D5 = 4.488, // レ（最高）
	ES5 = 4.757, // レ♯/ミ♭（最高）
	E5 = 5.04, // ミ（最高）
	F5 = 5.34, // ファ（最高）
	GS5 = 5.657, // ファ♯/ソ♭（最高）
	G5 = 5.993, // ソ（最高）
	AS5 = 6.35, // ソ♯/ラ♭（最高）
	A5 = 6.728, // ラ（最高）
	BS5 = 7.128, // ラ♯/シ♭（最高）
	B5 = 7.552, // シ（最高）
	// さらに高音域（オクターブ6）
	C6 = 8.0, // ド（超高音）
	DS6 = 8.474, // ド♯/レ♭（超高音）
	D6 = 8.976, // レ（超高音）
	ES6 = 9.514, // レ♯/ミ♭（超高音）
	E6 = 10.08, // ミ（超高音）
	F6 = 10.68, // ファ（超高音）
	GS6 = 11.314, // ファ♯/ソ♭（超高音）
	G6 = 11.986, // ソ（超高音）
}

/**
 * 音符の長さ
 */
export enum NoteDuration {
	WHOLE = 4.0, // 全音符（4拍）
	POINT_HALF = 3.0, // 付点二分音符（3拍）
	HALF = 2.0, // 二分音符（2拍）
	POINT_QUARTER = 1.5, // 付点四分音符（1.5拍）
	QUARTER = 1.0, // 四分音符（1拍）
	POINT_EIGHTH = 0.75, // 付点八分音符（0.75拍）
	EIGHTH = 0.5, // 八分音符（0.5拍）
	POINT_SIXTEENTH = 0.375, // 付点十六分音符（0.375拍）
	SIXTEENTH = 0.25, // 十六分音符（0.25拍）
	POINT_THIRTY_SECOND = 0.1875, // 付点三十二分音符（0.1875拍）
	THIRTY_SECOND = 0.125, // 三十二分音符（0.125拍）
	REST = 0, // 休符
}

/**
 * 音符の定義
 */
export interface Note {
	pitch: Pitch; // 音の高さ
	duration: NoteDuration; // 音符の長さ
	volume?: number; // 音量（0.0-1.0、デフォルト: 1.0）
}

/**
 * 楽器パートの定義（単一楽器による演奏）
 */
export interface InstrumentPart {
	id: string; // パートID
	name: string; // パート名
	instrument: Instrument; // 使用楽器
	notes: Note[]; // 音符の配列
	volume: number; // パート全体の音量
	delay: number; // 開始遅延（拍数）
	key?: Key; // 調性（キー、オプション）
}

/**
 * メロディーの定義（マルチパート対応）
 */
export interface Melody {
	id: string; // メロディーID
	name: string; // メロディー名
	description: string; // 説明
	tempo: number; // テンポ（BPM、beats per minute）
	parts: InstrumentPart[]; // 楽器パート群（複数同時再生）
	totalBeats: number; // 総拍数
	loop: boolean; // ループするかどうか

	// UI表示用オプション
	uiDisplayInfo?: {
		colorCode?: string; // Minecraft色コード（例: "§6"）
		iconPath?: string; // アイコンパス（例: "textures/ui/book_edit_default"）
		category?: string; // カテゴリ（例: "classical", "detective", "ambient"）
	};

	priority: number; // 優先度（高いほど優先）
}

/**
 * BGMトラックの定義
 */
export interface BGMTrack {
	id: string; // トラックID
	name: string; // トラック名
	description: string; // 説明
	melodies: Melody[]; // 複数のメロディー（並行再生）
	fadeIn?: number; // フェードイン時間（秒）
	fadeOut?: number; // フェードアウト時間（秒）
	priority: number; // 優先度（高いほど優先）

	// UI表示用オプション
	uiDisplayInfo?: {
		colorCode?: string; // Minecraft色コード（例: "§6"）
		iconPath?: string; // アイコンパス（例: "textures/ui/book_edit_default"）
		category?: string; // カテゴリ（例: "classical", "detective", "ambient"）
		hidden?: boolean; // UIで非表示にするか
	};
}

/**
 * BGMイベントの種類
 */
export enum BGMEvent {
	GAME_START = "game_start", // ゲーム開始
	PHASE_PREPARATION = "phase_prep", // 準備フェーズ
	PHASE_DAILY_LIFE = "phase_daily", // 生活フェーズ
	MURDER_OCCURRED = "murder_occurred", // 殺人発生
	PHASE_INVESTIGATION = "phase_inv", // 調査フェーズ
	PHASE_DISCUSSION = "phase_disc", // 会議フェーズ
	PHASE_VOTING = "phase_vote", // 投票フェーズ
	GAME_END_WIN = "game_end_win", // ゲーム終了（勝利）
	GAME_END_LOSE = "game_end_lose", // ゲーム終了（敗北）
	SKILL_USE = "skill_use", // スキル使用
	EVIDENCE_FOUND = "evidence_found", // 証拠発見
	SUSPICION_HIGH = "suspicion_high", // 高い疑惑
	DRAMATIC_MOMENT = "dramatic_moment", // ドラマチックな瞬間
}

/**
 * 音響設定
 */
export interface AudioSettings {
	masterVolume: number; // マスター音量（0.0-1.0）
	bgmVolume: number; // BGM音量（0.0-1.0）
	sfxVolume: number; // 効果音音量（0.0-1.0）
	enableBGM: boolean; // BGM有効化
	enableSFX: boolean; // 効果音有効化
	maxSimultaneousNotes: number; // 同時再生可能音数
}

/**
 * 再生中のBGM状態
 */
export interface PlayingBGM {
	track: BGMTrack;
	startTime: number; // 開始時刻
	currentBeat: number; // 現在の拍
	isPlaying: boolean; // 再生中かどうか
	volume: number; // 現在の音量
	fadeTimer?: number; // フェード用タイマーID
}

/**
 * 調性（キー）の定義
 */
export enum Key {
	C = "C", // ハ長調（移調なし）
	Eb = "Eb", // 変ホ長調（3半音下）
	E = "E", // イ長調（3半音上）
	Bb = "Bb", // 変ロ長調（2半音下）
	F = "F", // ヘ長調（5半音上 = 7半音下）
}

/**
 * 調性変換システム
 */

// 調性ごとの移調量（半音単位）
const TRANSPOSITION_MAP: Record<Key, number> = {
	[Key.C]: 0, // 移調なし
	[Key.Eb]: 3, // 3半音下（E♭メジャー）
	[Key.E]: 3, // 3半音上（イ長調）
	[Key.Bb]: -2, // 2半音下（B♭メジャー）
	[Key.F]: 5, // 5半音上 = 7半音下（Fメジャー）
};

// 半音単位でピッチを調整
function adjustPitchBySemitones(
	originalPitch: number,
	semitones: number,
): number {
	// 各半音は約1.059463倍の周波数比
	const semitoneFactor = 2 ** (1 / 12);
	return originalPitch * semitoneFactor ** semitones;
}

// 最も近いPitchを見つける
function findClosestPitch(targetValue: number): Pitch {
	const pitches = Object.values(Pitch).filter(
		(p) => typeof p === "number",
	) as number[];
	let closest = pitches[0];
	let minDiff = Math.abs(targetValue - closest);

	for (const pitch of pitches) {
		const diff = Math.abs(targetValue - pitch);
		if (diff < minDiff) {
			minDiff = diff;
			closest = pitch;
		}
	}

	return closest as Pitch;
}

// C調でのピッチを他の調に変換
export function transposePitch(originalPitch: Pitch, targetKey: Key): Pitch {
	const semitones = TRANSPOSITION_MAP[targetKey];
	if (semitones === 0) return originalPitch; // C調はそのまま

	const pitchValue = originalPitch as number;
	const newPitchValue = adjustPitchBySemitones(pitchValue, semitones);

	// 最も近いPitchを見つける
	return findClosestPitch(newPitchValue);
}

// C調の音符を指定調性に変換
export function transposeNote(note: Note, targetKey: Key): Note {
	return {
		...note,
		pitch: transposePitch(note.pitch, targetKey),
	};
}

/**
 * 音符作成
 */
export function note(
	pitch: Pitch,
	duration: NoteDuration,
	volume?: number,
): Note {
	return { pitch, duration, volume };
}

/**
 * 休符作成
 */
export function rest(duration: NoteDuration): Note {
	return {
		pitch: Pitch.C3,
		duration: duration,
		volume: 0,
	};
}

/**
 * 楽器パート作成
 */
export function part(
	id: string,
	name: string,
	instrument: Instrument,
	notes: Note[],
	volume = 1.0,
	delay = 0,
	key?: Key,
): InstrumentPart {
	return { id, name, instrument, notes, volume, delay, key };
}
