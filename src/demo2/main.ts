import { createFrameLoop, fps, millis } from './../utils.ts'
import {
  background,
  box,
  isolateTransformations,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  text2d,
  translate,
} from './../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from './../math_utils.ts'
import { FPS } from './../constants.ts'
import { frameCount } from '../utils.ts'
import { FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows four colored boxes, one of which spins around the
 * vertical axis, seen from an automatically rotating coordinate system.
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

  // Green box.
  isolateTransformations(() => {
    scale(0.5)
    scale(0.5)

    box(100, 40, 250, { color: 'darkGreen' })
  })

  // Blue box.
  isolateTransformations(() => {
    translate(100, -100, 0)
    translate(100, -100, 0)

    box(100, 40, 250, { color: 'darkBlue' })
  })

  // Red box.
  isolateTransformations(() => {
    rotateZ(millis() / 2000)
    translate(0, 150, 0)

    box(100, 40, 250, { color: 'darkRed' })
  })

  // Orange box.
  isolateTransformations(() => {
    translate(250, 0, 0)
    rotateZ(millis() / 2000)

    box(100, 40, 250, { color: 'orange' })
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
