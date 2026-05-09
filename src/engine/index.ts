// ============================================================
// Mahjong Score Calculator — Engine Entry Point
// ============================================================
import type { HandInput, GameContext, ScoreResult } from './types';
import { validateHand, parseHand } from './handParser';
import { detectYaku } from './yakuDetector';
import { calculateFu } from './fuCalculator';
import { calculateScore } from './scoreCalculator';
import { normalize, countDora, countRedDora } from './tiles';

/**
 * メインの点数計算関数
 *
 * 1. 手牌バリデーション
 * 2. 流し満貫チェック
 * 3. アガリ形の列挙
 * 4. 各アガリ形に対する役判定・符計算・点数計算
 * 5. 最高点数の選択（FR-18）
 */
export function calculate(
  input: HandInput,
  context: GameContext
): ScoreResult {
  // 流し満貫
  if (context.isNagashiMangan) {
    const baseScore = 2000; // 満貫の基本点
    // 流し満貫はツモ扱い
    if (context.isDealer) {
      return {
        yaku: [{ name: '流し満貫', han: 5, yakumanMultiplier: 0 }],
        han: 5, fu: 0, fuDetails: [],
        yakumanMultiplier: 0,
        tsumoScoreChild: Math.ceil(baseScore * 2 / 100) * 100,
      };
    } else {
      return {
        yaku: [{ name: '流し満貫', han: 5, yakumanMultiplier: 0 }],
        han: 5, fu: 0, fuDetails: [],
        yakumanMultiplier: 0,
        tsumoScoreChild: Math.ceil(baseScore / 100) * 100,
        tsumoScoreDealer: Math.ceil(baseScore * 2 / 100) * 100,
      };
    }
  }

  // 排他バリデーション
  const ctxError = validateContext(context);
  if (ctxError) {
    return {
      yaku: [], han: 0, fu: 0, fuDetails: [],
      yakumanMultiplier: 0, error: ctxError,
    };
  }

  // バリデーション
  const error = validateHand(input);
  if (error) {
    return {
      yaku: [], han: 0, fu: 0, fuDetails: [],
      yakumanMultiplier: 0, error,
    };
  }

  // アガリ形の列挙
  const parsedHands = parseHand(input);
  if (parsedHands.length === 0) {
    return {
      yaku: [], han: 0, fu: 0, fuDetails: [],
      yakumanMultiplier: 0,
      error: 'アガリ形ではありません',
    };
  }

  // ドラ計算
  const allTilesForDora = [
    ...input.tiles,
    ...input.calledMelds.flatMap(m => m.tiles),
  ];
  const doraCount = countDora(allTilesForDora, context.doraIndicators);
  const uraDoraCount = (context.isRiichi || context.isDoubleRiichi)
    ? countDora(allTilesForDora, context.uraDoraIndicators)
    : 0;
  // 赤ドラ: 手動指定(redDoraCount>0)がなければ手牌から自動カウント
  const redDoraCount = context.redDoraCount > 0
    ? context.redDoraCount
    : countRedDora(allTilesForDora);

  // 各アガリ形に対して最高点を選択
  let bestResult: ScoreResult | null = null;

  for (const parsed of parsedHands) {
    // 役判定
    const baseYakus = detectYaku(parsed, input, context);

    if (baseYakus.length === 0) continue; // 役なし

    // 役満チェック
    const yakumanMultiplier = baseYakus.reduce((sum, y) => sum + y.yakumanMultiplier, 0);

    // yakusのコピーを作成（ドラ追加で元を汚さない）
    const yakus = [...baseYakus];

    let totalHan: number;
    let fu: number;
    let fuDetails: { name: string; fu: number }[];

    if (yakumanMultiplier > 0) {
      totalHan = 0;
      fu = 0;
      fuDetails = [];
    } else {
      totalHan = yakus.reduce((sum, y) => sum + y.han, 0);

      // ドラ加算
      if (doraCount > 0) {
        yakus.push({ name: `ドラ${doraCount}`, han: doraCount, yakumanMultiplier: 0 });
        totalHan += doraCount;
      }
      if (uraDoraCount > 0) {
        yakus.push({ name: `裏ドラ${uraDoraCount}`, han: uraDoraCount, yakumanMultiplier: 0 });
        totalHan += uraDoraCount;
      }
      if (redDoraCount > 0) {
        yakus.push({ name: `赤ドラ${redDoraCount}`, han: redDoraCount, yakumanMultiplier: 0 });
        totalHan += redDoraCount;
      }

      // 符計算
      const agari = normalize(input.agariTile);
      const fuResult = calculateFu(parsed, context, agari);
      fu = fuResult.fu;
      fuDetails = fuResult.details;
    }

    // 点数計算
    const result = calculateScore(
      totalHan, fu, yakumanMultiplier,
      context.isDealer, context.isTsumo,
      yakus, fuDetails
    );

    // 最高点数の選択
    const score = getEffectiveScore(result);
    if (!bestResult || score > getEffectiveScore(bestResult)) {
      bestResult = result;
    }
  }

  if (!bestResult) {
    return {
      yaku: [], han: 0, fu: 0, fuDetails: [],
      yakumanMultiplier: 0,
      error: '役なし（アガれません）',
    };
  }

  return bestResult;
}

/** 比較用の点数を取得 */
function getEffectiveScore(result: ScoreResult): number {
  if (result.ronScore) return result.ronScore;
  if (result.tsumoScoreChild && result.tsumoScoreDealer) {
    return result.tsumoScoreChild * 2 + result.tsumoScoreDealer;
  }
  if (result.tsumoScoreChild) {
    return result.tsumoScoreChild * 3; // 親ツモ
  }
  return 0;
}

/**
 * 状況役の排他バリデーション（FR-12a）
 * 同時に成立しない状況役の組み合わせをチェック
 */
export function validateContext(context: GameContext): string | null {
  // 嶺上開花と海底摸月は同時に成立しない
  if (context.isRinshan && context.isHaitei) {
    return '嶺上開花と海底摸月は同時に選択できません';
  }
  // 天和とリーチは同時に成立しない
  if (context.isTenhou && (context.isRiichi || context.isDoubleRiichi)) {
    return '天和とリーチは同時に選択できません';
  }
  // 地和とリーチは同時に成立しない
  if (context.isChiihou && (context.isRiichi || context.isDoubleRiichi)) {
    return '地和とリーチは同時に選択できません';
  }
  // 河底撈魚はロン時のみ（ツモ時は不可）
  if (context.isHoutei && context.isTsumo) {
    return '河底撈魚はロン時のみ成立します';
  }
  // 海底摸月はツモ時のみ（ロン時は不可）
  if (context.isHaitei && !context.isTsumo) {
    return '海底摸月はツモ時のみ成立します';
  }
  // 一発はリーチ時のみ有効
  if (context.isIppatsu && !context.isRiichi && !context.isDoubleRiichi) {
    return '一発はリーチ時のみ選択できます';
  }
  return null;
}

export { calculateScore } from './scoreCalculator';
export { calculateFu } from './fuCalculator';
export { detectYaku } from './yakuDetector';
export { parseHand, validateHand } from './handParser';
export * from './types';
export * from './tiles';
