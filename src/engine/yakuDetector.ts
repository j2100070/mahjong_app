// ============================================================
// Mahjong Score Calculator — Yaku Detector
// ============================================================
import type { ParsedHand, Meld, GameContext, YakuEntry, HandInput } from './types';
import {
  normalize, isYaochu, isJihai, isChunchanhai,
  isSangenpai, isKazehai, isGreenTile, isRoutouhai,
  getSuit, getNumber, isYakuhai,
  DRAGON_WHITE, DRAGON_GREEN, DRAGON_RED,
} from './tiles';
import { isKokushiThirteenWait } from './handParser';

function isMenzen(hand: ParsedHand): boolean {
  return !hand.melds.some(m => m.isOpen);
}

function shuntsuMelds(hand: ParsedHand): Meld[] {
  return hand.melds.filter(m => m.type === 'shuntsu');
}

function koutsuMelds(hand: ParsedHand): Meld[] {
  return hand.melds.filter(m => m.type === 'koutsu' || m.type === 'kantsu');
}

/** 全牌取得（七対子・国士はinputから） */
function allTiles(hand: ParsedHand, input: HandInput): number[] {
  if (hand.isChiitoitsu || hand.isKokushi) {
    return input.tiles.map(t => normalize(t));
  }
  const tiles: number[] = [];
  for (const m of hand.melds) {
    for (const t of m.tiles) tiles.push(normalize(t));
  }
  tiles.push(hand.pair.tile, hand.pair.tile);
  return tiles;
}

function windName(tile: number): string {
  const names: Record<number, string> = { 41: '東', 42: '南', 43: '西', 44: '北' };
  return names[tile] || '';
}

// ---- 役判定関数 ----

function checkPinfu(hand: ParsedHand, ctx: GameContext): boolean {
  if (!isMenzen(hand) || hand.isChiitoitsu || hand.isKokushi) return false;
  if (!hand.melds.every(m => m.type === 'shuntsu')) return false;
  if (hand.waitType !== 'ryanmen') return false;
  if (isYakuhai(hand.pair.tile, ctx.roundWind, ctx.seatWind)) return false;
  return true;
}

function checkTanyao(hand: ParsedHand, input: HandInput): boolean {
  if (hand.isKokushi) return false;
  return allTiles(hand, input).every(t => isChunchanhai(t));
}

function checkIipeiko(hand: ParsedHand): boolean {
  if (!isMenzen(hand)) return false;
  const s = shuntsuMelds(hand);
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++)
      if (s[i].tiles[0] === s[j].tiles[0]) return true;
  return false;
}

function checkRyanpeiko(hand: ParsedHand): boolean {
  if (!isMenzen(hand)) return false;
  const s = shuntsuMelds(hand);
  if (s.length < 4) return false;
  const sorted = s.map(m => m.tiles[0]).sort((a, b) => a - b);
  return sorted[0] === sorted[1] && sorted[2] === sorted[3];
}

function checkYakuhaiYaku(hand: ParsedHand, ctx: GameContext): YakuEntry[] {
  const yakus: YakuEntry[] = [];
  for (const meld of koutsuMelds(hand)) {
    const tile = normalize(meld.tiles[0]);
    if (tile === DRAGON_WHITE) yakus.push({ name: '役牌:白', han: 1, yakumanMultiplier: 0 });
    if (tile === DRAGON_GREEN) yakus.push({ name: '役牌:發', han: 1, yakumanMultiplier: 0 });
    if (tile === DRAGON_RED) yakus.push({ name: '役牌:中', han: 1, yakumanMultiplier: 0 });
    if (tile === ctx.roundWind && tile === ctx.seatWind) {
      yakus.push({ name: `役牌:${windName(tile)}(場風+自風)`, han: 2, yakumanMultiplier: 0 });
    } else {
      if (tile === ctx.roundWind)
        yakus.push({ name: `役牌:${windName(tile)}(場風)`, han: 1, yakumanMultiplier: 0 });
      if (tile === ctx.seatWind)
        yakus.push({ name: `役牌:${windName(tile)}(自風)`, han: 1, yakumanMultiplier: 0 });
    }
  }
  return yakus;
}

function checkChanta(hand: ParsedHand, input: HandInput): number {
  if (hand.isChiitoitsu || hand.isKokushi) return 0;
  if (!hand.melds.some(m => m.type === 'shuntsu')) return 0;
  for (const meld of hand.melds) {
    if (!meld.tiles.some(t => isYaochu(normalize(t)))) return 0;
  }
  if (!isYaochu(hand.pair.tile)) return 0;
  if (!allTiles(hand, input).some(t => isJihai(t))) return 0;
  return isMenzen(hand) ? 2 : 1;
}

function checkJunchan(hand: ParsedHand, input: HandInput): number {
  if (hand.isChiitoitsu || hand.isKokushi) return 0;
  if (!hand.melds.some(m => m.type === 'shuntsu')) return 0;
  for (const meld of hand.melds) {
    if (!meld.tiles.some(t => isRoutouhai(normalize(t)))) return 0;
  }
  if (!isRoutouhai(hand.pair.tile)) return 0;
  if (allTiles(hand, input).some(t => isJihai(t))) return 0;
  return isMenzen(hand) ? 3 : 2;
}

function checkIttsu(hand: ParsedHand): number {
  if (hand.isChiitoitsu || hand.isKokushi) return 0;
  const suits: Record<string, Set<number>> = { m: new Set(), p: new Set(), s: new Set() };
  for (const m of shuntsuMelds(hand)) {
    const suit = getSuit(m.tiles[0]);
    if (suit !== 'z') suits[suit].add(getNumber(m.tiles[0]));
  }
  for (const s of ['m', 'p', 's'])
    if (suits[s].has(1) && suits[s].has(4) && suits[s].has(7))
      return isMenzen(hand) ? 2 : 1;
  return 0;
}

function checkSanshoku(hand: ParsedHand): number {
  if (hand.isChiitoitsu || hand.isKokushi) return 0;
  const bySuit: Record<string, number[]> = { m: [], p: [], s: [] };
  for (const m of shuntsuMelds(hand)) {
    const suit = getSuit(m.tiles[0]);
    if (suit !== 'z') bySuit[suit].push(getNumber(m.tiles[0]));
  }
  for (const num of bySuit['m'])
    if (bySuit['p'].includes(num) && bySuit['s'].includes(num))
      return isMenzen(hand) ? 2 : 1;
  return 0;
}

function checkSanshokuDoukou(hand: ParsedHand): boolean {
  const bySuit: Record<string, number[]> = { m: [], p: [], s: [] };
  for (const m of koutsuMelds(hand)) {
    const t = normalize(m.tiles[0]); const suit = getSuit(t);
    if (suit !== 'z') bySuit[suit].push(getNumber(t));
  }
  for (const n of bySuit['m'])
    if (bySuit['p'].includes(n) && bySuit['s'].includes(n)) return true;
  return false;
}

function checkToitoi(hand: ParsedHand): boolean {
  if (hand.isChiitoitsu || hand.isKokushi) return false;
  return hand.melds.every(m => m.type === 'koutsu' || m.type === 'kantsu');
}

function checkSanankou(hand: ParsedHand, ctx: GameContext, agari: number): boolean {
  let cnt = 0;
  for (const m of hand.melds)
    if ((m.type === 'koutsu' || m.type === 'kantsu') && !m.isOpen) {
      if (!ctx.isTsumo && hand.waitType === 'shanpon' && normalize(m.tiles[0]) === agari) continue;
      cnt++;
    }
  return cnt >= 3;
}

function checkHonroutou(hand: ParsedHand, input: HandInput): boolean {
  return allTiles(hand, input).every(t => isYaochu(t));
}

function checkShousangen(hand: ParsedHand): boolean {
  return koutsuMelds(hand).filter(m => isSangenpai(normalize(m.tiles[0]))).length === 2
    && isSangenpai(hand.pair.tile);
}

function checkSankantsu(hand: ParsedHand): boolean {
  return hand.melds.filter(m => m.type === 'kantsu').length === 3;
}

function checkHonitsu(hand: ParsedHand, input: HandInput): number {
  const t = allTiles(hand, input);
  const suits = new Set<string>(); let hasJ = false;
  for (const x of t) { if (isJihai(x)) { hasJ = true; continue; } suits.add(getSuit(x)); }
  return suits.size === 1 && hasJ ? (isMenzen(hand) ? 3 : 2) : 0;
}

function checkChinitsu(hand: ParsedHand, input: HandInput): number {
  const t = allTiles(hand, input);
  const suits = new Set<string>();
  for (const x of t) { if (isJihai(x)) return 0; suits.add(getSuit(x)); }
  return suits.size === 1 ? (isMenzen(hand) ? 6 : 5) : 0;
}

// ---- 役満 ----
function checkDaisangen(hand: ParsedHand): boolean {
  return koutsuMelds(hand).filter(m => isSangenpai(normalize(m.tiles[0]))).length === 3;
}

function checkSuuankou(hand: ParsedHand, ctx: GameContext, agari: number): boolean {
  if (!isMenzen(hand) || hand.isChiitoitsu || hand.isKokushi) return false;
  let cnt = 0;
  for (const m of hand.melds)
    if ((m.type === 'koutsu' || m.type === 'kantsu') && !m.isOpen) {
      if (!ctx.isTsumo && hand.waitType === 'shanpon' && normalize(m.tiles[0]) === agari) continue;
      cnt++;
    }
  return cnt === 4;
}

function checkTsuuiisou(hand: ParsedHand, input: HandInput): boolean {
  return allTiles(hand, input).every(t => isJihai(t));
}

function checkShousuushii(hand: ParsedHand): boolean {
  return koutsuMelds(hand).filter(m => isKazehai(normalize(m.tiles[0]))).length === 3
    && isKazehai(hand.pair.tile);
}

function checkDaisuushii(hand: ParsedHand): boolean {
  return koutsuMelds(hand).filter(m => isKazehai(normalize(m.tiles[0]))).length === 4;
}

function checkRyuuiisou(hand: ParsedHand, input: HandInput): boolean {
  return allTiles(hand, input).every(t => isGreenTile(t));
}

function checkChinroutou(hand: ParsedHand, input: HandInput): boolean {
  return allTiles(hand, input).every(t => isRoutouhai(t));
}

function checkChuurenpoutou(hand: ParsedHand, input: HandInput): boolean {
  if (!isMenzen(hand) || hand.isChiitoitsu || hand.isKokushi) return false;
  const t = allTiles(hand, input);
  const suits = new Set(t.map(x => getSuit(x)));
  if (suits.size !== 1 || suits.has('z')) return false;
  const counts: Record<number, number> = {};
  for (const x of t) { const n = getNumber(x); counts[n] = (counts[n] || 0) + 1; }
  if ((counts[1] || 0) < 3 || (counts[9] || 0) < 3) return false;
  for (let i = 2; i <= 8; i++) if ((counts[i] || 0) < 1) return false;
  return true;
}

function checkJunseChuurenpoutou(hand: ParsedHand, input: HandInput): boolean {
  if (!checkChuurenpoutou(hand, input)) return false;
  const t = allTiles(hand, input);
  const counts: Record<number, number> = {};
  for (const x of t) { const n = getNumber(x); counts[n] = (counts[n] || 0) + 1; }
  const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  const agariNum = getNumber(normalize(input.agariTile));
  const expected = [...base]; expected[agariNum - 1] += 1;
  for (let i = 1; i <= 9; i++) if ((counts[i] || 0) !== expected[i - 1]) return false;
  return true;
}

function checkSuukantsu(hand: ParsedHand): boolean {
  return hand.melds.filter(m => m.type === 'kantsu').length === 4;
}

// ---- メイン ----
export function detectYaku(hand: ParsedHand, input: HandInput, ctx: GameContext): YakuEntry[] {
  const yakus: YakuEntry[] = [];
  const agari = normalize(input.agariTile);

  // 役満チェック
  const ym: YakuEntry[] = [];
  if (ctx.isTenhou) ym.push({ name: '天和', han: 13, yakumanMultiplier: 1 });
  if (ctx.isChiihou) ym.push({ name: '地和', han: 13, yakumanMultiplier: 1 });

  if (hand.isKokushi) {
    if (isKokushiThirteenWait(input.tiles, input.agariTile)) {
      ym.push({ name: '国士無双十三面待ち', han: 26, yakumanMultiplier: 2 });
    } else {
      ym.push({ name: '国士無双', han: 13, yakumanMultiplier: 1 });
    }
  }

  if (!hand.isKokushi && !hand.isChiitoitsu) {
    const isSuuankouTanki = checkSuuankou(hand, ctx, agari) && hand.waitType === 'tanki';
    if (isSuuankouTanki) {
      ym.push({ name: '四暗刻単騎', han: 26, yakumanMultiplier: 2 });
    } else if (checkSuuankou(hand, ctx, agari)) {
      ym.push({ name: '四暗刻', han: 13, yakumanMultiplier: 1 });
    }
  }

  if (checkDaisangen(hand)) ym.push({ name: '大三元', han: 13, yakumanMultiplier: 1 });
  if (checkTsuuiisou(hand, input)) ym.push({ name: '字一色', han: 13, yakumanMultiplier: 1 });
  if (checkDaisuushii(hand)) ym.push({ name: '大四喜', han: 26, yakumanMultiplier: 2 });
  else if (checkShousuushii(hand)) ym.push({ name: '小四喜', han: 13, yakumanMultiplier: 1 });
  if (checkRyuuiisou(hand, input)) ym.push({ name: '緑一色', han: 13, yakumanMultiplier: 1 });
  if (checkChinroutou(hand, input)) ym.push({ name: '清老頭', han: 13, yakumanMultiplier: 1 });
  if (checkJunseChuurenpoutou(hand, input)) ym.push({ name: '純正九蓮宝燈', han: 26, yakumanMultiplier: 2 });
  else if (checkChuurenpoutou(hand, input)) ym.push({ name: '九蓮宝燈', han: 13, yakumanMultiplier: 1 });
  if (checkSuukantsu(hand)) ym.push({ name: '四槓子', han: 13, yakumanMultiplier: 1 });

  if (ym.length > 0) return ym;

  // 通常役
  if (ctx.isRiichi) yakus.push({ name: 'リーチ', han: 1, yakumanMultiplier: 0 });
  if (ctx.isDoubleRiichi) {
    const idx = yakus.findIndex(y => y.name === 'リーチ');
    if (idx >= 0) yakus.splice(idx, 1);
    yakus.push({ name: 'ダブルリーチ', han: 2, yakumanMultiplier: 0 });
  }
  if (ctx.isIppatsu) yakus.push({ name: '一発', han: 1, yakumanMultiplier: 0 });
  if (ctx.isTsumo && isMenzen(hand)) yakus.push({ name: 'ツモ', han: 1, yakumanMultiplier: 0 });
  if (ctx.isRinshan) yakus.push({ name: '嶺上開花', han: 1, yakumanMultiplier: 0 });
  if (ctx.isChankan) yakus.push({ name: '槍槓', han: 1, yakumanMultiplier: 0 });
  if (ctx.isHaitei) yakus.push({ name: '海底摸月', han: 1, yakumanMultiplier: 0 });
  if (ctx.isHoutei) yakus.push({ name: '河底撈魚', han: 1, yakumanMultiplier: 0 });

  if (checkPinfu(hand, ctx)) yakus.push({ name: '平和', han: 1, yakumanMultiplier: 0 });
  if (checkTanyao(hand, input)) yakus.push({ name: 'タンヤオ', han: 1, yakumanMultiplier: 0 });
  yakus.push(...checkYakuhaiYaku(hand, ctx));

  if (checkRyanpeiko(hand)) {
    yakus.push({ name: '二盃口', han: 3, yakumanMultiplier: 0 });
  } else if (checkIipeiko(hand)) {
    yakus.push({ name: '一盃口', han: 1, yakumanMultiplier: 0 });
  }

  if (hand.isChiitoitsu) yakus.push({ name: '七対子', han: 2, yakumanMultiplier: 0 });

  const chinitsuH = checkChinitsu(hand, input);
  if (chinitsuH > 0) yakus.push({ name: 'チンイツ', han: chinitsuH, yakumanMultiplier: 0 });
  else {
    const honitsuH = checkHonitsu(hand, input);
    if (honitsuH > 0) yakus.push({ name: 'ホンイツ', han: honitsuH, yakumanMultiplier: 0 });
  }

  const junchanH = checkJunchan(hand, input);
  if (junchanH > 0) yakus.push({ name: 'ジュンチャン', han: junchanH, yakumanMultiplier: 0 });
  else {
    const chantaH = checkChanta(hand, input);
    if (chantaH > 0) yakus.push({ name: 'チャンタ', han: chantaH, yakumanMultiplier: 0 });
  }

  const ittsuH = checkIttsu(hand);
  if (ittsuH > 0) yakus.push({ name: '一気通貫', han: ittsuH, yakumanMultiplier: 0 });
  const sanshokuH = checkSanshoku(hand);
  if (sanshokuH > 0) yakus.push({ name: '三色同順', han: sanshokuH, yakumanMultiplier: 0 });
  if (checkSanshokuDoukou(hand)) yakus.push({ name: '三色同刻', han: 2, yakumanMultiplier: 0 });
  if (checkToitoi(hand)) yakus.push({ name: 'トイトイ', han: 2, yakumanMultiplier: 0 });
  if (checkSanankou(hand, ctx, agari)) yakus.push({ name: '三暗刻', han: 2, yakumanMultiplier: 0 });
  if (checkShousangen(hand)) yakus.push({ name: '小三元', han: 2, yakumanMultiplier: 0 });
  if (checkSankantsu(hand)) yakus.push({ name: '三槓子', han: 2, yakumanMultiplier: 0 });

  if (checkHonroutou(hand, input)) {
    yakus.push({ name: '混老頭', han: 2, yakumanMultiplier: 0 });
    const ci = yakus.findIndex(y => y.name === 'チャンタ');
    if (ci >= 0) yakus.splice(ci, 1);
  }

  return yakus;
}
