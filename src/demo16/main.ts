import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  millis,
  frameCount,
  fps,
  createDemoControlPanel,
  createToggle,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  rotateX,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import { isolateTransformations, translate } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5
const RADIUS = 100
const CIRCLE_SLICES = 16

const options1: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: 'lightskyblue',
}

const options2 = { ...options1, color: 'indianred' }

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type FormType = {
  toggles?: Record<'rotateAroundYAxis', ReturnType<typeof createToggle>>
}

export const demoForm: FormType = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.toggles = {
    rotateAroundZAxis: createToggle({
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

  if (demoForm.toggles?.rotateAroundZAxis.getValue()) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  isolateTransformations(() => {
    translate(200, 200, -RADIUS / 2)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z.x(RADIUS, options1, true)
    elbow.x['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z.x(RADIUS, options1, true)
    elbow.x['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)

    elbow['-y'].z(RADIUS, options1, true)
    elbow.z['-x'](RADIUS, options1, true)
    elbow['-x']['-z'](RADIUS, options1, true)
    elbow['-z']['-y'](RADIUS, options1, true)
  })

  isolateTransformations(() => {
    translate(-100, 200, -RADIUS / 2)

    elbow['-y'].z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z']['-y'](RADIUS, options2, true)

    elbow['-y'].x(RADIUS, options2, true)
    elbow.x.z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-y'](RADIUS, options2, true)

    elbow['-y']['-z'](RADIUS, options2, true)
    elbow['-z'].x(RADIUS, options2, true)
    elbow.x.z(RADIUS, options2, true)
    elbow.z['-y'](RADIUS, options2, true)

    elbow['-y']['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z'].x(RADIUS, options2, true)
    elbow.x['-y'](RADIUS, options2, true)

    elbow['-y'].z(RADIUS, options2, true)
    elbow.z['-x'](RADIUS, options2, true)
    elbow['-x']['-z'](RADIUS, options2, true)
    elbow['-z']['-y'](RADIUS, options2, true)
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
