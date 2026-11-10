import { SPRITES } from './sprites.js'

/**
 * One pixel sprite as inline SVG. Always decorative (aria-hidden): the
 * accessible name comes from the surrounding link text. Size is set by CSS
 * via the className (width/height = grid size x an integer --*-px token).
 */
export default function PixelSprite({ name, className }) {
  const sprite = SPRITES[name]
  if (!sprite) return null
  return (
    <svg
      className={className}
      viewBox={`0 0 ${sprite.width} ${sprite.height}`}
      width={sprite.width}
      height={sprite.height}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      data-sprite={name}
    >
      {sprite.paths.map((path) => (
        <path key={path.fill} d={path.d} style={{ fill: path.fill }} />
      ))}
    </svg>
  )
}
