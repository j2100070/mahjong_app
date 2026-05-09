// ============================================================
// Mahjong Score Calculator — Tile Utilities
// ============================================================
import type { TileCode, TileSuit } from './types';

// ---- 牌コード定数 ----
// 萬子: 11-19, 筒子: 21-29, 索子: 31-39
// 字牌: 41=東, 42=南, 43=西, 44=北, 45=白, 46=發, 47=中
// 赤ドラ: 10=赤5m, 20=赤5p, 30=赤5s

export const WIND_EAST = 41;
export const WIND_SOUTH = 42;
export const WIND_WEST = 43;
export const WIND_NORTH = 44;
export const DRAGON_WHITE = 45;
export const DRAGON_GREEN = 46;
export const DRAGON_RED = 47;

export const RED_5M = 10;
export const RED_5P = 20;
export const RED_5S = 30;

/** 牌のスートを取得 */
export function getSuit(tile: TileCode): TileSuit {
  if (isRedDora(tile)) {
    if (tile === RED_5M) return 'm';
    if (tile === RED_5P) return 'p';
    return 's';
  }
  const tens = Math.floor(tile / 10);
  if (tens === 1) return 'm';
  if (tens === 2) return 'p';
  if (tens === 3) return 's';
  return 'z';
}

/** 牌の数字を取得（字牌は0を返す） */
export function getNumber(tile: TileCode): number {
  if (isRedDora(tile)) return 5;
  if (isJihai(tile)) return 0;
  return tile % 10;
}

/** 赤ドラを通常の5牌に正規化 */
export function normalize(tile: TileCode): TileCode {
  if (tile === RED_5M) return 15;
  if (tile === RED_5P) return 25;
  if (tile === RED_5S) return 35;
  return tile;
}

/** 赤ドラかどうか */
export function isRedDora(tile: TileCode): boolean {
  return tile === RED_5M || tile === RED_5P || tile === RED_5S;
}

/** 字牌かどうか */
export function isJihai(tile: TileCode): boolean {
  const n = normalize(tile);
  return n >= 41 && n <= 47;
}

/** 風牌かどうか */
export function isKazehai(tile: TileCode): boolean {
  const n = normalize(tile);
  return n >= 41 && n <= 44;
}

/** 三元牌かどうか */
export function isSangenpai(tile: TileCode): boolean {
  const n = normalize(tile);
  return n >= 45 && n <= 47;
}

/** 么九牌（1,9牌または字牌）かどうか */
export function isYaochu(tile: TileCode): boolean {
  const n = normalize(tile);
  if (isJihai(n)) return true;
  const num = n % 10;
  return num === 1 || num === 9;
}

/** 中張牌（2-8の数牌）かどうか */
export function isChunchanhai(tile: TileCode): boolean {
  return !isYaochu(tile);
}

/** 数牌かどうか */
export function isSuuhai(tile: TileCode): boolean {
  return !isJihai(tile);
}

/** 緑一色の構成牌か（2s,3s,4s,6s,8s,發） */
export function isGreenTile(tile: TileCode): boolean {
  const n = normalize(tile);
  return [32, 33, 34, 36, 38, 46].includes(n);
}

/** 老頭牌（1,9の数牌のみ）かどうか */
export function isRoutouhai(tile: TileCode): boolean {
  if (isJihai(tile)) return false;
  const num = getNumber(tile);
  return num === 1 || num === 9;
}

/** ドラ表示牌からドラ牌を取得 */
export function getDoraFromIndicator(indicator: TileCode): TileCode {
  const n = normalize(indicator);

  // 数牌: 次の数字（9→1にループ）
  if (isSuuhai(n)) {
    const suit = Math.floor(n / 10) * 10;
    const num = n % 10;
    if (num === 9) return suit + 1;
    return suit + (num + 1);
  }

  // 風牌: 東→南→西→北→東
  if (isKazehai(n)) {
    if (n === WIND_NORTH) return WIND_EAST;
    return n + 1;
  }

  // 三元牌: 白→發→中→白
  if (isSangenpai(n)) {
    if (n === DRAGON_RED) return DRAGON_WHITE;
    return n + 1;
  }

  return n;
}

/** 手牌に含まれるドラの枚数を計算 */
export function countDora(
  handTiles: TileCode[],
  doraIndicators: TileCode[]
): number {
  let count = 0;
  const doraTiles = doraIndicators.map(getDoraFromIndicator);
  for (const tile of handTiles) {
    const n = normalize(tile);
    for (const dora of doraTiles) {
      if (n === dora) {
        count++;
        break;
      }
    }
  }
  // ドラが重複する場合の正確なカウント
  // 上記は1枚のドラ表示牌に対して手牌の各牌を1回しかカウントしないが、
  // 実際には同じドラ表示牌が複数ある場合もある。正しくは各ドラ牌の枚数を掛ける
  count = 0;
  for (const doraTile of doraTiles) {
    for (const tile of handTiles) {
      if (normalize(tile) === doraTile) {
        count++;
      }
    }
  }
  return count;
}

/** 手牌に含まれる赤ドラの枚数を自動カウント */
export function countRedDora(handTiles: TileCode[]): number {
  let count = 0;
  for (const tile of handTiles) {
    if (isRedDora(tile)) count++;
  }
  return count;
}

/** 牌のソート（正規化した値でソート） */
export function sortTiles(tiles: TileCode[]): TileCode[] {
  return [...tiles].sort((a, b) => normalize(a) - normalize(b));
}

/** 牌コードを表示用文字列に変換 */
export function tileToString(tile: TileCode): string {
  if (tile === RED_5M) return '0m';
  if (tile === RED_5P) return '0p';
  if (tile === RED_5S) return '0s';

  const jihai: Record<number, string> = {
    41: '東', 42: '南', 43: '西', 44: '北',
    45: '白', 46: '發', 47: '中',
  };
  if (jihai[tile]) return jihai[tile];

  const num = tile % 10;
  const suit = Math.floor(tile / 10);
  const suitChar = suit === 1 ? 'm' : suit === 2 ? 'p' : 's';
  return `${num}${suitChar}`;
}

/** 表示用文字列を牌コードに変換 */
export function stringToTile(s: string): TileCode {
  const jihaiMap: Record<string, number> = {
    '東': 41, '南': 42, '西': 43, '北': 44,
    '白': 45, '發': 46, '中': 47,
  };
  if (jihaiMap[s]) return jihaiMap[s];

  const num = parseInt(s[0]);
  const suit = s[1];
  if (num === 0) {
    if (suit === 'm') return RED_5M;
    if (suit === 'p') return RED_5P;
    return RED_5S;
  }
  if (suit === 'm') return 10 + num;
  if (suit === 'p') return 20 + num;
  return 30 + num;
}

/** 役牌かどうか（三元牌、場風、自風） */
export function isYakuhai(
  tile: TileCode,
  roundWind: TileCode,
  seatWind: TileCode
): boolean {
  const n = normalize(tile);
  if (isSangenpai(n)) return true;
  if (n === roundWind) return true;
  if (n === seatWind) return true;
  return false;
}

/** 全ての牌コードのリスト */
export function allTileCodes(): TileCode[] {
  const tiles: TileCode[] = [];
  // 萬子
  for (let i = 11; i <= 19; i++) tiles.push(i);
  // 筒子
  for (let i = 21; i <= 29; i++) tiles.push(i);
  // 索子
  for (let i = 31; i <= 39; i++) tiles.push(i);
  // 字牌
  for (let i = 41; i <= 47; i++) tiles.push(i);
  return tiles;
}
