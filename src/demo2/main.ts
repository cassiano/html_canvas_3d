import { createFrameLoop, fps, millis } from './../utils.ts'
import {
  background,
  box,
  isolateTransformations,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  text2d,
  translate,
} from './../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from './../math_utils.ts'
import { FPS } from './../constants.ts'
import { frameCount } from '../utils.ts'
import { FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  // Green box.
  isolateTransformations(() => {
    scale(0.5)
    scale(0.5)

    box(100, 40, 250, { color: 'darkGreen' })
  })

  // Blue box.
  isolateTransformations(() => {
    translate(100, -100, 0)
    translate(100, -100, 0)

    box(100, 40, 250, { color: 'darkBlue' })
  })

  // Red box.
  isolateTransformations(() => {
    rotateZ(millis() / 2000)
    translate(0, 150, 0)

    box(100, 40, 250, { color: 'darkRed' })
  })

  // Orange box.
  isolateTransformations(() => {
    translate(250, 0, 0)
    rotateZ(millis() / 2000)

    box(100, 40, 250, { color: 'orange' })
  })
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
