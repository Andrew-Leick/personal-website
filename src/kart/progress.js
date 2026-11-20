// Race progress: laps, checkpoint, fact gates, wrong way (SPEC-v5 V5-04, V5-05, V5-09, V5-10). PURE.
import { BOX_RADIUS, gateBoxes, gateFor, lapCount, nearestSample, signedProgressDelta } from './course.js'
import { MAX_SPEED } from './physics.js'

const HISTORY = 256 // ring of recent progress, enough for 1 s at >= 1/240 s steps

/**
 * @param {{ samples: {x:number,z:number,dist:number}[], length: number, checkpoint: number, gateSlots: number[] }} course
 * @param {number} nStops
 */
export function createProgress(course, nStops) {
  const { samples, length, checkpoint, gateSlots } = course
  // Local search covers ~0.5 s of boosted travel, so the crossing never snaps to the other branch.
  const window = Math.ceil((MAX_SPEED * 1.25 * 0.5) / (length / samples.length))
  const times = new Float64Array(HISTORY)
  const dists = new Float64Array(HISTORY)
  const events = []
  let idx, raceDist, cpDone, done, t, head, filled, wrong, minDist

  const tracker = {
    laps: lapCount(nStops),
    lap: 1,
    nextStop: /** @type {number|null} */ (null),
    /** Unwrapped distance driven along the course since the start line. */
    get dist() {
      return raceDist
    },
    reset() {
      idx = 0
      raceDist = 0
      cpDone = false
      done = false
      t = 0
      head = 0
      filled = 0
      wrong = false
      minDist = 0
      tracker.lap = 1
      tracker.nextStop = nStops > 0 ? 0 : null
    },
    /** @returns {Array<{type:'gate',stop:number}|{type:'lap',lap:number}|{type:'finish'}|{type:'wrongway',on:boolean}>} reused array */
    update(kart, dt) {
      events.length = 0
      if (done) return events
      const ni = nearestSample(samples, kart.x, kart.z, idx, window)
      const prev = raceDist
      raceDist += signedProgressDelta(samples[idx].dist, samples[ni].dist, length)
      idx = ni

      // Gates fire once, in order, when their line is crossed forward on their lap.
      while (tracker.nextStop !== null) {
        const { lap, slot } = gateFor(tracker.nextStop)
        const line = (lap - 1) * length + gateSlots[slot]
        if (lap !== tracker.lap || !(prev < line && raceDist >= line)) break
        events.push({ type: 'gate', stop: tracker.nextStop })
        tracker.nextStop = tracker.nextStop + 1 < nStops ? tracker.nextStop + 1 : null
      }

      // A lap counts only after the half-lap checkpoint (no reverse shortcut over the line).
      const base = (tracker.lap - 1) * length
      if (!cpDone && raceDist >= base + checkpoint) cpDone = true
      if (cpDone && raceDist >= base + length) {
        cpDone = false
        if (tracker.lap >= tracker.laps) {
          done = true
          events.push({ type: 'finish' })
        } else {
          tracker.lap++
          events.push({ type: 'lap', lap: tracker.lap })
        }
      }

      // Wrong way: progress fell by > 6% of the lap over the last second; clears once it rises again.
      t += dt
      times[head] = t
      dists[head] = raceDist
      head = (head + 1) % HISTORY
      filled = Math.min(HISTORY, filled + 1)
      if (wrong) {
        minDist = Math.min(minDist, raceDist)
        if (raceDist > minDist + 1) {
          wrong = false
          filled = 0 // judge the next second afresh
          events.push({ type: 'wrongway', on: false })
        }
      } else {
        for (let k = 1; k < filled; k++) {
          const i = (head - 1 - k + HISTORY) % HISTORY
          if (t - times[i] < 1 - 1e-9) continue
          if (raceDist - dists[i] < -0.06 * length) {
            wrong = true
            minDist = raceDist
            events.push({ type: 'wrongway', on: true })
          }
          break
        }
      }
      return events
    },
    /** True if (x, z) is inside a box of that stop's gate row. */
    boxHit(stop, x, z) {
      return gateBoxes(gateFor(stop).slot).some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 <= BOX_RADIUS ** 2)
    },
  }
  tracker.reset()
  return tracker
}
