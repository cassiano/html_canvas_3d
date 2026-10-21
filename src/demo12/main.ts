import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  frameCount,
  millis,
  createDemoControlPanel,
  createSlider,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  isolateTransformations,
  rotateX,
  ring,
  scale,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { cos, sin, HALF_PI, PI } from '../math_utils.ts'
import { autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The number of rings drawn when the demo starts.
 */
const DEFAULT_TOTAL_RINGS = 25

/**
 * The radius of the outermost ring, in world units.
 */
const LARGEST_RING_RADIUS = 250

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
type DemoFormType = {
  /** The slider controlling how many rings are drawn. */
  sliders?: Record<'totalRings', ReturnType<typeof createSlider>>
}

/**
 * The demo's control widgets.
 *
 * The object is populated when the demo starts, and its widgets are removed
 * from the page when the demo stops.
 */
export const demoForm: DemoFormType = {}

/**
 * Creates the demo's control panel and populates {@link demoForm}.
 *
 * @returns Nothing; the created widgets are stored in {@link demoForm}.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    totalRings: createSlider({
      label: 'Total rings',
      min: 1,
      max: 100,
      value: DEFAULT_TOTAL_RINGS,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the ring sequence.
 *
 * A stack of concentric rings is drawn above the coordinate axes, rotating
 * together, while a pair of rings is highlighted in turn.
 *
 * @returns Nothing; the rings are queued for rendering as a side effect.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  if (!demoForm.sliders) return

  const { totalRings } = demoForm.sliders

  background('lightGray')

  scale(1.3)

  if (autoRotationEnabled) {
    rotateX(sin(millis() / 5000) * 1.5)
    rotateY(-millis() / 2000)
  } else {
    rotateX(PI / 4)
    rotateY(PI / 6)
  }

  render3dAxes()

  const highlightedRing = Math.floor(millis() / 100) % totalRings.getValue()
  let ringIndex = 0

  for (
    let radius = LARGEST_RING_RADIUS;
    radius > 0;
    radius -= 250 / totalRings.getValue()
  ) {
    isolateTransformations(() => {
      rotateY(millis() / 50)
      rotateX(-HALF_PI)

      const hue = millis() / 100
      const saturation = 100
      const lightness =
        ringIndex === highlightedRing ||
        totalRings.getValue() - ringIndex === highlightedRing
          ? 100
          : ((cos(millis() / 5000) + 1) / 2) * 40 + 30

      ring(radius, 140 - radius / 2, {
        isDoubleSided: true,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      })
    })

    ringIndex++
  }
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
