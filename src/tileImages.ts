// ============================================================
// Mahjong Tile Image Mapping
// Maps TileCode (numeric) and tile strings to SVG image imports.
// Tile images from: https://github.com/FluffyStuff/riichi-mahjong-tiles (CC0)
// ============================================================

// --- Static imports for all tile SVGs ---
// 萬子 (Man)
import Man1 from './assets/tiles/Man1.svg'
import Man2 from './assets/tiles/Man2.svg'
import Man3 from './assets/tiles/Man3.svg'
import Man4 from './assets/tiles/Man4.svg'
import Man5 from './assets/tiles/Man5.svg'
import Man6 from './assets/tiles/Man6.svg'
import Man7 from './assets/tiles/Man7.svg'
import Man8 from './assets/tiles/Man8.svg'
import Man9 from './assets/tiles/Man9.svg'
import Man5Dora from './assets/tiles/Man5-Dora.svg'

// 筒子 (Pin)
import Pin1 from './assets/tiles/Pin1.svg'
import Pin2 from './assets/tiles/Pin2.svg'
import Pin3 from './assets/tiles/Pin3.svg'
import Pin4 from './assets/tiles/Pin4.svg'
import Pin5 from './assets/tiles/Pin5.svg'
import Pin6 from './assets/tiles/Pin6.svg'
import Pin7 from './assets/tiles/Pin7.svg'
import Pin8 from './assets/tiles/Pin8.svg'
import Pin9 from './assets/tiles/Pin9.svg'
import Pin5Dora from './assets/tiles/Pin5-Dora.svg'

// 索子 (Sou)
import Sou1 from './assets/tiles/Sou1.svg'
import Sou2 from './assets/tiles/Sou2.svg'
import Sou3 from './assets/tiles/Sou3.svg'
import Sou4 from './assets/tiles/Sou4.svg'
import Sou5 from './assets/tiles/Sou5.svg'
import Sou6 from './assets/tiles/Sou6.svg'
import Sou7 from './assets/tiles/Sou7.svg'
import Sou8 from './assets/tiles/Sou8.svg'
import Sou9 from './assets/tiles/Sou9.svg'
import Sou5Dora from './assets/tiles/Sou5-Dora.svg'

// 字牌 (Jihai)
import Ton from './assets/tiles/Ton.svg'
import Nan from './assets/tiles/Nan.svg'
import Shaa from './assets/tiles/Shaa.svg'
import Pei from './assets/tiles/Pei.svg'
import Haku from './assets/tiles/Haku.svg'
import Hatsu from './assets/tiles/Hatsu.svg'
import Chun from './assets/tiles/Chun.svg'

// 裏面
import Back from './assets/tiles/Back.svg'

// --- TileCode to image URL mapping ---
// TileCode encoding:
//   萬子: 11-19, 筒子: 21-29, 索子: 31-39
//   字牌: 41=東, 42=南, 43=西, 44=北, 45=白, 46=發, 47=中
//   赤ドラ: 10=赤5m, 20=赤5p, 30=赤5s
const TILE_CODE_MAP: Record<number, string> = {
  // 萬子
  11: Man1, 12: Man2, 13: Man3, 14: Man4, 15: Man5,
  16: Man6, 17: Man7, 18: Man8, 19: Man9,
  10: Man5Dora, // 赤5萬

  // 筒子
  21: Pin1, 22: Pin2, 23: Pin3, 24: Pin4, 25: Pin5,
  26: Pin6, 27: Pin7, 28: Pin8, 29: Pin9,
  20: Pin5Dora, // 赤5筒

  // 索子
  31: Sou1, 32: Sou2, 33: Sou3, 34: Sou4, 35: Sou5,
  36: Sou6, 37: Sou7, 38: Sou8, 39: Sou9,
  30: Sou5Dora, // 赤5索

  // 字牌
  41: Ton, 42: Nan, 43: Shaa, 44: Pei,
  45: Haku, 46: Hatsu, 47: Chun,
}

// --- Tile string to image URL mapping ---
// Strings like '1m', '5p', '東', '0m' (red dora)
const TILE_STRING_MAP: Record<string, string> = {
  // 萬子
  '1m': Man1, '2m': Man2, '3m': Man3, '4m': Man4, '5m': Man5,
  '6m': Man6, '7m': Man7, '8m': Man8, '9m': Man9,
  '0m': Man5Dora,

  // 筒子
  '1p': Pin1, '2p': Pin2, '3p': Pin3, '4p': Pin4, '5p': Pin5,
  '6p': Pin6, '7p': Pin7, '8p': Pin8, '9p': Pin9,
  '0p': Pin5Dora,

  // 索子
  '1s': Sou1, '2s': Sou2, '3s': Sou3, '4s': Sou4, '5s': Sou5,
  '6s': Sou6, '7s': Sou7, '8s': Sou8, '9s': Sou9,
  '0s': Sou5Dora,

  // 字牌
  '東': Ton, '南': Nan, '西': Shaa, '北': Pei,
  '白': Haku, '發': Hatsu, '中': Chun,
}

/** TileCode (数値) から画像URLを取得 */
export function getTileImageByCode(tileCode: number): string {
  return TILE_CODE_MAP[tileCode] ?? Back
}

/** 牌文字列 ('1m', '東' etc.) から画像URLを取得 */
export function getTileImageByString(tileStr: string): string {
  return TILE_STRING_MAP[tileStr] ?? Back
}

/** 牌の裏面画像URLを取得 */
export function getTileBackImage(): string {
  return Back
}
