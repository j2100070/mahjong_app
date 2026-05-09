import { useState, useCallback } from 'react'
import { calculate, validateContext } from './engine/index'
import { stringToTile, tileToString } from './engine/tiles'
import type { HandInput, GameContext, Meld, ScoreResult } from './engine/types'
import './App.css'

// ---- Constants ----
const SUITS = [
  { key: 'm', label: '萬子', tiles: ['1m','2m','3m','4m','5m','6m','7m','8m','9m'] },
  { key: 'p', label: '筒子', tiles: ['1p','2p','3p','4p','5p','6p','7p','8p','9p'] },
  { key: 's', label: '索子', tiles: ['1s','2s','3s','4s','5s','6s','7s','8s','9s'] },
  { key: 'z', label: '字牌', tiles: ['東','南','西','北','白','發','中'] },
]
const RED_MAP: Record<string, string> = { '5m': '0m', '5p': '0p', '5s': '0s' }
const WIND_TILES = [
  { code: 41, label: '東' }, { code: 42, label: '南' },
  { code: 43, label: '西' }, { code: 44, label: '北' },
]

function getSuitKey(tileStr: string): string {
  if ('東南西北白發中'.includes(tileStr[0])) return 'z'
  return tileStr[tileStr.length - 1]
}

function defaultContext(): GameContext {
  return {
    isDealer: false, isTsumo: false, isRiichi: false, isDoubleRiichi: false,
    isIppatsu: false, isRinshan: false, isChankan: false, isHaitei: false,
    isHoutei: false, isTenhou: false, isChiihou: false,
    roundWind: 41, seatWind: 42,
    doraIndicators: [], uraDoraIndicators: [], redDoraCount: 0,
    isNagashiMangan: false,
  }
}

function getRankName(result: ScoreResult): string {
  if (result.yakumanMultiplier > 0) {
    const m = result.yakumanMultiplier
    if (m >= 5) return `${m}倍役満`
    if (m === 4) return '四倍役満'
    if (m === 3) return '三倍役満'
    if (m === 2) return 'ダブル役満'
    return '役満'
  }
  const h = result.han
  if (h >= 13) return '数え役満'
  if (h >= 11) return '三倍満'
  if (h >= 8) return '倍満'
  if (h >= 6) return '跳満'
  if (h >= 5) return '満貫'
  if (h === 4 && result.fu >= 30) return '満貫'
  if (h === 3 && result.fu >= 60) return '満貫'
  return `${h}翻${result.fu}符`
}

function getMainScore(result: ScoreResult, ctx: GameContext): number {
  if (ctx.isTsumo) {
    if (ctx.isDealer) return (result.tsumoScoreChild ?? 0) * 3
    return (result.tsumoScoreChild ?? 0) * 2 + (result.tsumoScoreDealer ?? 0)
  }
  return result.ronScore ?? 0
}

// ---- Main App ----
function App() {
  const [activeSuit, setActiveSuit] = useState('m')
  const [selectedTiles, setSelectedTiles] = useState<string[]>([])
  const [agariIndex, setAgariIndex] = useState<number | null>(null)
  const [useRed, setUseRed] = useState(false)
  const [calledMelds, setCalledMelds] = useState<Meld[]>([])
  const [ctx, setCtx] = useState<GameContext>(defaultContext())
  const [doraStrs, setDoraStrs] = useState<string[]>([])
  const [uraDoraStrs, setUraDoraStrs] = useState<string[]>([])
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [showDoraPicker, setShowDoraPicker] = useState<'dora'|'ura'|null>(null)
  const [meldBuilder, setMeldBuilder] = useState<{type: string, tiles: string[]}|null>(null)

  // maxHandTiles not used directly; adjustedMax is the working variable
  // For kantsu, hand tiles count is reduced by 3 (not 4) since kantsu adds 1 extra
  const adjustedMax = 14 - calledMelds.length * 3

  const countTile = useCallback((tileStr: string) => {
    const code = stringToTile(tileStr)
    let count = selectedTiles.filter(t => stringToTile(t) === code).length
    calledMelds.forEach(m => { count += m.tiles.filter(t => t === code).length })
    doraStrs.forEach(d => { if (stringToTile(d) === code) count++ })
    uraDoraStrs.forEach(d => { if (stringToTile(d) === code) count++ })
    return count
  }, [selectedTiles, calledMelds, doraStrs, uraDoraStrs])

  const addTile = (tileStr: string) => {
    const actual = useRed && RED_MAP[tileStr] ? RED_MAP[tileStr] : tileStr
    if (selectedTiles.length >= adjustedMax) return
    if (countTile(actual) >= 4) return
    setSelectedTiles(prev => [...prev, actual])
    setResult(null)
  }

  const removeTile = (index: number) => {
    setSelectedTiles(prev => prev.filter((_, i) => i !== index))
    if (agariIndex === index) setAgariIndex(null)
    else if (agariIndex !== null && agariIndex > index) setAgariIndex(agariIndex - 1)
    setResult(null)
  }

  const toggleAgari = (index: number) => {
    setAgariIndex(prev => prev === index ? null : index)
  }

  const updateCtx = (updates: Partial<GameContext>) => {
    setCtx(prev => ({ ...prev, ...updates }))
    setResult(null)
  }

  const toggleSituationYaku = (key: keyof GameContext) => {
    setCtx(prev => ({ ...prev, [key]: !prev[key] }))
    setResult(null)
  }

  const addDoraTile = (tileStr: string) => {
    if (showDoraPicker === 'dora') setDoraStrs(prev => [...prev, tileStr])
    else setUraDoraStrs(prev => [...prev, tileStr])
    setShowDoraPicker(null)
  }

  const removeDora = (index: number, type: 'dora'|'ura') => {
    if (type === 'dora') setDoraStrs(prev => prev.filter((_,i) => i !== index))
    else setUraDoraStrs(prev => prev.filter((_,i) => i !== index))
  }

  // Meld builder
  const startMeld = (type: string) => setMeldBuilder({ type, tiles: [] })

  const addMeldTile = (tileStr: string) => {
    if (!meldBuilder) return
    const needed = meldBuilder.type === 'kantsu' ? 4 : 3
    if (meldBuilder.tiles.length >= needed) return
    setMeldBuilder(prev => prev ? { ...prev, tiles: [...prev.tiles, tileStr] } : null)
  }

  const confirmMeld = () => {
    if (!meldBuilder) return
    const needed = meldBuilder.type === 'kantsu' ? 4 : 3
    if (meldBuilder.tiles.length !== needed) return
    const codes = meldBuilder.tiles.map(stringToTile)
    const isAnkan = meldBuilder.type === 'kantsu-closed'
    const meldType = meldBuilder.type.startsWith('kantsu') ? 'kantsu' as const
      : meldBuilder.type === 'pon' ? 'koutsu' as const : 'shuntsu' as const
    const meld: Meld = {
      type: meldType,
      tiles: codes,
      isOpen: !isAnkan,
      callType: isAnkan ? 'ankan' : meldType === 'kantsu' ? 'minkan'
        : meldType === 'koutsu' ? 'pon' : 'chi',
    }
    setCalledMelds(prev => [...prev, meld])
    setMeldBuilder(null)
    setResult(null)
  }

  const removeMeld = (index: number) => {
    setCalledMelds(prev => prev.filter((_,i) => i !== index))
    setResult(null)
  }

  // Calculate
  const doCalculate = () => {
    if (agariIndex === null || selectedTiles.length < 2) return
    const tilesCodes = selectedTiles.map(stringToTile)
    const agariTile = tilesCodes[agariIndex]
    const input: HandInput = { tiles: tilesCodes, agariTile, calledMelds }
    const gameCtx: GameContext = {
      ...ctx,
      doraIndicators: doraStrs.map(stringToTile),
      uraDoraIndicators: uraDoraStrs.map(stringToTile),
    }
    const validationErr = validateContext(gameCtx)
    if (validationErr) {
      setResult({ yaku: [], han: 0, fu: 0, fuDetails: [], yakumanMultiplier: 0, error: validationErr })
      return
    }
    setResult(calculate(input, gameCtx))
  }

  const doNagashi = () => {
    const gameCtx: GameContext = { ...ctx, isNagashiMangan: true }
    const dummyInput: HandInput = {
      tiles: [11,12,13,14,15,16,17,18,19,11,12,13,21,21].map(Number),
      agariTile: 21, calledMelds: [],
    }
    setResult(calculate(dummyInput, gameCtx))
  }

  const reset = () => {
    setSelectedTiles([]); setAgariIndex(null); setCalledMelds([])
    setCtx(defaultContext()); setDoraStrs([]); setUraDoraStrs([])
    setResult(null); setMeldBuilder(null)
  }

  const isYakuman = result && !result.error && result.yakumanMultiplier > 0

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <h1><span>🀄</span> 麻雀点数計算</h1>
      </header>

      {/* Step 1: Tile Selection */}
      <section className="step-section" id="tile-selector">
        <div className="step-header">
          <div className="step-number">1</div>
          <div className="step-title">手牌を選択</div>
        </div>
        <div className="suit-tabs">
          {SUITS.map(s => (
            <button key={s.key} className={`suit-tab ${activeSuit === s.key ? 'active' : ''}`}
              data-suit={s.key} onClick={() => setActiveSuit(s.key)}>{s.label}</button>
          ))}
        </div>
        {activeSuit !== 'z' && (
          <div className="red-dora-toggle">
            <label><input type="checkbox" checked={useRed} onChange={e => setUseRed(e.target.checked)} /> 赤ドラ(赤5)</label>
          </div>
        )}
        <div className="tile-grid">
          {SUITS.find(s => s.key === activeSuit)!.tiles.map(t => {
            const remaining = 4 - countTile(t)
            const disabled = remaining <= 0 || selectedTiles.length >= adjustedMax
            return (
              <button key={t} className={`tile-btn ${disabled ? 'disabled' : ''} ${useRed && RED_MAP[t] ? 'red-dora' : ''}`}
                data-suit={getSuitKey(t)} onClick={() => addTile(t)}>
                {t.replace(/[mps]$/, '')}
                {remaining < 4 && <span className="tile-count">{remaining}</span>}
              </button>
            )
          })}
        </div>

        {/* Selected tiles */}
        <div className="selected-tiles-section">
          <div className="selected-label">
            <span>選択済み手牌</span>
            <span>{selectedTiles.length} / {adjustedMax}枚</span>
          </div>
          <div className="selected-tiles-row">
            {selectedTiles.length === 0 && <div className="empty-hint" style={{width:'100%'}}>牌をタップして追加</div>}
            {selectedTiles.map((t, i) => (
              <div key={i} className={`tile-chip ${agariIndex === i ? 'is-agari' : ''} ${t.startsWith('0') ? 'red' : ''}`}
                data-suit={getSuitKey(t)} onClick={() => toggleAgari(i)} onContextMenu={e => { e.preventDefault(); removeTile(i) }}>
                {tileToString(stringToTile(t)).replace(/[mps]$/, s => ({m:'',p:'',s:''}[s] ?? s))}
              </div>
            ))}
          </div>
          {selectedTiles.length > 0 && agariIndex === null && (
            <div className="agari-hint">牌をタップしてアガリ牌を指定 / 長押しで削除</div>
          )}
          {selectedTiles.length > 0 && (
            <button style={{marginTop:8,fontSize:12,color:'var(--text-muted)',textDecoration:'underline'}} onClick={() => { setSelectedTiles([]); setAgariIndex(null) }}>手牌をクリア</button>
          )}
        </div>
      </section>

      {/* Step 2: Meld Input */}
      <section className="step-section" id="meld-input">
        <div className="step-header">
          <div className="step-number">2</div>
          <div className="step-title">副露（鳴き）</div>
        </div>
        <div className="meld-buttons">
          <button className="meld-add-btn" onClick={() => startMeld('chi')}>+ チー</button>
          <button className="meld-add-btn" onClick={() => startMeld('pon')}>+ ポン</button>
          <button className="meld-add-btn" onClick={() => startMeld('kantsu')}>+ 明カン</button>
          <button className="meld-add-btn" onClick={() => startMeld('kantsu-closed')}>+ 暗カン</button>
        </div>

        {meldBuilder && (
          <div className="meld-builder">
            <div className="meld-builder-title">
              {meldBuilder.type === 'chi' ? 'チー' : meldBuilder.type === 'pon' ? 'ポン' : meldBuilder.type === 'kantsu' ? '明カン' : '暗カン'}
              の牌を選択 ({meldBuilder.tiles.length}/{meldBuilder.type.startsWith('kantsu') ? 4 : 3})
            </div>
            <div className="suit-tabs" style={{marginBottom:8}}>
              {SUITS.map(s => (
                <button key={s.key} className={`suit-tab ${activeSuit === s.key ? 'active' : ''}`}
                  data-suit={s.key} onClick={() => setActiveSuit(s.key)}>{s.label}</button>
              ))}
            </div>
            <div className="tile-grid">
              {SUITS.find(s => s.key === activeSuit)!.tiles.map(t => (
                <button key={t} className="tile-btn" data-suit={getSuitKey(t)} onClick={() => addMeldTile(t)}>
                  {t.replace(/[mps]$/, '')}
                </button>
              ))}
            </div>
            <div className="meld-tiles" style={{marginTop:8}}>
              {meldBuilder.tiles.map((t, i) => (
                <div key={i} className="tile-chip" data-suit={getSuitKey(t)}>{t.replace(/[mps]$/, '')}</div>
              ))}
            </div>
            <div className="meld-builder-actions">
              <button className="btn-confirm" onClick={confirmMeld}>確定</button>
              <button className="btn-cancel" onClick={() => setMeldBuilder(null)}>キャンセル</button>
            </div>
          </div>
        )}

        <div className="meld-list">
          {calledMelds.map((m, i) => (
            <div key={i} className="meld-item">
              <span className="meld-type-label">
                {m.type === 'shuntsu' ? 'チー' : m.type === 'koutsu' ? 'ポン' : m.isOpen ? '明カン' : '暗カン'}
              </span>
              <div className="meld-tiles">
                {m.tiles.map((t, j) => (
                  <div key={j} className="tile-chip" data-suit={getSuitKey(tileToString(t))} style={{width:28,height:28,fontSize:11}}>
                    {tileToString(t).replace(/[mps]$/, '')}
                  </div>
                ))}
              </div>
              <button className="meld-remove-btn" onClick={() => removeMeld(i)}>✕</button>
            </div>
          ))}
        </div>
      </section>

      {/* Step 3: Game Context */}
      <section className="step-section" id="game-context">
        <div className="step-header">
          <div className="step-number">3</div>
          <div className="step-title">場の情報</div>
        </div>
        <div className="context-grid">
          {/* Dealer toggle */}
          <div className="context-row">
            <div className="context-label">親 / 子</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${ctx.isDealer ? 'active' : ''}`} onClick={() => updateCtx({ isDealer: true })}>親</button>
              <button className={`toggle-btn ${!ctx.isDealer ? 'active' : ''}`} onClick={() => updateCtx({ isDealer: false })}>子</button>
            </div>
          </div>
          {/* Ron/Tsumo */}
          <div className="context-row">
            <div className="context-label">ロン / ツモ</div>
            <div className="toggle-group">
              <button className={`toggle-btn ${!ctx.isTsumo ? 'active' : ''}`} onClick={() => updateCtx({ isTsumo: false })}>ロン</button>
              <button className={`toggle-btn ${ctx.isTsumo ? 'active' : ''}`} onClick={() => updateCtx({ isTsumo: true })}>ツモ</button>
            </div>
          </div>
          {/* Winds */}
          <div className="context-row">
            <div className="context-label">場風</div>
            <div className="toggle-group">
              {[{c:41,l:'東'},{c:42,l:'南'}].map(w => (
                <button key={w.c} className={`toggle-btn ${ctx.roundWind === w.c ? 'active' : ''}`}
                  onClick={() => updateCtx({ roundWind: w.c })}>{w.l}</button>
              ))}
            </div>
          </div>
          <div className="context-row">
            <div className="context-label">自風</div>
            <div className="toggle-group">
              {WIND_TILES.map(w => (
                <button key={w.code} className={`toggle-btn ${ctx.seatWind === w.code ? 'active' : ''}`}
                  onClick={() => updateCtx({ seatWind: w.code })}>{w.label}</button>
              ))}
            </div>
          </div>
          {/* Situation Yaku */}
          <div className="context-row">
            <div className="context-label">状況役</div>
            <div className="checkbox-grid">
              {([
                ['isRiichi','リーチ'],['isDoubleRiichi','ダブリー'],
                ['isIppatsu','一発'],['isRinshan','嶺上開花'],
                ['isChankan','槍槓'],['isHaitei','海底摸月'],
                ['isHoutei','河底撈魚'],['isTenhou','天和'],
                ['isChiihou','地和'],
              ] as [keyof GameContext, string][]).map(([key, label]) => (
                <label key={key} className={`checkbox-item ${ctx[key] ? 'checked' : ''}`}>
                  <input type="checkbox" checked={!!ctx[key]} onChange={() => toggleSituationYaku(key)} />
                  <span className="check-icon">{ctx[key] ? '✓' : ''}</span>
                  {label}
                </label>
              ))}
            </div>
          </div>
          {/* Dora */}
          <div className="context-row">
            <div className="context-label">ドラ表示牌</div>
            <div className="dora-tiles">
              {doraStrs.map((d, i) => (
                <div key={i} className="tile-chip" data-suit={getSuitKey(d)} style={{width:30,height:30,fontSize:11}}
                  onClick={() => removeDora(i, 'dora')}>
                  {d.replace(/[mps]$/, '')}
                </div>
              ))}
              {doraStrs.length < 5 && <button className="dora-add-btn" onClick={() => setShowDoraPicker('dora')}>+</button>}
            </div>
          </div>
          {/* Ura dora */}
          {(ctx.isRiichi || ctx.isDoubleRiichi) && (
            <div className="context-row">
              <div className="context-label">裏ドラ表示牌</div>
              <div className="dora-tiles">
                {uraDoraStrs.map((d, i) => (
                  <div key={i} className="tile-chip" data-suit={getSuitKey(d)} style={{width:30,height:30,fontSize:11}}
                    onClick={() => removeDora(i, 'ura')}>
                    {d.replace(/[mps]$/, '')}
                  </div>
                ))}
                {uraDoraStrs.length < 5 && <button className="dora-add-btn" onClick={() => setShowDoraPicker('ura')}>+</button>}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Calculate */}
      <section className="calculate-section">
        <button className="calculate-btn" onClick={doCalculate}
          disabled={agariIndex === null || selectedTiles.length < 2}>
          計算する
        </button>
        <button className="nagashi-btn" onClick={doNagashi}>流し満貫</button>
      </section>

      {/* Result */}
      {result && (
        <section className="result-section" id="result">
          {result.error ? (
            <div className="error-card">{result.error}</div>
          ) : (
            <div className="result-card">
              <div className="result-header">
                <div className={`result-rank ${isYakuman ? 'yakuman' : ''}`}>{getRankName(result)}</div>
                <div className={`result-score ${isYakuman ? 'yakuman' : ''}`}>
                  {getMainScore(result, ctx).toLocaleString()}<small>点</small>
                </div>
                {!isYakuman && <div className="result-han-fu">{result.han}翻 {result.fu}符</div>}
              </div>
              {/* Payment */}
              <div className="payment-info">
                {ctx.isTsumo ? (
                  ctx.isDealer ? (
                    <p>子各 <span>{(result.tsumoScoreChild ?? 0).toLocaleString()}</span> 点</p>
                  ) : (
                    <p>子 <span>{(result.tsumoScoreChild ?? 0).toLocaleString()}</span> / 親 <span>{(result.tsumoScoreDealer ?? 0).toLocaleString()}</span></p>
                  )
                ) : (
                  <p>{ctx.isDealer ? '子から' : '放銃者から'} <span>{(result.ronScore ?? 0).toLocaleString()}</span> 点</p>
                )}
              </div>
              {/* Yaku list */}
              <div className="yaku-list">
                <div className="yaku-list-title">成立役</div>
                {result.yaku.map((y, i) => (
                  <div key={i} className="yaku-item">
                    <span className="yaku-name">{y.name}</span>
                    <span className={`yaku-han ${y.yakumanMultiplier > 0 ? 'yakuman' : ''}`}>
                      {y.yakumanMultiplier > 0 ? (y.yakumanMultiplier > 1 ? 'ダブル役満' : '役満') : `${y.han}翻`}
                    </span>
                  </div>
                ))}
              </div>
              {/* Fu details */}
              {result.fuDetails.length > 0 && (
                <div className="fu-details">
                  <div className="fu-details-title">符内訳</div>
                  {result.fuDetails.map((f, i) => (
                    <div key={i} className="fu-item"><span>{f.name}</span><span>{f.fu}符</span></div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button style={{marginTop:16,width:'100%',padding:12,borderRadius:'var(--radius-sm)',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:14,fontWeight:600}} onClick={reset}>
            リセット
          </button>
        </section>
      )}

      {/* Dora picker overlay */}
      {showDoraPicker && (
        <div className="tile-picker-overlay" onClick={() => setShowDoraPicker(null)}>
          <div className="tile-picker-panel" onClick={e => e.stopPropagation()}>
            <div className="tile-picker-header">
              <div className="tile-picker-title">{showDoraPicker === 'dora' ? 'ドラ表示牌' : '裏ドラ表示牌'}を選択</div>
              <button className="tile-picker-close" onClick={() => setShowDoraPicker(null)}>✕</button>
            </div>
            <div className="suit-tabs" style={{marginBottom:10}}>
              {SUITS.map(s => (
                <button key={s.key} className={`suit-tab ${activeSuit === s.key ? 'active' : ''}`}
                  data-suit={s.key} onClick={() => setActiveSuit(s.key)}>{s.label}</button>
              ))}
            </div>
            <div className="tile-grid">
              {SUITS.find(s => s.key === activeSuit)!.tiles.map(t => (
                <button key={t} className="tile-btn" data-suit={getSuitKey(t)} onClick={() => addDoraTile(t)}>
                  {t.replace(/[mps]$/, '')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">麻雀点数計算 v0.1</footer>
    </>
  )
}

export default App
