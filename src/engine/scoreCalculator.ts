// ============================================================
// Mahjong Score Calculator — Score Calculator
// ============================================================
import type { YakuEntry, ScoreResult } from './types';

/**
 * 翻と符から最終点数を計算する
 */
export function calculateScore(
  han: number,
  fu: number,
  yakumanMultiplier: number,
  isDealer: boolean,
  isTsumo: boolean,
  yaku: YakuEntry[],
  fuDetails: { name: string; fu: number }[]
): ScoreResult {
  const result: ScoreResult = {
    yaku,
    han,
    fu,
    fuDetails,
    yakumanMultiplier,
  };

  // 役満の場合
  if (yakumanMultiplier > 0) {
    const baseYakuman = 8000 * yakumanMultiplier;
    if (isTsumo) {
      if (isDealer) {
        result.tsumoScoreChild = ceil100(baseYakuman * 2);
      } else {
        result.tsumoScoreChild = ceil100(baseYakuman);
        result.tsumoScoreDealer = ceil100(baseYakuman * 2);
      }
    } else {
      if (isDealer) {
        result.ronScore = ceil100(baseYakuman * 6);
      } else {
        result.ronScore = ceil100(baseYakuman * 4);
      }
    }
    return result;
  }

  // 基本点の計算
  let baseScore: number;

  if (han >= 13) {
    // 数え役満
    baseScore = 8000;
  } else if (han >= 11) {
    baseScore = 6000; // 三倍満
  } else if (han >= 8) {
    baseScore = 4000; // 倍満
  } else if (han >= 6) {
    baseScore = 3000; // 跳満
  } else if (han >= 5) {
    baseScore = 2000; // 満貫
  } else {
    // 通常計算: 符 × 2^(翻+2)
    baseScore = fu * Math.pow(2, han + 2);

    // 切り上げ満貫 (4翻30符 / 3翻60符 → 基本点1920)
    if (baseScore >= 2000) {
      baseScore = 2000; // 満貫
    }
    // 切り上げ満貫ルール適用
    if ((han === 4 && fu === 30) || (han === 3 && fu === 60)) {
      baseScore = 2000; // 切り上げ満貫
    }
  }

  // 最終点数の計算
  if (isTsumo) {
    if (isDealer) {
      // 親ツモ: 各子が基本点×2を支払い
      result.tsumoScoreChild = ceil100(baseScore * 2);
    } else {
      // 子ツモ: 子が基本点、親が基本点×2を支払い
      result.tsumoScoreChild = ceil100(baseScore);
      result.tsumoScoreDealer = ceil100(baseScore * 2);
    }
  } else {
    if (isDealer) {
      // 親ロン: 基本点×6
      result.ronScore = ceil100(baseScore * 6);
    } else {
      // 子ロン: 基本点×4
      result.ronScore = ceil100(baseScore * 4);
    }
  }

  return result;
}

/** 100点単位で切り上げ */
function ceil100(score: number): number {
  return Math.ceil(score / 100) * 100;
}
