import { FPS, FPS_LOGGING_FRAME_PERIOD, ORIGIN } from '../constants.ts'
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
  point,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { elbow } from '../elbow_primitives.ts'
import { PI } from '../math_utils.ts'
import { isolateTransformations } from '../primitives.ts'
import { createSlider } from '../utils.ts'

// -------------------------------------------------------------------------------------------------

const RADIUS = 175

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type FormType = {
  sliders?: Record<'spaceInTheMiddle', ReturnType<typeof createSlider>>
  toggles?: Record<'rotateAroundYAxis', ReturnType<typeof createToggle>>
}

export const demoForm: FormType = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    spaceInTheMiddle: createSlider({
      label: 'Space in the middle',
      min: 0,
      max: RADIUS / 2,
      value: RADIUS / 4,
      container: demoControlPanel,
    }),
  }

  demoForm.toggles = {
    rotateAroundYAxis: createToggle({
      label: 'Rotate around Y axis?',
      value: true,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)

  if (demoForm.toggles?.rotateAroundYAxis.getValue()) rotateY(-millis() / 2000)
  else rotateY(-PI / 6)

  render3dAxes()

  const spaceInTheMiddle = demoForm.sliders?.spaceInTheMiddle.getValue() ?? 0

  isolateTransformations(() => {
    translate(-(RADIUS / 2 + spaceInTheMiddle), spaceInTheMiddle, 0)

    elbow.y.x(RADIUS, { opacity: 0.5 })

    translate(0, RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })

    // Highlight the elbow's center.
    point(ORIGIN, { size: 10, color: 'orange' })
  })

  isolateTransformations(() => {
    translate(RADIUS / 2 + spaceInTheMiddle, spaceInTheMiddle, 0)

    elbow.y['-x'](RADIUS, { opacity: 0.5 })

    translate(0, RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })

    // Highlight the elbow's center.
    point(ORIGIN, { size: 10, color: 'orange' })
  })

  isolateTransformations(() => {
    translate(-(RADIUS / 2 + spaceInTheMiddle), -spaceInTheMiddle, 0)

    elbow['-y'].x(RADIUS, { opacity: 0.5 })

    translate(0, -RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })

    // Highlight the elbow's center.
    point(ORIGIN, { size: 10, color: 'orange' })
  })

  isolateTransformations(() => {
    translate(RADIUS / 2 + spaceInTheMiddle, -spaceInTheMiddle, 0)

    elbow['-y']['-x'](RADIUS, { opacity: 0.5 })

    translate(0, -RADIUS / 2, 0)
    cube(RADIUS, { opacity: 0.2 })

    // Highlight the elbow's center.
    point(ORIGIN, { size: 10, color: 'orange' })
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
