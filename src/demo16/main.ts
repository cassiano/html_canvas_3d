import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, millis, frameCount, fps } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  rotateX,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import { scale } from '../primitives.ts'
import {
  isolateTransformations,
  translate,
  autoRotationEnabled,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The number of segments used to approximate the circular cross-sections.
 */
const CIRCLE_SEGMENTS = 16

/**
 * The fill opacity shared by every elbow of the scene.
 */
const OPACITY = 0.5

/**
 * The radius of the elbows, in world units.
 */
const RADIUS = 100

/**
 * The number of slices used to approximate the curved cross-sections.
 */
const CIRCLE_SLICES = 16

/**
 * The options of the blue elbow chains.
 */
const options1: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: 'lightskyblue',
}

/**
 * The options of the red elbow chains.
 */
const options2 = { ...options1, color: 'indianred' }

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the two elbow chains.
 *
 * Two groups of elbows are arranged side by side above the coordinate axes,
 * each one following its own sequence of axis transitions. The first group
 * is blue, and the second one red.
 *
 * @returns Nothing; the elbows are queued for rendering as a side effect.
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
    translate(200, 200, -RADIUS / 2)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z.x(RADIUS, options1, true)
    elbow.x['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z.x(RADIUS, options1, true)
    elbow.x['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)
  })

  isolateTransformations(() => {
    translate(-100, 200, -RADIUS / 2)

    elbow['-y'].z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z']['-y'](RADIUS, options2, true)

    elbow['-y'].x(RADIUS, options2, true)
    elbow.x.z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-y'](RADIUS, options2, true)

    elbow['-y']['-z'](RADIUS, options2, true)
    elbow['-z'].x(RADIUS, options2, true)
    elbow.x.z(RADIUS, options2, true)
    elbow.z['-y'](RADIUS, options2, true)

    elbow['-y']['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z'].x(RADIUS, options2, true)
    elbow.x['-y'](RADIUS, options2, true)

    elbow['-y'].z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z']['-y'](RADIUS, options2, true)
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
