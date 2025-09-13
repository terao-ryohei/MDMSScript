/**
 * BGM・音楽定義ファイル
 */

import { DETECTIVE_SCORE } from "src/constants/score/detective";
import {
	BGMEvent,
	type BGMTrack,
	Instrument,
	Key,
	type Melody,
	note,
	type Note,
	NoteDuration,
	part,
	Pitch,
	rest,
} from "../types/AudioTypes";

// 楽譜記述用エイリアス
const n = note;
const restAlias = rest;
const partAlias = part;

/**
 * プリセットメロディー定義
 */
export const MELODIES: Record<string, Melody> = {
	// 探偵テーマ（オリジナル）
	detective_theme: {
		id: "detective_theme",
		name: "探偵のテーマ",
		description: "推理ゲームに最適なミステリアスな探偵テーマ",
		tempo: 134,
		totalBeats: 32,
		loop: false, // まずはループなしでテスト
		priority: 10, // 優先度（高いほど優先）
		parts: DETECTIVE_SCORE,
	},

	// 平和な日常テーマ（シンプル）
	peaceful_daily: {
		id: "peaceful_daily",
		name: "平和な日常",
		description: "穏やかな準備・生活フェーズのBGM",
		tempo: 100,
		totalBeats: 16,
		loop: true,
		priority: 5,
		parts: [
			partAlias(
				"peaceful_melody",
				"平和なメロディ",
				Instrument.BLOCK_NOTE_HARP,
				[
					n(Pitch.C4, NoteDuration.HALF),
					n(Pitch.E4, NoteDuration.HALF),
					n(Pitch.G4, NoteDuration.HALF),
					n(Pitch.E4, NoteDuration.HALF),
					n(Pitch.F4, NoteDuration.HALF),
					n(Pitch.D4, NoteDuration.HALF),
					n(Pitch.C4, NoteDuration.WHOLE),
					restAlias(NoteDuration.WHOLE),
				],
				0.6,
				0,
			),
		],
	},
};

/**
 * 簡単作曲用のプリセット
 */
export const COMPOSITION_PRESETS = {
	// 基本的なコード進行
	CHORD_PROGRESSIONS: {
		// C-F-G-C（王道進行）
		basic_progression: [
			[Pitch.C3, Pitch.E3, Pitch.G3], // Cメジャー
			[Pitch.F3, Pitch.A3, Pitch.C4], // Fメジャー
			[Pitch.G3, Pitch.B3, Pitch.D4], // Gメジャー
			[Pitch.C3, Pitch.E3, Pitch.G3], // Cメジャー
		],

		// Am-F-C-G（ポップス進行）
		pop_progression: [
			[Pitch.A2, Pitch.C3, Pitch.E3], // Aマイナー
			[Pitch.F2, Pitch.A2, Pitch.C3], // Fメジャー
			[Pitch.C3, Pitch.E3, Pitch.G3], // Cメジャー
			[Pitch.G2, Pitch.B2, Pitch.D3], // Gメジャー
		],

		// カノン進行（パッヘルベルのカノン）
		canon_progression: [
			[Pitch.C3, Pitch.E3, Pitch.G3], // I (C)
			[Pitch.G2, Pitch.B2, Pitch.D3], // V (G)
			[Pitch.A2, Pitch.C3, Pitch.E3], // vi (Am)
			[Pitch.E3, Pitch.AS3, Pitch.B3], // III (Em)
			[Pitch.F2, Pitch.A2, Pitch.C3], // IV (F)
			[Pitch.C3, Pitch.E3, Pitch.G3], // I (C)
			[Pitch.F2, Pitch.A2, Pitch.C3], // IV (F)
			[Pitch.G2, Pitch.B2, Pitch.D3], // V (G)
		],

		// ジャズ風進行（ii-V-I）
		jazz_progression: [
			[Pitch.D3, Pitch.F3, Pitch.A3], // Dm7
			[Pitch.G2, Pitch.B2, Pitch.F3], // G7
			[Pitch.C3, Pitch.E3, Pitch.G3], // CMaj7
			[Pitch.C3, Pitch.E3, Pitch.G3], // CMaj7
		],

		// ブルース進行（12バー）
		blues_progression: [
			[Pitch.C3, Pitch.E3, Pitch.BS3], // C7
			[Pitch.F2, Pitch.A2, Pitch.ES3], // F7
			[Pitch.C3, Pitch.E3, Pitch.BS3], // C7
			[Pitch.G2, Pitch.B2, Pitch.F3], // G7
		],

		// 半音階的進行
		chromatic_progression: [
			[Pitch.C3, Pitch.E3, Pitch.G3], // C
			[Pitch.DS3, Pitch.F3, Pitch.AS3], // C#dim
			[Pitch.D3, Pitch.GS3, Pitch.A3], // D
			[Pitch.ES3, Pitch.G3, Pitch.BS3], // D#dim
		],
	},

	// リズムパターン
	RHYTHM_PATTERNS: {
		basic_4_4: [
			NoteDuration.QUARTER,
			NoteDuration.QUARTER,
			NoteDuration.QUARTER,
			NoteDuration.QUARTER,
		],
		waltz_3_4: [
			NoteDuration.QUARTER,
			NoteDuration.QUARTER,
			NoteDuration.QUARTER,
		],
		syncopated: [
			NoteDuration.EIGHTH,
			NoteDuration.QUARTER,
			NoteDuration.EIGHTH,
			NoteDuration.QUARTER,
		],
	},

	// 楽器セット
	INSTRUMENT_SETS: {
		orchestral: [
			Instrument.BLOCK_NOTE_HARP,
			Instrument.BLOCK_NOTE_FLUTE,
			Instrument.BLOCK_NOTE_BELL,
		],
		folk: [
			Instrument.BLOCK_NOTE_GUITAR,
			Instrument.BLOCK_NOTE_BASS,
			Instrument.BLOCK_NOTE_HAT,
		],
		mystical: [
			Instrument.BLOCK_NOTE_CHIME,
			Instrument.BLOCK_NOTE_BELL,
			Instrument.BLOCK_NOTE_PLING,
		],
	},
};

/**
 * 楽曲生成用のヘルパー関数
 */

/**
 * 基本的なメロディーを生成
 */
export function generateSimpleMelody(
	key: Pitch = Pitch.C3,
	length: number = 8,
): Note[] {
	const scale = getScale(key);
	const notes: Note[] = [];

	for (let i = 0; i < length; i++) {
		const pitch = scale[Math.floor(Math.random() * scale.length)];
		const duration =
			Math.random() > 0.7 ? NoteDuration.HALF : NoteDuration.QUARTER;
		notes.push({ pitch, duration });
	}

	return notes;
}

/**
 * スケール（音階）を取得
 */
export function getScale(
	root: Pitch = Pitch.C3,
	scaleType: "major" | "minor" | "chromatic" | "pentatonic" = "major",
): Pitch[] {
	switch (scaleType) {
		case "major":
			// メジャースケール（全全半全全全半）
			return [
				Pitch.C3,
				Pitch.D3,
				Pitch.E3,
				Pitch.F3,
				Pitch.G3,
				Pitch.A3,
				Pitch.B3,
				Pitch.C4,
			];

		case "minor":
			// ナチュラルマイナースケール（全半全全半全全）
			return [
				Pitch.A2,
				Pitch.B2,
				Pitch.C3,
				Pitch.D3,
				Pitch.E3,
				Pitch.F3,
				Pitch.G3,
				Pitch.A3,
			];

		case "chromatic":
			// 半音階（12音すべて）
			return [
				Pitch.C3,
				Pitch.DS3,
				Pitch.D3,
				Pitch.ES3,
				Pitch.E3,
				Pitch.F3,
				Pitch.GS3,
				Pitch.G3,
				Pitch.AS3,
				Pitch.A3,
				Pitch.BS3,
				Pitch.B3,
			];

		case "pentatonic":
			// ペンタトニックスケール（5音階）
			return [Pitch.C3, Pitch.D3, Pitch.E3, Pitch.G3, Pitch.A3];

		default:
			return [
				Pitch.C3,
				Pitch.D3,
				Pitch.E3,
				Pitch.F3,
				Pitch.G3,
				Pitch.A3,
				Pitch.B3,
				Pitch.C4,
			];
	}
}

/**
 * 調性Eテスト用メロディを既存のMELODIESに追加
 */
export const KEY_E_TEST_MELODY: Melody = {
	id: "key_e_test",
	name: "調性Eテスト",
	description: "E調での音階テスト（C調で記述、E調で再生）",
	tempo: 120,
	totalBeats: 8,
	loop: false,
	priority: 1,
	parts: [
		partAlias(
			"melody_e",
			"E調メロディ",
			Instrument.BLOCK_NOTE_HARP,
			[
				// C調で書かれたドレミファソ → E調ではミ#ファ#ソ#ラ#シで再生される
				n(Pitch.C3, NoteDuration.QUARTER), // C3 → E3 (3半音上)
				n(Pitch.D3, NoteDuration.QUARTER), // D3 → GS3
				n(Pitch.E3, NoteDuration.QUARTER), // E3 → AS3
				n(Pitch.F3, NoteDuration.QUARTER), // F3 → A3
				n(Pitch.G3, NoteDuration.QUARTER), // G3 → B3
				restAlias(NoteDuration.QUARTER),
				restAlias(NoteDuration.HALF),
			],
			0.8,
			0,
		),
	],
};

// InstrumentPartにkey属性を設定
KEY_E_TEST_MELODY.parts[0].key = Key.E;

/**
 * BGMトラック定義（シンプル版）
 */
export const BGM_TRACKS: Record<string, BGMTrack> = {
	// 探偵テーマ
	detective_theme: {
		id: "detective_theme",
		name: "探偵のテーマ",
		description: "推理・調査時のBGM",
		melodies: [MELODIES.detective_theme],
		priority: 10,
		uiDisplayInfo: {
			colorCode: "§9",
			iconPath: "textures/ui/sound_glyph",
		},
	},

	// 平和な日常
	peaceful_daily: {
		id: "peaceful_daily",
		name: "平和な日常",
		description: "準備・生活フェーズのBGM",
		melodies: [MELODIES.peaceful_daily],
		priority: 5,
		uiDisplayInfo: {
			colorCode: "§a",
			iconPath: "textures/ui/sound_glyph",
		},
	},

	// 調性Eテスト用トラック
	key_e_test: {
		id: "key_e_test",
		name: "調性Eテスト",
		description: "E調での音階テスト",
		melodies: [KEY_E_TEST_MELODY],
		priority: 1,
		uiDisplayInfo: {
			colorCode: "§e",
			iconPath: "textures/ui/sound_glyph",
		},
	},
};

/**
 * BGMイベントとトラックのマッピング
 */
export const BGM_EVENT_MAPPING: Record<BGMEvent, string> = {
	[BGMEvent.GAME_START]: "peaceful_daily",
	[BGMEvent.PHASE_PREPARATION]: "peaceful_daily",
	[BGMEvent.PHASE_DAILY_LIFE]: "peaceful_daily",
	[BGMEvent.MURDER_OCCURRED]: "detective_theme",
	[BGMEvent.PHASE_INVESTIGATION]: "detective_theme",
	[BGMEvent.PHASE_DISCUSSION]: "detective_theme",
	[BGMEvent.PHASE_VOTING]: "detective_theme",
	[BGMEvent.GAME_END_WIN]: "peaceful_daily",
	[BGMEvent.GAME_END_LOSE]: "detective_theme",
	[BGMEvent.ABILITY_USE]: "detective_theme",
	[BGMEvent.EVIDENCE_FOUND]: "detective_theme",
	[BGMEvent.SUSPICION_HIGH]: "detective_theme",
	[BGMEvent.DRAMATIC_MOMENT]: "detective_theme",
};

/**
 * BGM表示用情報を取得
 */
export function getBGMDisplayInfo(): Array<{
	id: string;
	name: string;
	description: string;
}> {
	return Object.values(BGM_TRACKS).map((track) => ({
		id: track.id,
		name: track.name,
		description: track.description,
	}));
}
