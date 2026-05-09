// ============================================================
// Mahjong Score Calculator — Type Definitions
// ============================================================

/** 牌の色（スート） */
export type TileSuit = 'm' | 'p' | 's' | 'z';

/** 牌を表す文字列。例: "1m", "5p", "東", "白" */
export type TileId = string;

/**
 * 牌を数値で表現する。
 * 萬子: 11-19 (1m-9m), 筒子: 21-29 (1p-9p), 索子: 31-39 (1s-9s)
 * 字牌: 41=東, 42=南, 43=西, 44=北, 45=白, 46=發, 47=中
 * 赤ドラ: 10=赤5m, 20=赤5p, 30=赤5s
 */
export type TileCode = number;

/** メンツの種類 */
export type MeldType = 'shuntsu' | 'koutsu' | 'kantsu';

/** 副露の種類 */
export type CallType = 'chi' | 'pon' | 'minkan' | 'ankan';

/** メンツ */
export interface Meld {
  type: MeldType;
  tiles: TileCode[];
  /** 副露されているか（false=暗、true=明） */
  isOpen: boolean;
  /** 副露の種類（副露時のみ） */
  callType?: CallType;
}

/** 雀頭 */
export interface Pair {
  tile: TileCode;
}

/** 待ちの種類 */
export type WaitType = 'ryanmen' | 'shanpon' | 'kanchan' | 'penchan' | 'tanki';

/** パースされたアガリ形 */
export interface ParsedHand {
  melds: Meld[];
  pair: Pair;
  waitType: WaitType;
  /** 七対子かどうか */
  isChiitoitsu: boolean;
  /** 国士無双かどうか */
  isKokushi: boolean;
}

/** ゲームの状況 */
export interface GameContext {
  /** 親かどうか */
  isDealer: boolean;
  /** ツモかどうか (false = ロン) */
  isTsumo: boolean;
  /** リーチ */
  isRiichi: boolean;
  /** ダブルリーチ */
  isDoubleRiichi: boolean;
  /** 一発 */
  isIppatsu: boolean;
  /** 嶺上開花 */
  isRinshan: boolean;
  /** 槍槓 */
  isChankan: boolean;
  /** 海底摸月 */
  isHaitei: boolean;
  /** 河底撈魚 */
  isHoutei: boolean;
  /** 天和 */
  isTenhou: boolean;
  /** 地和 */
  isChiihou: boolean;
  /** 場風 (41=東, 42=南) */
  roundWind: TileCode;
  /** 自風 (41=東, 42=南, 43=西, 44=北) */
  seatWind: TileCode;
  /** ドラ表示牌 */
  doraIndicators: TileCode[];
  /** 裏ドラ表示牌 */
  uraDoraIndicators: TileCode[];
  /** 赤ドラの枚数 (手牌に含まれる赤ドラ) */
  redDoraCount: number;
  /** 流し満貫 */
  isNagashiMangan: boolean;
}

/** 手牌入力 */
export interface HandInput {
  /** 手牌（アガリ牌を含む14枚、副露分は除く） */
  tiles: TileCode[];
  /** アガリ牌 */
  agariTile: TileCode;
  /** 副露したメンツ */
  calledMelds: Meld[];
}

/** 個別の役 */
export interface YakuEntry {
  name: string;
  /** 翻数 (役満は13, ダブル役満は26) */
  han: number;
  /** 役満の倍数 (通常役は0, 役満は1, ダブル役満は2) */
  yakumanMultiplier: number;
}

/** 符の内訳 */
export interface FuDetail {
  name: string;
  fu: number;
}

/** 点数計算の最終結果 */
export interface ScoreResult {
  /** 成立した役の一覧 */
  yaku: YakuEntry[];
  /** 合計翻数 */
  han: number;
  /** 符数 */
  fu: number;
  /** 符の内訳 */
  fuDetails: FuDetail[];
  /** 役満の倍数 (0=通常, 1=役満, 2=ダブル役満, ...) */
  yakumanMultiplier: number;
  /** ロン時の点数 */
  ronScore?: number;
  /** ツモ時の子の支払い */
  tsumoScoreChild?: number;
  /** ツモ時の親の支払い */
  tsumoScoreDealer?: number;
  /** エラーメッセージ */
  error?: string;
}
