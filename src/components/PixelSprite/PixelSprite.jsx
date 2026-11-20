import { BASE_URL } from '../../lib/content/paths.js'
import { IMAGE_SIZES, IMAGE_SPRITES, SPRITES } from './sprites.js'

/**
 * One sprite. The three guide Pokémon are 96x96 PNGs served from
 * public/sprites/; the egg, menu cursor and "more" arrow are inline SVG.
 * Always decorative (aria-hidden / empty alt): the accessible name comes from
 * the surrounding link text. Size is set by CSS via the className.
 */
export default function PixelSprite({ name, className }) {
  if (IMAGE_SPRITES.includes(name)) {
    return (
      <img
        className={className}
        src={`${BASE_URL}sprites/${name}.png`}
        width={IMAGE_SIZES[name]}
        height={IMAGE_SIZES[name]}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-sprite={name}
        data-kind="image"
      />
    )
  }
  const sprite = SPRITES[name]
  if (!sprite) return null
  return <SvgSprite name={name} sprite={sprite} className={className} />
}

/** An inline-SVG sprite from its { width, height, paths } (sprites.js toPaths). Decorative. */
export function SvgSprite({ name, sprite, className }) {
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
