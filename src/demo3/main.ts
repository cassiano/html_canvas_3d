import { FPS } from './../constants.ts'
import {
  createDemoControlPanel,
  createFrameLoop,
  fps,
  millis,
} from './../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
  scale,
} from './../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, sin } from './../math_utils.ts'
import { RubikCube } from './rubik_cube.ts'
import {
  INITIAL_CUBIE_SIZE,
  INITIAL_CUBIES_PER_AXIS,
  INITIAL_CUBIE_SPACING,
} from './constants.ts'
import { frameCount, createSlider, createToggle } from '../utils.ts'
import { FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { demo3Form, cubieSize, cubiesPerAxis } from './demo3_form.ts'
import { autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The cube rendered by the demo, or `null` while the demo is stopped.
 */
let cube: RubikCube | null = null

// Get the canvas container
/**
 * The element the demo's canvas and control panel are attached to.
 *
 * @throws {Error} With the message `canvasContainer not found` when the page
 *   does not provide the expected container element.
 */
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The demo's control panel, or `null` when the panel has been removed.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * Creates the demo's control panel and the cube it controls.
 *
 * The panel hosts the sliders and the toggles that drive the demo. Moving
 * the "cubies per axis" or the "cubie size" slider rebuilds the cube from
 * scratch with the new values.
 *
 * @returns Nothing; the panel is appended to the canvas container and the
 *   demo's cube is replaced.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo3Form.sliders = {
    cubiesPerAxis: createSlider({
      label: 'Cubies per axis',
      min: 1,
      max: 70,
      value: INITIAL_CUBIES_PER_AXIS,
      container: demoControlPanel,
    }),
    cubieSize: createSlider({
      label: 'Cubie size',
      min: 5,
      max: 200,
      step: 5,
      value: INITIAL_CUBIE_SIZE,
      color: 'blue',
      container: demoControlPanel,
    }),
    cubieSpacing: createSlider({
      label: 'Cubie spacing',
      min: 0,
      max: 100,
      value: INITIAL_CUBIE_SPACING,
      color: 'red',
      container: demoControlPanel,
    }),
  }

  demo3Form.toggles = {
    rotateCubies: createToggle({
      label: 'Rotate cubies?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
    renderExternalFacesOnly: createToggle({
      label: 'Render external faces only?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
  }

  /**
   * Rebuilds the demo's cube using the current slider values.
   *
   * @returns Nothing; the demo's cube is replaced.
   */
  const createRubikCube = () => {
    cube = new RubikCube(cubieSize(), cubiesPerAxis())
  }

  ;[demo3Form.sliders.cubiesPerAxis, demo3Form.sliders.cubieSize].forEach(
    slider => slider.getInput().addEventListener('input', createRubikCube),
  )

  createRubikCube()
}

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the demo.
 *
 * Fills the canvas with the background color, applies the camera rotation
 * (automatic or fixed), draws the coordinate axes and renders the cube.
 *
 * @returns Nothing; the frame's shapes are queued for rendering.
 * @throws {Error} With the message `demo3Form.sliders should contain a value`
 *   when the demo's sliders have not been created yet.
 * @throws {Error} With the message `demo3Form.toggles should contain a value`
 *   when the demo's toggles have not been created yet.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

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

  cube?.render()
}

/**
 * Displays the "PAUSED" indicator over the scene.
 *
 * @returns Nothing; the label is drawn directly onto the canvas.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

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
 * Creates the control panel and the initial cube, then begins the animation
 * frame loop that renders the scene.
 *
 * @returns Nothing; the demo starts running as a side effect.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * Removes the control panel from the page, discards the cube and ends the
 * animation frame loop.
 *
 * @returns Nothing; the demo is torn down as a side effect.
 */
const stop = () => {
  demoControlPanel?.remove()

  demoControlPanel = null
  cube = null

  stopFrameLoop()
}

/**
 * The demo's public API.
 *
 * `start()` launches the demo and its animation frame loop, while `stop()`
 * tears them down.
 */
export { start, stop }
