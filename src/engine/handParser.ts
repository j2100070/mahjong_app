// ============================================================
// Mahjong Score Calculator — Hand Parser
// ============================================================
// 手牌を有効なアガリ形（4メンツ+1雀頭、七対子、国士無双）に分解する
import type { TileCode, ParsedHand, Meld, Pair, WaitType, HandInput } from './types';
import { normalize, isJihai, isSuuhai, isYaochu } from './tiles';

/**
 * 手牌を正規化した牌コードの配列に変換（赤ドラ→通常5として扱う）
 * ただし元のtileCodeは保持する
 */
function normalizedCounts(tiles: TileCode[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const t of tiles) {
    const n = normalize(t);
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  return counts;
}

/**
 * 七対子の判定
 */
function parseChiitoitsu(
  tiles: TileCode[],
  agariTile: TileCode
): ParsedHand | null {
  if (tiles.length !== 14) return null;
  const counts = normalizedCounts(tiles);
  // 7種の対子があるか
  if (counts.size !== 7) return null;
  for (const count of counts.values()) {
    if (count !== 2) return null;
  }
  return {
    melds: [],
    pair: { tile: normalize(agariTile) },
    waitType: 'tanki',
    isChiitoitsu: true,
    isKokushi: false,
  };
}

/**
 * 国士無双の判定
 */
function parseKokushi(
  tiles: TileCode[],
  agariTile: TileCode
): ParsedHand | null {
  if (tiles.length !== 14) return null;
  // 国士無双: 13種の么九牌を1枚ずつ＋いずれかの么九牌1枚
  const yaochuTypes = [11, 19, 21, 29, 31, 39, 41, 42, 43, 44, 45, 46, 47];
  const counts = normalizedCounts(tiles);

  for (const y of yaochuTypes) {
    if (!counts.has(y)) return null;
  }

  // 全体が么九牌のみで14枚構成か
  let total = 0;
  for (const [tile, count] of counts) {
    if (!isYaochu(tile)) return null;
    total += count;
  }
  if (total !== 14) return null;

  // 十三面待ちの判定: アガリ前の13枚が全て異なる么九牌（各1枚ずつ）→アガリ牌がどれでもOK=13面
  const agariNorm = normalize(agariTile);
  // 判定: アガリ牌の正規化した値が手牌に2枚あれば通常、なければ13面
  const agariCount = counts.get(agariNorm) || 0;
  void agariCount; // 将来の十三面待ち判定用

  return {
    melds: [],
    pair: { tile: agariNorm },
    waitType: 'tanki',
    isChiitoitsu: false,
    isKokushi: true,
  };
}

/**
 * 国士無双が十三面待ちかどうかを判定する
 */
export function isKokushiThirteenWait(
  tiles: TileCode[],
  agariTile: TileCode
): boolean {
  // 十三面待ち: アガリ牌を除いた13枚が全て異なる么九牌（各1枚ずつ）
  // つまり手牌14枚中、アガリ牌だけが2枚ある（他は全て1枚）
  const counts = normalizedCounts(tiles);
  const agariNorm = normalize(agariTile);
  // 全てのカウントが1（アガリ牌のみ2）で13種類
  if (counts.size !== 13) return false;
  for (const [tile, count] of counts) {
    if (tile === agariNorm) {
      if (count !== 2) return false;
    } else {
      if (count !== 1) return false;
    }
  }
  return true;
}

/**
 * 通常形（4メンツ+1雀頭）のアガリ形を列挙する
 */
function parseNormal(
  closedTiles: TileCode[],
  calledMelds: Meld[],
  agariTile: TileCode
): ParsedHand[] {
  const counts = normalizedCounts(closedTiles);
  const results: ParsedHand[] = [];
  const normalizedAgari = normalize(agariTile);

  // 雀頭候補を列挙
  for (const [pairTile, pairCount] of counts) {
    if (pairCount < 2) continue;

    // 雀頭を除いた残り牌
    const remaining = new Map(counts);
    remaining.set(pairTile, pairCount - 2);
    if (remaining.get(pairTile) === 0) remaining.delete(pairTile);

    // 残り牌からメンツを抽出
    const meldSets = extractMelds(remaining, []);
    for (const melds of meldSets) {
      // 副露メンツと合わせて4メンツか
      if (melds.length + calledMelds.length !== 4) continue;

      // 待ちの種類を判定
      const waitType = determineWaitType(
        melds,
        { tile: pairTile },
        normalizedAgari,
        calledMelds
      );

      results.push({
        melds: [...melds, ...calledMelds],
        pair: { tile: pairTile },
        waitType,
        isChiitoitsu: false,
        isKokushi: false,
      });
    }
  }

  return results;
}

/**
 * 再帰的にメンツを抽出する
 */
function extractMelds(
  remaining: Map<number, number>,
  currentMelds: Meld[]
): Meld[][] {
  // 全て使い切ったら成功
  let totalRemaining = 0;
  for (const c of remaining.values()) totalRemaining += c;
  if (totalRemaining === 0) return [currentMelds];

  // 残りの最小タイルから探索
  const sortedTiles = [...remaining.keys()].sort((a, b) => a - b);
  const firstTile = sortedTiles[0];
  const firstCount = remaining.get(firstTile)!;

  const results: Meld[][] = [];

  // 刻子を試す
  if (firstCount >= 3) {
    const next = new Map(remaining);
    next.set(firstTile, firstCount - 3);
    if (next.get(firstTile) === 0) next.delete(firstTile);
    const koutsu: Meld = {
      type: 'koutsu',
      tiles: [firstTile, firstTile, firstTile],
      isOpen: false,
    };
    results.push(...extractMelds(next, [...currentMelds, koutsu]));
  }

  // 順子を試す（数牌のみ）
  if (isSuuhai(firstTile) && !isJihai(firstTile)) {
    const second = firstTile + 1;
    const third = firstTile + 2;
    // 同じスート内かチェック
    if (
      Math.floor(firstTile / 10) === Math.floor(third / 10) &&
      (remaining.get(second) || 0) >= 1 &&
      (remaining.get(third) || 0) >= 1
    ) {
      const next = new Map(remaining);
      next.set(firstTile, firstCount - 1);
      if (next.get(firstTile) === 0) next.delete(firstTile);
      next.set(second, (next.get(second) || 0) - 1);
      if (next.get(second) === 0) next.delete(second);
      next.set(third, (next.get(third) || 0) - 1);
      if (next.get(third) === 0) next.delete(third);
      const shuntsu: Meld = {
        type: 'shuntsu',
        tiles: [firstTile, second, third],
        isOpen: false,
      };
      results.push(...extractMelds(next, [...currentMelds, shuntsu]));
    }
  }

  return results;
}

/**
 * 待ちの種類を判定する
 */
function determineWaitType(
  closedMelds: Meld[],
  pair: Pair,
  agariTile: number,
  _calledMelds: Meld[]
): WaitType {
  // 単騎待ち: 雀頭がアガリ牌
  if (pair.tile === agariTile) {
    // ただし、シャンポン（双碰）の可能性もチェック
    // 雀頭 + 刻子の片方がアガリ牌 → シャンポン
    for (const meld of closedMelds) {
      if (meld.type === 'koutsu' && meld.tiles[0] === agariTile) {
        // アガリ牌が刻子にも雀頭にもある → 雀頭側が単騎
        // ただしこのパターンは同じ牌が5枚必要なので通常は起きない
      }
    }
    return 'tanki';
  }

  // メンツの中でアガリ牌を含むものを探す
  for (const meld of closedMelds) {
    if (!meld.tiles.includes(agariTile)) continue;

    // 刻子 → シャンポン待ち
    if (meld.type === 'koutsu') {
      return 'shanpon';
    }

    // 順子の場合
    if (meld.type === 'shuntsu') {
      const sorted = [...meld.tiles].sort((a, b) => a - b);
      const pos = sorted.indexOf(agariTile);

      // 嵌張: 真ん中のアガリ
      if (pos === 1) return 'kanchan';

      // 辺張: 端のアガリ
      const num = agariTile % 10;
      if (pos === 0 && (num === 1 || num === 7)) return 'penchan';
      if (pos === 2 && (num === 3 || num === 9)) return 'penchan';

      // 両面
      return 'ryanmen';
    }
  }

  return 'ryanmen';
}

/**
 * 手牌のバリデーション
 */
export function validateHand(input: HandInput): string | null {
  const totalTiles = input.tiles.length;
  const calledTileCount = input.calledMelds.reduce((sum, m) => sum + m.tiles.length, 0);

  // 手牌+副露で14枚（カンは4枚で1メンツ）
  const expectedClosed = 14 - calledTileCount;
  if (totalTiles !== expectedClosed) {
    // カンの場合は枚数が増える
    const kanCount = input.calledMelds.filter(m => m.type === 'kantsu').length;
    void kanCount; // 将来のカンバリデーション用
    // 暗カンは手牌枚数に影響しないケースもあるので柔軟に
  }

  // 同一牌5枚以上チェック
  const allTiles = [...input.tiles, ...input.calledMelds.flatMap(m => m.tiles)];
  const counts = normalizedCounts(allTiles);
  for (const [tile, count] of counts) {
    if (count > 4) {
      return `同一牌は4枚までです（${tile}が${count}枚）`;
    }
  }

  // アガリ牌が手牌に含まれているか
  const agariNorm = normalize(input.agariTile);
  const handNorm = input.tiles.map(normalize);
  if (!handNorm.includes(agariNorm)) {
    return 'アガリ牌が手牌に含まれていません';
  }

  return null;
}

/**
 * メインのパース関数：全てのアガリ形を列挙する
 */
export function parseHand(input: HandInput): ParsedHand[] {
  const results: ParsedHand[] = [];

  // 副露を含めた全牌を計算
  const allClosedTiles = input.tiles;

  // 1. 七対子
  if (input.calledMelds.length === 0) {
    const chiitoi = parseChiitoitsu(allClosedTiles, input.agariTile);
    if (chiitoi) results.push(chiitoi);

    // 2. 国士無双
    const kokushi = parseKokushi(allClosedTiles, input.agariTile);
    if (kokushi) results.push(kokushi);
  }

  // 3. 通常形（4メンツ+1雀頭）
  const normal = parseNormal(allClosedTiles, input.calledMelds, input.agariTile);
  results.push(...normal);

  return results;
}
