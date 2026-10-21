import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  frameCount,
  fps,
  millis,
  createToggle,
  createDemoControlPanel,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  cube,
  translate,
  rotateX,
  rotateY,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { elbow } from '../elbow_primitives.ts'
import { PI } from '../math_utils.ts'
import {
  isolateTransformations,
  autoRotationEnabled,
  scale,
} from '../primitives.ts'
import { createSlider } from '../utils.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The radius of the cubes and of the elbows above them, in world units.
 */
const RADIUS = 175

// -------------------------------------------------------------------------------------------------

// Get the canvas container
/**
 * The DOM element hosting the demo's canvas and control panel.
 *
 * It is looked up eagerly, so that the demo fails fast with a clear message
 * when the expected element is missing from the page.
 *
 * @throws {Error} When the `canvas-container` element is not present in the
 *   document.
 */
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The panel hosting the demo's control widgets, while the demo is running.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * The demo's control widgets, grouped by the kind of control.
 */
type FormType = {
  /** The slider controlling the distance between the cubes. */
  sliders?: Record<'spacing', ReturnType<typeof createSlider>>
  /**
   * The toggle controlling the rotation around the Y-axis.
   *
   * The demo does not create this widget; the entry is reserved.
   */
  toggles?: Record<'rotateAroundYAxis', ReturnType<typeof createToggle>>
}

/**
 * The demo's control widgets.
 *
 * The object is populated when the demo starts, and its widgets are removed
 * from the page when the demo stops.
 */
export const demoForm: FormType = {}

/**
 * Creates the demo's control panel and populates {@link demoForm}.
 *
 * @returns Nothing; the created widgets are stored in {@link demoForm}.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    spacing: createSlider({
      label: 'Spacing',
      min: 0,
      max: RADIUS / 2,
      value: RADIUS / 4,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the cube showcase.
 *
 * Four cubes, each one sitting on top of an elbow, are arranged around the
 * origin above the coordinate axes. The distance between the cubes follows
 * the value of the spacing slider.
 *
 * @returns Nothing; the shapes are queued for rendering as a side effect.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(-PI / 6)

  render3dAxes()

  const spacing = demoForm.sliders?.spacing.getValue() ?? 0

  isolateTransformations(() => {
    translate(-(RADIUS / 2 + spacing), spacing, 0)

    elbow.y.x(RADIUS, { opacity: 0.5 })

    translate(0, RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })
  })

  isolateTransformations(() => {
    translate(RADIUS / 2 + spacing, spacing, 0)

    elbow.y['-x'](RADIUS, { opacity: 0.5 })

    translate(0, RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })
  })

  isolateTransformations(() => {
    translate(-(RADIUS / 2 + spacing), -spacing, 0)

    elbow['-y'].x(RADIUS, { opacity: 0.5 })

    translate(0, -RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })
  })

  isolateTransformations(() => {
    translate(RADIUS / 2 + spacing, -spacing, 0)

    elbow['-y']['-x'](RADIUS, { opacity: 0.5 })

    translate(0, -RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })
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
 * The destructured `startFrameLoop` function begins the animation frame loop
 * that renders the scene, while `stopFrameLoop` ends it.
 *
 * @returns Nothing; `startFrameLoop` and `stopFrameLoop` control the demo's
 *   frame loop.
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
 * Creates the control panel and begins the animation frame loop.
 *
 * @returns Nothing; the demo runs until {@link stop} is called.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * Removes the control panel from the page and ends the animation frame loop.
 *
 * @returns Nothing; the demo's control panel is removed as a side effect.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
