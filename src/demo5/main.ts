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
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type DemoFormType = {
  sliders?: Record<
    'latitudeLines' | 'longitudeLines',
    ReturnType<typeof createSlider>
  >
}

export const demoForm: DemoFormType = {}

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
