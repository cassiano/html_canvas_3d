import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { ElbowShapeOptions } from '../elbow_primitives.ts'
import {
  torus,
  rotateX,
  isolateTransformations,
  autoRotationEnabled,
} from '../primitives.ts'
import { PI } from '../math_utils.ts'
import { scale } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The number of segments used to approximate the circular cross-sections.
 */
const CIRCLE_SEGMENTS = 36

/**
 * The number of segments used to approximate each torus.
 */
const TORUS_CIRCLE_SEGMENTS = 72

/**
 * The fill opacity shared by every torus of the scene.
 */
const OPACITY = 0.5

/**
 * The reference radius of the tori, in world units.
 *
 * It is used as the internal radius of the middle torus, and defines the
 * tube radius of the innermost one.
 */
const RADIUS = 100

/**
 * The radius of the tube forming the tori, in world units.
 */
const TUBE_RADIUS = 50

/**
 * The number of slices used to approximate the curved cross-sections.
 */
const CIRCLE_SLICES = 32

/**
 * The shape options shared by every torus of the scene.
 */
const commonOptions: ElbowShapeOptions = {
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  circleSegments: CIRCLE_SEGMENTS,
}

/**
 * The options of the outermost torus.
 */
const options1: ElbowShapeOptions = {
  ...commonOptions,
  color: 'seagreen',
}

/**
 * The options of the middle torus.
 */
const options2: ElbowShapeOptions = {
  ...commonOptions,
  color: 'tomato',
}

/**
 * The options of the innermost torus.
 */
const options3: ElbowShapeOptions = {
  ...commonOptions,
  color: 'steelblue',
}

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the three nested tori.
 *
 * Each torus spins at its own pace and is drawn above the coordinate axes.
 *
 * @returns Nothing; the tori are queued for rendering as a side effect.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  isolateTransformations(() => {
    rotateY(-millis() / 3000)

    torus(
      RADIUS + TUBE_RADIUS * 2,
      TUBE_RADIUS,
      TORUS_CIRCLE_SEGMENTS,
      options1,
    )
  })

  isolateTransformations(() => {
    rotateY(-millis() / 2000)

    torus(RADIUS, TUBE_RADIUS, TORUS_CIRCLE_SEGMENTS, options2)
  })

  isolateTransformations(() => {
    rotateY(-millis() / 1000)

    torus(0, RADIUS / 2, TORUS_CIRCLE_SEGMENTS, options3)
  })
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
