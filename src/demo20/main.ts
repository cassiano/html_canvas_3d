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
import { PI, HALF_PI } from '../math_utils.ts'
import { saturnRing, rotateZ, rotateY, scale } from '../primitives.ts'
import { isolateTransformations } from '../primitives.ts'
import { autoRotationEnabled, sphere, rotateX } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The physical description of a planet of the solar system.
 */
type SolarSystemBody = {
  /** The mean radius of the planet, in kilometers. */
  radius: number
  /** The fill color used to draw the planet. */
  color: string
}

/**
 * The factor used to convert real-world distances into world units.
 */
const RADIUS_RATIO = 1 / 400

/**
 * The description of Saturn used by the scene.
 */
const SATURN_DATA: SolarSystemBody = {
  radius: 58232, // Mean radius in km.
  color: 'orange',
}

/**
 * The widths and colors of the rings surrounding Saturn.
 *
 * The keys identify the rings, ordered from the outermost one to the
 * innermost one.
 */
const SATURN_RINGS_DATA: Record<string, { width: number; color: string }> = {
  // Width in km.
  a: { width: 14585, color: 'lightPink' },
  cassiniDivision: { width: 4800, color: 'black' },
  b: { width: 25554, color: 'magenta' },
  c: { width: 17357, color: 'lightGreen' },
  d: { width: 7594, color: 'purple' },
}

/**
 * The distance from Saturn's surface to the innermost ring, in kilometers.
 */
const RINGS_DISTANCE_FROM_SATURN_SURFACE = 6632 // In km. The distance from Saturn's surface to the innermost ring (D ring).

// -------------------------------------------------------------------------------------------------

/**
 * Draws a planet and the rings surrounding it.
 *
 * The planet is drawn as a sphere, and the rings as a stack of flat annuli
 * rotating around the planet's axis.
 *
 * @param planet - The description of the planet to draw.
 * @param radiusRatio - The factor used to convert the planet's real-world
 *   distances into world units.
 * @returns Nothing; the shapes are queued for rendering as a side effect.
 */
export const renderSaturn = (planet: SolarSystemBody, radiusRatio: number) => {
  const { radius, color } = planet

  isolateTransformations(() => {
    rotateX(HALF_PI)

    sphere(radius * radiusRatio, { color })
  })

  // [/doc_img/main.ts/2026-07-23-22-58-31.png]
  let startingRadius =
    (radius + RINGS_DISTANCE_FROM_SATURN_SURFACE) * radiusRatio

  isolateTransformations(() => {
    rotateZ(millis() / 1500)

    // D ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.d.width * radiusRatio,
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
      {
        color: SATURN_RINGS_DATA.b.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.b.width * radiusRatio

    // Cassini Division.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.cassiniDivision.width * radiusRatio,
      {
        color: SATURN_RINGS_DATA.cassiniDivision.color,
        opacity: 0.5,
      },
    )

    startingRadius += SATURN_RINGS_DATA.cassiniDivision.width * radiusRatio

    // A ring.
    saturnRing(
      startingRadius,
      startingRadius + SATURN_RINGS_DATA.a.width * radiusRatio,
      {
        color: SATURN_RINGS_DATA.a.color,
        opacity: 0.5,
      },
    )
  })
}

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the solar system scene.
 *
 * Saturn and its rings are drawn against a black background, next to the
 * coordinate axes.
 *
 * @returns Nothing; the shapes are queued for rendering as a side effect.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  scale(1.3)
  rotateY(PI / 2.2)
  rotateX(-PI / 3.5)

  if (autoRotationEnabled) rotateZ(-millis() / 5000)
  else rotateZ(PI / 6)

  render3dAxes()

  renderSaturn(SATURN_DATA, RADIUS_RATIO)
}

/**
 * Draws the label shown while the demo is paused.
 *
 * @returns Nothing; the label is drawn into the canvas as a side effect.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

/**
 * Creates the demo's frame loop and exposes its controls.
 *
 * The destructured `start` function begins the animation frame loop that
 * renders the scene, while `stop` ends it. Both are exported by this module.
 *
 * @returns Nothing; `start` and `stop` control the demo's frame loop.
 */
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
