// Ground and wall queries against the course mesh (SPEC-v5 6.3). Uses three's Raycaster; not unit-tested.
import { Raycaster, Vector3 } from 'three'
import { surfaceFor } from './course.js'

const Y_TOP = 500 // above the whole course (max y 108)
const STEP_UP = 3 // cast from this far above the kart: climbs ramps, stays under the bridge deck
const MAX_DROP = 3 // a bigger drop under the kart (off the bridge edge) counts as 'out'
const WALL_H = 1.5 // forward wall ray height above the road (clears curbs)

const nameOf = (hit) => {
  const m = hit.object.material
  return (Array.isArray(m) ? m[hit.face.materialIndex] : m)?.name ?? ''
}

/** @param {import('three').Object3D} courseRoot  scene.courseRoot (unscaled, so face normals are world normals) */
export function createGround(courseRoot) {
  const ray = new Raycaster()
  const origin = new Vector3()
  const dir = new Vector3()
  const DOWN = new Vector3(0, -1, 0)
  const hits = []
  let lastY = null

  /**
   * Ground under (x, z). Pass the kart's `y` to cast from just above it (so the bridge deck doesn't
   * shadow the underpass) and to treat big drops as 'out'; without it, casts from the last ground hit.
   * @returns {{ y: number|null, surface: 'road'|'offroad'|'wall'|'out', normalY: number }}
   */
  function at(x, z, y) {
    const known = Number.isFinite(y)
    const ref = known ? y : lastY
    origin.set(x, ref === null ? Y_TOP : ref + STEP_UP, z)
    ray.set(origin, DOWN)
    hits.length = 0
    ray.intersectObject(courseRoot, true, hits)
    for (const h of hits) {
      const normalY = h.face.normal.y
      const surface = surfaceFor(nameOf(h), normalY)
      if (surface === 'decor') continue
      if (known && h.point.y < y - MAX_DROP) break
      if (surface !== 'wall') lastY = h.point.y
      return { y: h.point.y, surface, normalY }
    }
    return { y: ref, surface: 'out', normalY: 0 }
  }

  /** True if a steep (normalY < 0.5), non-decor face lies within `dist` along (dx, dz). */
  function blocked(x, z, dx, dz, dist) {
    origin.set(x, (lastY ?? 0) + WALL_H, z)
    ray.set(origin, dir.set(dx, 0, dz).normalize())
    ray.far = dist
    hits.length = 0
    ray.intersectObject(courseRoot, true, hits)
    ray.far = Infinity
    for (const h of hits) if (Math.abs(h.face.normal.y) < 0.5 && surfaceFor(nameOf(h), 0) === 'wall') return true
    return false
  }

  return { at, blocked }
}
