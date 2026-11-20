/**
 * Kart top screen: three.js at DS resolution (SPEC-v5-kart 6.1, contracts W2).
 * 256×192, no AA, nearest-filtered textures, Lambert materials, chase camera.
 */
import {
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PerspectiveCamera,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

const BASE = `${import.meta.env.BASE_URL}kart/models/`
const W = 256
const H = 192

// Hand-tuned against the course (road is ~18 units wide): model units -> course units.
const KART_SCALE = 3.2
const MARIO_POS = [0, 0.1, -0.12] // in kart model units, seat of the kart
const MARIO_SCALE = 1.05
// The kart and Mario models face +Z; heading 0 faces +X, so yaw = PI/2 - heading.
const LEAN_MAX = (8 * Math.PI) / 180
const BOUNCE = 0.25

const FOV = 60
const BOOST_FOV = 6
const CAM_BACK = 9.5
const CAM_UP = 4.2
const LOOK_AHEAD = 4
const LOOK_UP = 2.6
const CAM_LERP = 0.15 // per 1/60 s tick

const BOX_SCALE = 3
const BOX_HOVER = 2.4
const BOX_OPACITY = 0.85
const BURST_STEP = 0.05 // s per step, 6 steps

// Driving pose, bone direction per joint (COLLADA ids: joint3/4 left arm A/B, joint5/6 right arm A/B).
const DRIVE_POSE = {
  joint3: [0.45, -0.05, 0.75],
  joint4: [-0.3, 0.3, 1],
  joint5: [-0.45, -0.05, 0.75],
  joint6: [0.3, 0.3, 1],
}
const HEAD = 'joint2'
const SHADOW_SIZE = [3.8, 5] // course units, kart footprint
const SHADOW_LIFT = 0.08
const HEAD_TURN = 0.3 // rad at full steer

const BLINK_MIN = 3
const BLINK_MAX = 5
const BLINK_LEN = 0.15

/** Per-theme look (V5-15): light = daytime, dark = dusk. */
const THEMES = {
  light: {
    sky: 0x8ec8f8,
    fog: [220, 620],
    hemi: [0xdcefff, 0x6a8a4a, 1.6],
    sun: [0xfff4e0, 1.8],
    boxGlow: 0x282828,
  },
  dark: {
    sky: 0x2b2752,
    fog: [90, 380],
    hemi: [0x6c6aa8, 0x1e1e2c, 1.0],
    sun: [0xffb088, 0.7],
    boxGlow: 0x707070,
  },
}

/** @param {import('three').Texture | null} t */
function pixelate(t) {
  if (!t) return null
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.generateMipmaps = false
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * Replace a loader material with a vertex-lit Lambert one, same name and map.
 * @param {import('three').Material & { map?: import('three').Texture }} m
 * @param {object} [extra] extra MeshLambertMaterial params
 */
function lambert(m, extra) {
  const out = new MeshLambertMaterial({ name: m.name, map: pixelate(m.map ?? null), ...extra })
  m.dispose()
  return out
}

/** Convert every material under root. */
function convert(root, extra) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => lambert(m, extra))
      : lambert(o.material, extra)
  })
}

/**
 * Turn a bone so its +X axis (the bone direction in this rig) points along dir,
 * given in Mario's model frame (+X his left, +Y up, +Z forward). Call before parenting Mario.
 */
function aimBone(bone, dir) {
  const world = bone.getWorldQuaternion(new Quaternion())
  const turn = new Quaternion().setFromUnitVectors(
    new Vector3(1, 0, 0).applyQuaternion(world),
    new Vector3(...dir).normalize(),
  )
  const parent = bone.parent.getWorldQuaternion(new Quaternion())
  bone.quaternion.premultiply(parent.clone().invert().multiply(turn).multiply(parent))
  bone.updateMatrixWorld(true)
}

async function loadObj(manager, dir, name) {
  const mtl = await new MTLLoader(manager).setPath(`${BASE}${dir}/`).loadAsync(`${name}.mtl`)
  mtl.preload()
  return new OBJLoader(manager).setMaterials(mtl).setPath(`${BASE}${dir}/`).loadAsync(`${name}.obj`)
}

/**
 * Create the top screen. Appends a 256×192 canvas to hostEl and loads every model.
 * @param {HTMLElement} hostEl
 * @param {{ theme: 'light'|'dark', reducedMotion: boolean }} opts
 */
export async function createScene(hostEl, { theme, reducedMotion }) {
  // The manager also tracks the textures the MTL/COLLADA loaders start, which their promises don't wait for.
  const manager = new LoadingManager()
  let pending = 0
  let failed = null
  let wake = null
  manager.onProgress = (_, loaded, total) => {
    pending = total - loaded
    if (!pending) wake?.()
  }
  manager.onError = (url) => (failed = url)
  const [course, kartObj, boxObj, mario, face2] = await Promise.all([
    loadObj(manager, 'course', 'cross_course'),
    loadObj(manager, 'kart', 'kart_MR_a'),
    loadObj(manager, 'itembox', 'box'),
    new ColladaLoader(manager).loadAsync(`${BASE}mario/P_MR.dae`),
    new TextureLoader(manager).loadAsync(`${BASE}mario/P_face_2.png`),
  ])
  if (pending) await new Promise((resolve) => (wake = resolve))
  if (failed) throw new Error(`Could not load ${failed}`)

  const renderer = new WebGLRenderer({ antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(1)
  renderer.setSize(W, H, false)
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Race view: Mario on Figure-8 Circuit')
  canvas.style.imageRendering = 'pixelated'
  hostEl.appendChild(canvas)

  const scene = new Scene()
  scene.fog = new Fog(0xffffff, 1, 2)
  const camera = new PerspectiveCamera(FOV, W / H, 0.5, 900)
  const hemi = new HemisphereLight()
  const sun = new DirectionalLight()
  sun.position.set(-0.4, 1, 0.3)
  scene.add(hemi, sun)

  // Course: alpha-tested cutouts (trees, fences), never blended. MTL names kept for ground.js.
  convert(course, { alphaTest: 0.5 })
  // The OBJ ships `vn NaN 0 0` normals: rebuild them (flat, since the geometry is unindexed).
  course.traverse((o) => o.isMesh && o.geometry.computeVertexNormals())
  const courseRoot = course
  scene.add(courseRoot)

  // Kart: the MTL says `d 0`, so build opaque materials from scratch.
  convert(kartObj, { alphaTest: 0.5 })
  const kartGroup = new Group() // position + yaw
  const body = new Group() // lean + bounce
  body.scale.setScalar(KART_SCALE)
  kartGroup.add(body)
  body.add(kartObj)

  // Mario: skinned COLLADA, re-posed once from the T-pose to hands on the wheel.
  const marioRoot = mario.scene
  convert(marioRoot, { alphaTest: 0.5 })
  let faceMat = null
  const bones = {}
  marioRoot.traverse((o) => {
    if (o.isBone) bones[o.name] = o
    if (o.isMesh) {
      for (const m of [o.material].flat()) if (m.name === 'P_face') faceMat = m
    }
  })
  for (const [name, dir] of Object.entries(DRIVE_POSE)) if (bones[name]) aimBone(bones[name], dir)
  const head = bones[HEAD]
  const headRest = head?.quaternion.clone()
  const face1 = faceMat?.map ?? null
  pixelate(face2)
  marioRoot.position.fromArray(MARIO_POS)
  marioRoot.scale.setScalar(MARIO_SCALE)
  body.add(marioRoot)
  // Blob shadow: a dark transparent oval on the ground, not leaning with the body.
  const shadow = new Mesh(
    new CircleGeometry(0.5, 10),
    new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = SHADOW_LIFT
  shadow.scale.set(SHADOW_SIZE[0], SHADOW_SIZE[1], 1)
  kartGroup.add(shadow)
  scene.add(kartGroup)
  const headTurn = new Quaternion()
  const headAxis = new Vector3(1, 0, 0) // Mario's up, in the head's parent (body joint) frame

  // Item boxes: one shared geometry, one material per row (so a row can fade alone).
  /** @type {import('three').Mesh} */
  let boxMesh = null
  boxObj.traverse((o) => {
    if (o.isMesh && !boxMesh) boxMesh = o
  })
  const boxGeo = boxMesh.geometry
  const boxMap = pixelate(boxMesh.material.map)
  boxMesh.material.dispose()
  /** @type {Map<number, { group: Group, mat: MeshLambertMaterial, boxes: Mesh[], burstT: number }>} */
  const rows = new Map()
  const ray = new Raycaster()
  const down = new Vector3(0, -1, 0)
  const probe = new Vector3()
  const groundY = (x, z) => {
    ray.set(probe.set(x, 500, z), down)
    return ray.intersectObject(courseRoot, true)[0]?.point.y ?? 0
  }

  let look = THEMES[theme] ?? THEMES.light
  const setTheme = (name) => {
    look = THEMES[name] ?? THEMES.light
    scene.background = new Color(look.sky)
    scene.fog.color.set(look.sky)
    ;[scene.fog.near, scene.fog.far] = look.fog
    hemi.color.set(look.hemi[0])
    hemi.groundColor.set(look.hemi[1])
    hemi.intensity = look.hemi[2]
    sun.color.set(look.sun[0])
    sun.intensity = look.sun[1]
    for (const r of rows.values()) r.mat.emissive.set(look.boxGlow)
  }
  setTheme(theme)

  // Camera state.
  let camHeading = null
  let fovTarget = FOV
  const target = new Vector3()

  // Blink + clock.
  let time = 0
  let blinkAt = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN)

  return {
    canvas,
    courseRoot,

    setKart({ x, y, z, heading, steer = 0, bumpT = 0 }) {
      kartGroup.position.set(x, y, z)
      kartGroup.rotation.y = Math.PI / 2 - heading
      // Roll into the turn; the model's forward is local +Z.
      body.rotation.z = steer * LEAN_MAX
      // Mario looks into the turn (steer +1 = right = his -X).
      if (head) head.quaternion.copy(headRest).premultiply(headTurn.setFromAxisAngle(headAxis, -steer * HEAD_TURN))
      // 2-frame stepped bounce while bumping.
      body.position.y = bumpT > 0 && Math.floor(bumpT * 30) % 2 === 0 ? BOUNCE : 0
    },

    follow(kart, dt) {
      if (camHeading === null || reducedMotion) camHeading = kart.heading
      else {
        let d = kart.heading - camHeading
        d = Math.atan2(Math.sin(d), Math.cos(d))
        camHeading += d * (1 - Math.pow(1 - CAM_LERP, dt * 60))
      }
      const cx = Math.cos(camHeading)
      const cz = Math.sin(camHeading)
      camera.position.set(kart.x - cx * CAM_BACK, kart.y + CAM_UP, kart.z - cz * CAM_BACK)
      camera.lookAt(target.set(kart.x + cx * LOOK_AHEAD, kart.y + LOOK_UP, kart.z + cz * LOOK_AHEAD))
    },

    setGates(list) {
      for (const r of rows.values()) {
        scene.remove(r.group)
        r.mat.dispose()
      }
      rows.clear()
      for (const { slot, boxes } of list) {
        const mat = new MeshLambertMaterial({
          map: boxMap,
          transparent: true,
          opacity: BOX_OPACITY,
          depthWrite: false,
          emissive: look.boxGlow,
          emissiveMap: boxMap,
        })
        const group = new Group()
        const meshes = boxes.map(({ x, z }, i) => {
          const m = new Mesh(boxGeo, mat)
          m.scale.setScalar(BOX_SCALE)
          m.position.set(x, groundY(x, z) + BOX_HOVER, z)
          m.userData.baseY = m.position.y
          m.userData.phase = i * 0.9
          group.add(m)
          return m
        })
        scene.add(group)
        rows.set(slot, { group, mat, boxes: meshes, burstT: -1 })
      }
    },

    showGate(slot, visible) {
      const r = rows.get(slot)
      if (!r) return
      r.group.visible = visible
      r.burstT = -1
      r.mat.opacity = BOX_OPACITY
      for (const b of r.boxes) b.scale.setScalar(BOX_SCALE)
    },

    burstGate(slot) {
      const r = rows.get(slot)
      if (!r) return
      if (reducedMotion) r.group.visible = false
      else r.burstT = 0
    },

    setBoost(on) {
      fovTarget = on && !reducedMotion ? FOV + BOOST_FOV : FOV
    },

    setTheme,

    update(dt) {
      time += dt
      // Boxes: two-axis spin and a gentle bob.
      for (const r of rows.values()) {
        if (!r.group.visible) continue
        for (const b of r.boxes) {
          b.rotation.x = time * 0.9 + b.userData.phase
          b.rotation.y = time * 1.6 + b.userData.phase
          b.position.y = b.userData.baseY + Math.sin(time * 2.5 + b.userData.phase) * 0.35
        }
        if (r.burstT < 0) continue
        // Burst: scale up and fade in 6 stepped frames, then hide.
        r.burstT += dt
        const step = Math.floor(r.burstT / BURST_STEP)
        if (step >= 6) {
          r.group.visible = false
          r.burstT = -1
          continue
        }
        r.mat.opacity = BOX_OPACITY * (1 - step / 6)
        for (const b of r.boxes) b.scale.setScalar(BOX_SCALE * (1 + step * 0.2))
      }
      // FOV kick eases toward its target.
      if (camera.fov !== fovTarget) {
        const d = fovTarget - camera.fov
        camera.fov = Math.abs(d) < 0.05 ? fovTarget : camera.fov + d * Math.min(1, dt * 10)
        camera.updateProjectionMatrix()
      }
      // Blink: swap to the closed-eye frame for a moment every 3–5 s.
      if (faceMat) {
        if (time >= blinkAt + BLINK_LEN) {
          blinkAt = time + BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN)
        }
        const map = time >= blinkAt ? face2 : face1
        if (faceMat.map !== map) faceMat.map = map
      }
    },

    render() {
      renderer.render(scene, camera)
    },

    dispose() {
      const textures = new Set([face2, boxMap])
      scene.traverse((o) => {
        if (!o.isMesh) return
        if (o.geometry !== boxGeo) o.geometry.dispose()
        for (const m of [o.material].flat()) {
          if (m.map) textures.add(m.map)
          m.dispose()
        }
      })
      boxGeo.dispose()
      for (const t of textures) t?.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
