// ============================================================
// TileImage — Reusable mahjong tile image component
// ============================================================
import { getTileImageByCode, getTileImageByString } from '../tileImages'
import { tileToString } from '../engine/tiles'

interface TileImageProps {
  /** Tile code (numeric). Provide either tileCode or tileStr. */
  tileCode?: number
  /** Tile string (e.g. '1m', '東'). Provide either tileCode or tileStr. */
  tileStr?: string
  /** Display size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Whether this tile is the agari (winning) tile */
  isAgari?: boolean
  /** Whether this tile is disabled */
  disabled?: boolean
  /** Remaining count badge (shown top-right) */
  remaining?: number
  /** Click handler */
  onClick?: () => void
  /** Context menu handler (for right-click / long press) */
  onContextMenu?: (e: React.MouseEvent) => void
  /** Additional class name */
  className?: string
}

const SIZE_MAP = {
  xs: { width: 28, height: 36 },
  sm: { width: 34, height: 44 },
  md: { width: 42, height: 54 },
  lg: { width: 50, height: 64 },
}

export function TileImage({
  tileCode,
  tileStr,
  size = 'md',
  isAgari = false,
  disabled = false,
  remaining,
  onClick,
  onContextMenu,
  className = '',
}: TileImageProps) {
  // Determine image URL
  let imgUrl: string
  let altText: string

  if (tileCode !== undefined) {
    imgUrl = getTileImageByCode(tileCode)
    altText = tileToString(tileCode)
  } else if (tileStr !== undefined) {
    imgUrl = getTileImageByString(tileStr)
    altText = tileStr
  } else {
    return null
  }

  const dims = SIZE_MAP[size]

  const classNames = [
    'tile-img-wrapper',
    `tile-img-${size}`,
    isAgari ? 'tile-img-agari' : '',
    disabled ? 'tile-img-disabled' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      style={{ width: dims.width, height: dims.height }}
      onClick={disabled ? undefined : onClick}
      onContextMenu={onContextMenu}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      aria-label={altText}
    >
      <img
        src={imgUrl}
        alt={altText}
        className="tile-img"
        draggable={false}
      />
      {isAgari && <span className="tile-img-agari-badge">和</span>}
      {remaining !== undefined && remaining < 4 && (
        <span className="tile-img-count">{remaining}</span>
      )}
    </div>
  )
}
