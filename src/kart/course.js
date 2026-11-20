// Figure-8 Circuit track data (SPEC-v5 6.2). PURE: no three.js, no DOM.
// Coordinates are the course OBJ's units (XZ plane, Y up). heading 0 faces +X, increasing toward +Z.

/**
 * Centerline control points [x, z] in race order, traced over the road faces of cross_course.obj
 * (top-down raster, each point centered across the road). Starts at the checkered start line and
 * heads -X; the horizontal straight runs under the diagonal bridge (crossing near x -62, z 0).
 */
const CONTROL = [
  [-4.7, 0], [-70, 0], [-130, -0.2], [-197.4, 1.3], [-230.6, 33.7], [-229.5, 75.6],
  [-199.6, 98.8], [-161.4, 95], [-121.1, 60.9], [-66, 2.6], [-10.7, -55.7], [35.4, -104.5],
  [70, -128], [109.3, -128.7], [140.7, -108.8], [150.4, -70.6], [134.8, -30.2], [95.9, -5], [40, 0],
]

/** Approximate road half width at the gates (the asphalt is ~22-30 units wide). */
export const ROAD_HALF_WIDTH = 11
export const GATES_PER_LAP = 4
/** Collision radius of one item box (box half-size ~1.4 at scene's BOX_SCALE 3, plus a little). */
export const BOX_RADIUS = 1.5
/** Start line pose (MKDS checkered strip at x -4.7), facing the race direction. y = road height there. */
export const START = { x: -4.7, y: 48.1, z: 0, heading: Math.PI }

/** Material -> surface, from each lambert### texture. Steep faces are walls regardless (surfaceFor). */
export const SURFACE_BY_MATERIAL = {
  lambert201: 'road', // asphalt, checkered ends
  lambert202: 'offroad', // grass
  lambert203: 'road', // asphalt, checkered ends
  lambert206: 'wall', // chain-link fence
  lambert207: 'wall', // grandstand crowd
  lambert208: 'wall', // sponsor banners
  lambert209: 'road', // asphalt with yellow lines
  lambert212: 'wall', // pipe rail
  lambert215: 'wall', // building / metal
  lambert220: 'decor', // small signal box
  lambert221: 'offroad', // grass shoulder
  lambert224: 'road', // asphalt fading into grass
  lambert226: 'wall', // bridge side grating
  lambert227: 'road', // red/white curb
  lambert231: 'wall', // yellow block pillars
  lambert232: 'wall', // bridge girder
  lambert233: 'wall', // bridge name strip
  lambert238: 'wall', // bridge truss
  lambert241: 'decor', // tree billboards
  lambert244: 'wall', // underpass sides
  lambert247: 'wall', // pit building
  lambert253: 'wall', // banners
  lambert255: 'wall', // outer bumper panels
  lambert256: 'road', // start line strip (its gantry is steep, so a wall)
}

/**
 * @param {string} name  material name
 * @param {number} normalY  face normal Y
 * @returns {'road'|'offroad'|'wall'|'decor'}
 */
export function surfaceFor(name, normalY) {
  const s = SURFACE_BY_MATERIAL[name] ?? 'decor'
  return s !== 'decor' && normalY < 0.5 ? 'wall' : s
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3)
}

/** Closed uniform Catmull-Rom through `points`, resampled every `step` units of arc length. */
export function sampleCourse(points = CONTROL, step = 1) {
  const n = points.length
  const dense = []
  for (let i = 0; i < n; i++) {
    const [a, b, c, d] = [points[(i - 1 + n) % n], points[i], points[(i + 1) % n], points[(i + 2) % n]]
    for (let k = 0; k < 64; k++) {
      const t = k / 64
      dense.push([catmullRom(a[0], b[0], c[0], d[0], t), catmullRom(a[1], b[1], c[1], d[1], t)])
    }
  }
  dense.push(dense[0])
  const cum = [0]
  for (let i = 1; i < dense.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]))
  }
  const length = cum[cum.length - 1]
  const count = Math.round(length / step)
  const samples = []
  let j = 0
  for (let s = 0; s < count; s++) {
    const dist = (s * length) / count
    while (cum[j + 1] < dist) j++
    const f = (dist - cum[j]) / (cum[j + 1] - cum[j] || 1)
    samples.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, z: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f, heading: 0, dist })
  }
  for (let s = 0; s < count; s++) {
    const a = samples[(s - 1 + count) % count]
    const b = samples[(s + 1) % count]
    samples[s].heading = Math.atan2(b.z - a.z, b.x - a.x)
  }
  return { samples, length }
}

const sampled = sampleCourse()

/**
 * Gate slot distances along the course. Chosen on the straighter parts, >= 6 s apart at MAX_SPEED,
 * and > 10% of the lap away from the start line and both passes of the crossing (see course.test.js).
 */
const GATE_FRACTIONS = [0.17, 0.39, 0.62, 0.84]

/** @type {{ samples: {x:number,z:number,heading:number,dist:number}[], length: number, checkpoint: number, gateSlots: number[] }} */
export const COURSE = {
  samples: sampled.samples,
  length: sampled.length,
  checkpoint: sampled.length / 2,
  gateSlots: GATE_FRACTIONS.map((f) => f * sampled.length),
}

export const lapCount = (nStops) => Math.ceil(nStops / GATES_PER_LAP)
export const gateFor = (stopIndex) => ({ lap: Math.floor(stopIndex / GATES_PER_LAP) + 1, slot: stopIndex % GATES_PER_LAP })

/** @param {number} slot */
export function gatePose(slot) {
  const { samples, length, gateSlots } = COURSE
  const s = samples[Math.round((gateSlots[slot] / length) * samples.length) % samples.length]
  return { x: s.x, z: s.z, heading: s.heading, halfWidth: ROAD_HALF_WIDTH }
}

const GATE_BOXES = [0, 1, 2, 3].map((slot) => {
  const { x, z, heading, halfWidth } = gatePose(slot)
  // Five boxes evenly across the road, along the normal (-sin h, cos h).
  return [-1, -0.5, 0, 0.5, 1].map((t) => ({ x: x - Math.sin(heading) * t * halfWidth * 0.75, z: z + Math.cos(heading) * t * halfWidth * 0.75 }))
})

/** The 5 boxes across the road at a slot. Shared arrays: do not mutate. */
export const gateBoxes = (slot) => GATE_BOXES[slot]

/**
 * Nearest sample to (x, z), searching only ±window samples around `hint` (wrapping). The local search
 * keeps progress on its own branch where the figure-8 crosses itself.
 */
export function nearestSample(samples, x, z, hint, window) {
  const n = samples.length
  let best = hint
  let bestD = Infinity
  for (let k = -window; k <= window; k++) {
    const i = (((hint + k) % n) + n) % n
    const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/** nextDist - prevDist, wrapped into (-length/2, length/2]. */
export function signedProgressDelta(prevDist, nextDist, length) {
  let d = (nextDist - prevDist) % length
  if (d > length / 2) d -= length
  else if (d <= -length / 2) d += length
  return d
}
