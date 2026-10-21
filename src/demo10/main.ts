import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  millis,
  frameCount,
  createDemoControlPanel,
  createSlider,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateX, rotateZ, autoRotationEnabled, scale } from '../primitives.ts'
import { Terrain } from './terrain.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The terrain currently rendered by the demo, while it exists.
 */
let terrain: Terrain | null = null

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
 * The type of the demo's form, holding the sliders that drive the terrain's
 * shape.
 */
type FormType = {
  sliders?: Record<
    'tileSize' | 'smoothiness' | 'depth',
    ReturnType<typeof createSlider>
  >
}

/**
 * The demo's controls, exposed so that they can be inspected or driven
 * programmatically.
 */
export const demoForm: FormType = {}

/**
 * Creates the demo's control panel and the terrain rendered by it.
 *
 * The panel hosts three sliders: one choosing the size of the terrain's
 * tiles, one choosing how smooth the terrain is, and one choosing how deep
 * its height variations are. Changing any of them rebuilds the terrain.
 *
 * @returns Nothing; the function appends the control panel to the canvas
 *   container and updates the demo's form in place.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    tileSize: createSlider({
      label: 'Tile size',
      min: 3,
      max: 80,
      value: 10,
      container: demoControlPanel,
    }),
    smoothiness: createSlider({
      label: 'Smoothiness',
      min: 1,
      max: 50,
      value: 10,
      color: 'blue',
      container: demoControlPanel,
    }),
    depth: createSlider({
      label: 'Depth (Z-axis)',
      min: 0,
      max: 500,
      value: 160,
      color: 'red',
      container: demoControlPanel,
    }),
  }

  /**
   * Creates a terrain matching the current slider values.
   *
   * @returns Nothing; the function replaces the demo's terrain in place.
   */
  const createTerrain = () => {
    if (!demoForm.sliders) return

    const { tileSize, smoothiness, depth } = demoForm.sliders

    terrain = new Terrain(
      tileSize.getValue(),
      500,
      500,
      depth.getValue(),
      smoothiness.getValue(),
    )
  }

  Object.values(demoForm.sliders).forEach(slider =>
    slider.getInput().addEventListener('input', createTerrain),
  )

  createTerrain()
}

// -------------------------------------------------------------------------------------------------

/**
 * Renders a single frame of the demo.
 *
 * The scene shows a procedural terrain whose shape keeps morphing over time,
 * seen from an automatically rotating coordinate system.
 *
 * @returns Nothing; the function draws to the canvas.
 * @throws {TypeError} When the terrain has not been calculated yet, because
 *   the heights of its tiles are still unknown.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(-PI / 4)

  if (autoRotationEnabled) rotateZ(-millis() / 2000)
  else rotateZ(PI / 6)

  render3dAxes()

  terrain?.calculate(frameCount() / 300)
  terrain?.render()
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
