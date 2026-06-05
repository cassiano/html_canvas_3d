/////////////////
// Sphere Demo //
/////////////////

import {
  FPS,
  FPS_LOGGING_FRAME_FREQUENCY,
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
import { sphere, rotateX, rotateZ } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null
let sliders: {
  latitudeLines: ReturnType<typeof createSlider>
  longitudeLines: ReturnType<typeof createSlider>
}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  sliders = {
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

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)
  rotateZ(millis() / 3000)

  render3dAxes()

  sphere(250, {
    color: 'cornflowerblue',
    latitudeLines: sliders.latitudeLines.getValue(),
    longitudeLines: sliders.longitudeLines.getValue(),
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

  stopFrameLoop()
}

export { start, stop }
