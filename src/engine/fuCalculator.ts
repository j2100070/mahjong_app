// ============================================================
// Mahjong Score Calculator — Fu Calculator
// ============================================================
import type { ParsedHand, FuDetail, GameContext } from './types';
import {
  normalize, isYaochu, isYakuhai,
  isSangenpai, isKazehai,
} from './tiles';

/**
 * 符を計算する
 */
export function calculateFu(
  hand: ParsedHand,
  context: GameContext,
  _agariTile: number
): { fu: number; details: FuDetail[] } {
  // 七対子: 常に25符固定
  if (hand.isChiitoitsu) {
    return { fu: 25, details: [{ name: '七対子', fu: 25 }] };
  }

  // 国士無双: 符計算なし（役満）
  if (hand.isKokushi) {
    return { fu: 0, details: [] };
  }

  const details: FuDetail[] = [];
  let totalFu = 20; // 基本符（副底）
  details.push({ name: '副底', fu: 20 });

  const isOpen = hand.melds.some(m => m.isOpen);
  const isMenzen = !isOpen;

  // メンゼンロン加符
  if (isMenzen && !context.isTsumo) {
    totalFu += 10;
    details.push({ name: 'メンゼンロン', fu: 10 });
  }

  // ツモ加符（平和ツモは除外 — 後で判定）
  if (context.isTsumo) {
    // 平和ツモの判定: 全順子 + 両面待ち + 役牌でない雀頭 + メンゼン
    const isPinfu = isMenzen &&
      hand.melds.every(m => m.type === 'shuntsu') &&
      hand.waitType === 'ryanmen' &&
      !isYakuhai(hand.pair.tile, context.roundWind, context.seatWind);

    if (!isPinfu) {
      totalFu += 2;
      details.push({ name: 'ツモ', fu: 2 });
    } else {
      // 平和ツモ: 20符固定
      return { fu: 20, details: [{ name: '平和ツモ', fu: 20 }] };
    }
  }

  // メンツ加符
  for (const meld of hand.melds) {
    let meldFu = 0;
    const baseTile = normalize(meld.tiles[0]);
    const yaochu = isYaochu(baseTile);

    if (meld.type === 'koutsu') {
      if (meld.isOpen) {
        meldFu = yaochu ? 4 : 2; // 明刻
      } else {
        meldFu = yaochu ? 8 : 4; // 暗刻
      }
    } else if (meld.type === 'kantsu') {
      if (meld.isOpen) {
        meldFu = yaochu ? 16 : 8; // 明槓
      } else {
        meldFu = yaochu ? 32 : 16; // 暗槓
      }
    }
    // 順子は0符

    if (meldFu > 0) {
      const typeStr = meld.type === 'kantsu'
        ? (meld.isOpen ? '明槓' : '暗槓')
        : (meld.isOpen ? '明刻' : '暗刻');
      const tileStr = yaochu ? '么九牌' : '中張牌';
      details.push({ name: `${typeStr}(${tileStr})`, fu: meldFu });
      totalFu += meldFu;
    }
  }

  // 雀頭加符
  const pairTile = hand.pair.tile;
  if (isSangenpai(pairTile)) {
    totalFu += 2;
    details.push({ name: '役牌雀頭(三元牌)', fu: 2 });
  } else if (isKazehai(pairTile)) {
    // 連風牌（場風かつ自風）の場合は4符
    const isRoundWind = pairTile === context.roundWind;
    const isSeatWind = pairTile === context.seatWind;
    if (isRoundWind && isSeatWind) {
      totalFu += 4;
      details.push({ name: '連風牌雀頭', fu: 4 });
    } else if (isRoundWind) {
      totalFu += 2;
      details.push({ name: '場風雀頭', fu: 2 });
    } else if (isSeatWind) {
      totalFu += 2;
      details.push({ name: '自風雀頭', fu: 2 });
    }
  }

  // 待ち加符
  if (hand.waitType === 'kanchan') {
    totalFu += 2;
    details.push({ name: '嵌張待ち', fu: 2 });
  } else if (hand.waitType === 'penchan') {
    totalFu += 2;
    details.push({ name: '辺張待ち', fu: 2 });
  } else if (hand.waitType === 'tanki') {
    totalFu += 2;
    details.push({ name: '単騎待ち', fu: 2 });
  }

  // 10符単位に切り上げ
  const roundedFu = Math.ceil(totalFu / 10) * 10;
  // ただし副露ロンで30符未満の場合は30符に（喰い平和形=30符）
  const finalFu = Math.max(roundedFu, 30);

  return { fu: finalFu, details };
}
