import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  millis,
  frameCount,
  createDemoControlPanel,
  createToggle,
} from '../utils.ts'
import {
  background,
  isolateTransformations,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  text2d,
  translate,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, HALF_PI } from '../math_utils.ts'
import { CubeSphereMover } from './cube_sphere_mover.ts'
import { rotateY, square2d } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const HEIGHT = 5000
const GRAVITY = 0.5
const gravity = $v(0, -GRAVITY, 0)
const mover = new CubeSphereMover(10, 0, 300, 0, 100) // Or: `new CubeSphereMover(10, $v(0, 300, 0), 100)`
const weight = gravity.clone().mult(mover.mass)

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
  else rotateY(PI / 6)

  render3dAxes()

  isolateTransformations(() => {
    translate(0, -HEIGHT, 0)
    rotateX(-HALF_PI)

    square2d(500, { color: 'steelblue', isDoubleSided: true })
  })

  mover.render()

  // Do the physics and animation updates.
  mover.update(HEIGHT)
  mover.checkEdges(HEIGHT)
  mover.applyForce(weight)
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
