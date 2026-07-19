import { FPS, ORIGIN, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  millis,
  frameCount,
  createToggle,
  createDemoControlPanel,
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
import { rotateX, arrow, rotateY } from '../primitives.ts'

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

  arrow($v(-150, -150, -150), $v(-50, -50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, 50), $v(150, 150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, -150), $v(-50, 50, -50), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, 50), $v(150, -150, 150), {
    color: 'magenta',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, -150, 150), $v(-50, -50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, 50, -50), $v(150, 150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow($v(-150, 150, 150), $v(-50, 50, 50), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow($v(50, -50, -50), $v(150, -150, -150), {
    color: 'brown',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, 100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })

  arrow(ORIGIN, $v(-100, 0, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, -100, 0), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
  })
  arrow(ORIGIN, $v(0, 0, -100), {
    color: 'black',
    tipHeight: 10,
    tipRadius: 5,
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
