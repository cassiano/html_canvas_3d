import { FPS, ORIGIN, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, millis, frameCount } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  scale,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateX, arrow, rotateY, autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows pairs of arrows pointing towards the center of the cube
 * formed by the coordinate axes, seen from an automatically rotating
 * coordinate system.
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

  arrow($v(-150, -150, -150), $v(-50, -50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, 50), $v(150, 150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, -150), $v(-50, 50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, 50), $v(150, -150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, -150, 150), $v(-50, -50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, -50), $v(150, 150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, 150), $v(-50, 50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, -50), $v(150, -150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, 100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(-100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, -100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, -100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
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
