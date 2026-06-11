/////////////////////
// Rubik Cube Demo //
/////////////////////

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
} from './../primitives.ts'
import { $v } from '../vector_3d.ts'
import { sin } from './../math_utils.ts'
import { RubikCube } from './rubik_cube.ts'
import {
  INITIAL_CUBIE_SIZE,
  INITIAL_CUBIES_PER_AXIS,
  INITIAL_CUBIE_SPACING,
} from './constants.ts'
import { frameCount, createSlider, createToggle } from '../utils.ts'
import { FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'

// -------------------------------------------------------------------------------------------------

let cube: RubikCube | null = null

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

const toggles: {
  rotateCubies?: ReturnType<typeof createToggle>
  renderExternalFacesOnly?: ReturnType<typeof createToggle>
} = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  const sliders = {
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

  toggles.rotateCubies = createToggle({
    label: 'Rotate cubies?',
    value: false,
    showValue: false,
    container: demoControlPanel,
  })

  toggles.renderExternalFacesOnly = createToggle({
    label: 'Render external faces only?',
    value: false,
    showValue: false,
    container: demoControlPanel,
  })

  const createRubikCube = () => {
    const cubieSize = sliders.cubieSize.getValue()
    const cubiesPerAxis = sliders.cubiesPerAxis.getValue()
    const cubieSpacing = sliders.cubieSpacing.getValue()

    cube = new RubikCube(cubieSize, cubiesPerAxis, cubieSpacing)
  }

  Object.values(sliders).forEach(slider =>
    slider.getInput().addEventListener('input', createRubikCube),
  )

  createRubikCube()
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(sin(millis() / 5000) * 1.5)
  rotateY(-millis() / 2000)

  render3dAxes()

  cube?.render({
    rotateCubies: toggles.rotateCubies?.getValue(),
    renderExternalFacesOnly: toggles.renderExternalFacesOnly?.getValue(),
  })
}

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

const start = () => {
  createDemoControls()
  startFrameLoop()
}

const stop = () => {
  demoControlPanel?.remove()

  demoControlPanel = null
  cube = null

  stopFrameLoop()
}

export { start, stop }
