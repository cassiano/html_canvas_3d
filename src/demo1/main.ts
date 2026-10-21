import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, millis, frameCount } from '../utils.ts'
import {
  background,
  isolateTransformations,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  text2d,
  translate,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, HALF_PI } from '../math_utils.ts'
import { CubeSphereMover } from './cube_sphere_mover.ts'
import { rotateY, square2d, autoRotationEnabled, scale } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The height of the platform the mover bounces on, in world units.
 */
const HEIGHT = 5000
/**
 * The downward acceleration applied to the mover on every frame, in world
 * units per frame squared.
 */
const GRAVITY = 0.5
/**
 * The gravity vector, pointing straight down along the negative Y-axis.
 */
const gravity = $v(0, -GRAVITY, 0)
/**
 * The moving object of the demo: a yellow sphere enclosed in a translucent
 * black cube.
 */
const mover = new CubeSphereMover(10, 0, 300, 0, 100) // Or: `new CubeSphereMover(10, $v(0, 300, 0), 100)`
/**
 * The force pulling the mover down, obtained by scaling the gravity vector by
 * the mover's mass.
 */
const weight = gravity.clone().mult(mover.mass)

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo and advances the mover's physics.
 *
 * The scene shows a sphere enclosed in a translucent cube bouncing on a
 * square platform, seen from an automatically rotating coordinate system.
 *
 * @returns Nothing; the function draws to the canvas and mutates the mover's
 *   position and velocity in place.
 * @throws {Error} When the mover's mass is zero, because the gravitational
 *   force cannot be scaled down to an acceleration.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 2.65)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  isolateTransformations(() => {
    translate(0, -HEIGHT, 0)
    rotateX(-HALF_PI)

    square2d(500, { color: 'steelblue', isDoubleSided: true })
  })

  mover.render()

  // Do the physics and animation updates.
  mover.update(HEIGHT)
  mover.checkEdges(HEIGHT)
  mover.applyForce(weight)
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
