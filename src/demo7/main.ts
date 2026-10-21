import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, millis, frameCount } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, HALF_PI } from '../math_utils.ts'
import { autoRotationEnabled, scale } from '../primitives.ts'
import {
  rotateX,
  cone,
  rotateY,
  translate,
  isolateTransformations,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The radius of the cones drawn by the demo, in world units.
 */
const RADIUS = 100
/**
 * The height of the cones drawn by the demo, in world units.
 */
const HEIGHT = 250
/**
 * The opacity of the cones drawn by the demo.
 */
const OPACITY = 1

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows six colored cones, one pointing towards each of the
 * coordinate axes, seen from an automatically rotating coordinate system.
 *
 * @returns Nothing; the function draws to the canvas.
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
    translate(0, HEIGHT / 2, 0)
    rotateX(HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'orange',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, -HEIGHT / 2, 0)
    rotateX(-HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'brown',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(HEIGHT / 2, 0, 0)
    rotateY(-HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'yellow',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(-HEIGHT / 2, 0, 0)
    rotateY(HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'pink',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, HEIGHT / 2)
    rotateX(PI)

    cone(RADIUS, HEIGHT, {
      color: 'lime',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, -HEIGHT / 2)

    cone(RADIUS, HEIGHT, {
      color: 'magenta',
      opacity: OPACITY,
    })
  })
}

/**
 * Displays the pause indicator once the frame loop enters the paused state.
 *
 * @returns Nothing; the function draws the indicator on the canvas.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

/**
 * The demo's animation frame loop.
 *
 * Every frame resets the transformation matrix, draws the scene and flushes
 * the deferred render queue.
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

/**
 * The demo's lifecycle API, consumed by the demo loader.
 *
 * `start()` begins the animation frame loop, so the scene is rendered on
 * every animation frame. `stop()` ends that loop, so no further frames are
 * drawn.
 *
 * @returns Nothing; both functions only control the lifetime of the
 *   animation frame loop.
 */
export { start, stop }
