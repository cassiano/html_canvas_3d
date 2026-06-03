/////////////////////
// Rubik Cube Demo //
/////////////////////

import { FPS } from './../constants.ts'
import { createFrameLoop, fps, millis } from './../utils.ts'
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

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')

let demoControlPanel: HTMLDivElement | null = null
let cubiesPerAxisSlider: ReturnType<typeof createSlider> | null = null
let cubieSizeSlider: ReturnType<typeof createSlider> | null = null
let cubieSpacingSlider: ReturnType<typeof createSlider> | null = null
let cube: RubikCube | null = null

const createDemoControls = () => {
  demoControlPanel = document.createElement('div')
  demoControlPanel.style.position = 'absolute'
  demoControlPanel.style.top = '10px'
  demoControlPanel.style.left = '10px'
  demoControlPanel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
  demoControlPanel.style.padding = '10px'
  demoControlPanel.style.borderRadius = '5px'
  demoControlPanel.style.zIndex = '100'

  canvasContainer?.appendChild(demoControlPanel)

  cubiesPerAxisSlider = createSlider({
    label: 'Cubies per axis',
    min: 1,
    max: 20,
    value: INITIAL_CUBIES_PER_AXIS,
    container: demoControlPanel,
  })

  cubieSizeSlider = createSlider({
    label: 'Cubie size',
    min: 1,
    max: 300,
    value: INITIAL_CUBIE_SIZE,
    container: demoControlPanel,
  })

  cubieSpacingSlider = createSlider({
    label: 'Cubie spacing',
    min: 0,
    max: 100,
    value: INITIAL_CUBIE_SPACING,
    container: demoControlPanel,
  })

  cubiesPerAxisSlider.getInput().addEventListener('input', (e: Event) => {
    const newValue = Number((e.target as HTMLInputElement).value)

    cube = new RubikCube(
      cubieSizeSlider!.getValue(),
      newValue,
      cubieSpacingSlider!.getValue(),
    )
  })

  cubieSizeSlider.getInput().addEventListener('input', (e: Event) => {
    const newValue = Number((e.target as HTMLInputElement).value)

    cube = new RubikCube(
      newValue,
      cubiesPerAxisSlider!.getValue(),
      cubieSpacingSlider!.getValue(),
    )
  })

  cubieSpacingSlider.getInput().addEventListener('input', (e: Event) => {
    const newValue = Number((e.target as HTMLInputElement).value)

    cube = new RubikCube(
      cubieSizeSlider!.getValue(),
      cubiesPerAxisSlider!.getValue(),
      newValue,
    )
  })

  cube = new RubikCube(
    cubieSizeSlider.getValue(),
    cubiesPerAxisSlider.getValue(),
    cubieSpacingSlider.getValue(),
  )
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
  cubiesPerAxisSlider = null
  cubieSizeSlider = null
  cubieSpacingSlider = null
  cube = null

  stopFrameLoop()
}

export { start, stop }
