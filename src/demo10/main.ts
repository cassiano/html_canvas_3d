///////////////////////
// Perlin Noise Demo //
///////////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
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
import { rotateX, rotateZ } from '../primitives.ts'
import { Terrain } from './terrain.ts'

// -------------------------------------------------------------------------------------------------

let terrain: Terrain | null = null

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type Demo10FormType = {
  sliders?: Record<
    'tileSize' | 'smoothiness' | 'depth',
    ReturnType<typeof createSlider>
  >
}

export const demo10Form: Demo10FormType = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo10Form.sliders = {
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

  const createTerrain = () => {
    if (!demo10Form.sliders) return

    const { tileSize, smoothiness, depth } = demo10Form.sliders

    terrain = new Terrain(
      tileSize.getValue(),
      500,
      500,
      depth.getValue(),
      smoothiness.getValue(),
    )
  }

  Object.values(demo10Form.sliders).forEach(slider =>
    slider.getInput().addEventListener('input', createTerrain),
  )

  createTerrain()
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 4)
  rotateZ(-millis() / 2000)

  render3dAxes()

  terrain?.calculate(frameCount() / 300)
  terrain?.render()
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

  stopFrameLoop()
}

export { start, stop }
