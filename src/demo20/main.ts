import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { saturnRing, rotateZ, rotateY } from '../primitives.ts'
import { isolateTransformations } from '../primitives.ts'
import { autoRotationEnabled, sphere, rotateX } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

type SolarSystemBody = {
  radius: number
  color: string
}

const RADIUS_RATIO = 1 / 380

const SATURN_DATA: SolarSystemBody = {
  radius: 58232, // Mean radius in km.
  color: 'orange',
}

const SATURN_RINGS_DATA: Record<string, { width: number; color: string }> = {
  // Width in km.
  a: { width: 14585, color: 'lightPink' },
  b: { width: 25554, color: 'lightGreen' },
  c: { width: 17357, color: 'purple' },
  d: { width: 7594, color: 'black' },
}

// -------------------------------------------------------------------------------------------------

export const renderSaturn = (planet: SolarSystemBody, radiusRatio: number) => {
  const { radius, color } = planet

  isolateTransformations(() => {
    rotateX(PI / 2)

    sphere(radius * radiusRatio, { color })
  })

  // [/doc_img/main.ts/2026-07-23-22-58-31.png]
  let startingRadius = radius * radiusRatio

  isolateTransformations(() => {
    rotateZ(millis() / 1500)

    // D ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.d.width * radiusRatio,
      64,
      {
        color: SATURN_RINGS_DATA.d.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.d.width * radiusRatio

    // C ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.c.width * radiusRatio,
      64,
      {
        color: SATURN_RINGS_DATA.c.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.c.width * radiusRatio

    // B ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.b.width * radiusRatio,
      64,
      {
        color: SATURN_RINGS_DATA.b.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.b.width * radiusRatio

    // A ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.a.width * radiusRatio,
      64,
      {
        color: SATURN_RINGS_DATA.a.color,
        opacity: 0.5,
      },
    )
  })
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  rotateY(PI / 2.2)
  rotateX(-PI / 3.5)

  if (autoRotationEnabled) rotateZ(-millis() / 5000)
  else rotateZ(PI / 6)

  render3dAxes()

  renderSaturn(SATURN_DATA, RADIUS_RATIO)
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
