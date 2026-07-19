import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  frameCount,
  millis,
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
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { ElbowShapeOptions } from '../elbow_primitives.ts'
import { torus, rotateX, isolateTransformations } from '../primitives.ts'
import { PI } from '../math_utils.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 36
const TORUS_CIRCLE_SEGMENTS = 72
const OPACITY = 0.5
const RADIUS = 100
const TUBE_RADIUS = 50
const CIRCLE_SLICES = 32

const commonOptions: ElbowShapeOptions = {
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  circleSegments: CIRCLE_SEGMENTS,
}

const options1: ElbowShapeOptions = {
  ...commonOptions,
  color: 'seagreen',
}

const options2: ElbowShapeOptions = {
  ...commonOptions,
  color: 'tomato',
}

const options3: ElbowShapeOptions = {
  ...commonOptions,
  color: 'steelblue',
}

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
    rotateY(-millis() / 3000)

    torus(
      RADIUS + TUBE_RADIUS * 2,
      TUBE_RADIUS,
      TORUS_CIRCLE_SEGMENTS,
      options1,
    )
  })

  isolateTransformations(() => {
    rotateY(-millis() / 2000)

    torus(RADIUS, TUBE_RADIUS, TORUS_CIRCLE_SEGMENTS, options2)
  })

  isolateTransformations(() => {
    rotateY(-millis() / 1000)

    torus(0, RADIUS / 2, TORUS_CIRCLE_SEGMENTS, options3)
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
