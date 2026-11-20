// Kart physics on the XZ plane (SPEC-v5 6.4). PURE, fixed step. Units are course units.

/** Tuned so a clean full-throttle lap of Figure-8 takes 28-35 s (physics.test.js). */
export const MAX_SPEED = 34
export const OFFROAD_CAP = 0.4 * MAX_SPEED
export const ACCEL = 0.75 * MAX_SPEED
export const BRAKE = 1.75 * MAX_SPEED
export const REVERSE_MAX = 0.25 * MAX_SPEED
export const COAST_DRAG = 0.33 * MAX_SPEED
export const OFFROAD_DRAG = 1.5 * MAX_SPEED
export const TURN_RATE = 2.0
export const BOOST_TIME = 1.0
export const BUMP_TIME = 0.15
/** Kart collision radius, used by the forward wall ray. */
export const KART_RADIUS = 1.5

/** @param {{ x: number, z: number, heading: number, y?: number }} start */
export function createKart(start) {
  return { x: start.x, y: start.y ?? 0, z: start.z, heading: start.heading, speed: 0, steer: 0, boostT: 0, bumpT: 0 }
}

/** Mushroom-style boost: x1.25 cap and +0.5 x MAX_SPEED now, for BOOST_TIME. */
export function boost(kart) {
  kart.boostT = BOOST_TIME
  kart.speed = Math.max(kart.speed, 0) + 0.5 * MAX_SPEED
}

function bump(kart) {
  kart.speed *= -0.3
  kart.bumpT = BUMP_TIME
}

const approach = (v, target, rate) => (v < target ? Math.min(target, v + rate) : Math.max(target, v - rate))
const bad = (s) => s === 'wall' || s === 'out'

/**
 * Advance one fixed step.
 * `ground` is the ground API ({ at(x, z, y), blocked(x, z, dx, dz, dist) }), checked before moving,
 * or a plain sample ({ y, surface }) for the current position: then a bad surface steps back to the
 * previous position.
 * @param {{ throttle?: number|boolean, brake?: number|boolean, steer?: number }} input
 */
export function step(kart, input, ground, dt) {
  const api = typeof ground.at === 'function'
  const here = api ? ground.at(kart.x, kart.z, kart.y) : ground
  if (!api && bad(here.surface) && kart.px !== undefined) {
    kart.x = kart.px
    kart.z = kart.pz
    if (kart.bumpT <= 0) bump(kart)
  }
  kart.boostT = Math.max(0, kart.boostT - dt)
  kart.bumpT = Math.max(0, kart.bumpT - dt)
  kart.steer = input.steer || 0

  const cap = (here.surface === 'offroad' ? OFFROAD_CAP : MAX_SPEED) * (kart.boostT > 0 ? 1.25 : 1)
  const gas = kart.bumpT > 0 ? 0 : Number(input.throttle || 0)
  const brake = kart.bumpT > 0 ? 0 : Number(input.brake || 0)
  if (kart.speed > cap) {
    // Over the cap (boost ended or entered grass): bleed off, harder on grass.
    kart.speed = Math.max(cap, kart.speed - (here.surface === 'offroad' ? OFFROAD_DRAG : COAST_DRAG) * dt)
  } else if (brake > 0) {
    kart.speed = kart.speed > 0 ? Math.max(0, kart.speed - BRAKE * brake * dt) : Math.max(-REVERSE_MAX, kart.speed - ACCEL * brake * dt)
  } else if (gas > 0) {
    kart.speed = Math.min(cap, kart.speed + ACCEL * gas * dt)
  } else {
    kart.speed = approach(kart.speed, 0, COAST_DRAG * dt)
  }

  // Turning scales in with speed and flips in reverse.
  const grip = Math.min(1, Math.abs(kart.speed) / (0.4 * MAX_SPEED))
  kart.heading += kart.steer * TURN_RATE * grip * Math.sign(kart.speed) * dt

  const dx = Math.cos(kart.heading)
  const dz = Math.sin(kart.heading)
  const move = kart.speed * dt
  if (move === 0) return kart
  const nx = kart.x + dx * move
  const nz = kart.z + dz * move
  if (api) {
    const dir = Math.sign(move)
    const next = ground.blocked(kart.x, kart.z, dx * dir, dz * dir, Math.abs(move) + KART_RADIUS) ? null : ground.at(nx, nz, kart.y)
    if (!next || bad(next.surface)) {
      bump(kart)
      return kart
    }
    kart.x = nx
    kart.z = nz
    kart.y += (next.y - kart.y) * Math.min(1, dt * 15)
  } else {
    kart.px = kart.x
    kart.pz = kart.z
    kart.x = nx
    kart.z = nz
    if (Number.isFinite(here.y)) kart.y += (here.y - kart.y) * Math.min(1, dt * 15)
  }
  return kart
}
