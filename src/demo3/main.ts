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
import { frameCount, createSlider } from '../utils.ts'
import { FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'

let cube: RubikCube | null = null

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  const cubiesPerAxisSlider = createSlider({
    label: 'Cubies per axis',
    min: 1,
    max: 20,
    value: INITIAL_CUBIES_PER_AXIS,
    container: demoControlPanel,
  })

  const cubieSizeSlider = createSlider({
    label: 'Cubie size',
    min: 5,
    max: 200,
    step: 5,
    value: INITIAL_CUBIE_SIZE,
    container: demoControlPanel,
  })

  const cubieSpacingSlider = createSlider({
    label: 'Cubie spacing',
    min: 0,
    max: 100,
    value: INITIAL_CUBIE_SPACING,
    container: demoControlPanel,
  })

  const createRubikCube = () => {
    cube = new RubikCube(
      cubieSizeSlider.getValue(),
      cubiesPerAxisSlider.getValue(),
      cubieSpacingSlider.getValue(),
    )
  }

  cubiesPerAxisSlider.getInput().addEventListener('input', createRubikCube)
  cubieSizeSlider.getInput().addEventListener('input', createRubikCube)
  cubieSpacingSlider.getInput().addEventListener('input', createRubikCube)

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

  cube?.render()
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
