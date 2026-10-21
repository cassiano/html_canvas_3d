import {
  FPS,
  FPS_LOGGING_FRAME_PERIOD,
  DEFAULT_SPHERE_LINES,
} from '../constants.ts'
import {
  createFrameLoop,
  fps,
  millis,
  frameCount,
  createSlider,
  createDemoControlPanel,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateY,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import {
  sphere,
  rotateX,
  rotateZ,
  autoRotationEnabled,
  scale,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

// Get the canvas container
// Notice: loading this module throws when the canvas container is missing
// from the page.
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The demo's control panel, while it is attached to the canvas container.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * The type of the demo's form, holding the sliders that drive the sphere's
 * tessellation.
 */
type DemoFormType = {
  sliders?: Record<
    'latitudeLines' | 'longitudeLines',
    ReturnType<typeof createSlider>
  >
}

/**
 * The demo's controls, exposed so that they can be inspected or driven
 * programmatically.
 */
export const demoForm: DemoFormType = {}

/**
 * Creates the demo's control panel.
 *
 * The panel hosts two sliders: one choosing how many latitude lines the
 * sphere is drawn with, and one choosing how many longitude lines it is
 * drawn with.
 *
 * @returns Nothing; the function appends the control panel to the canvas
 *   container and updates the demo's form in place.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    latitudeLines: createSlider({
      label: 'Latitude lines',
      min: 1,
      max: 180,
      value: DEFAULT_SPHERE_LINES.latitude,
      container: demoControlPanel,
    }),
    longitudeLines: createSlider({
      label: 'Longitude lines',
      min: 2,
      max: 360,
      value: DEFAULT_SPHERE_LINES.longitude,
      color: 'blue',
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows a sphere whose tessellation is controlled by the demo's
 * sliders, seen from an automatically rotating coordinate system.
 *
 * @returns Nothing; the function draws to the canvas.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) {
    rotateY(-millis() / 2000)
    rotateZ(millis() / 3000)
  }

  render3dAxes()

  if (!demoForm.sliders) return

  const { latitudeLines, longitudeLines } = demoForm.sliders

  sphere(250, {
    color: 'cornflowerblue',
    latitudeLines: latitudeLines.getValue(),
    longitudeLines: longitudeLines.getValue(),
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
const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

/**
 * Starts the demo.
 *
 * The demo's control panel is created and appended to the canvas container,
 * and the animation frame loop begins rendering the scene.
 *
 * @returns Nothing; the function starts the animation frame loop.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * The demo's control panel is removed from the DOM and the animation frame
 * loop ends, so no further frames are drawn.
 *
 * @returns Nothing; the function stops the animation frame loop.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

/**
 * The demo's lifecycle API, consumed by the demo loader.
 */
export { start, stop }
