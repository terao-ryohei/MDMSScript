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
	NoteDuration,
	Pitch,
	note,
	part,
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
			colorCode: "§2",
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
			colorCode: "§6",
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
	[BGMEvent.SKILL_USE]: "detective_theme",
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
