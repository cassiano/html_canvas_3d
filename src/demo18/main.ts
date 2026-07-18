import { FPS, FPS_LOGGING_FRAME_PERIOD, ORIGIN } from '../constants.ts'
import { createFrameLoop, frameCount, fps, millis } from '../utils.ts'
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

// -------------------------------------------------------------------------------------------------

const RADIUS = 200

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  elbow.y.x(RADIUS, { isDoubleSided: true })

  translate(0, RADIUS / 2, 0)
  cube(RADIUS, { opacity: 0.2 })

  point(ORIGIN, { size: 10, color: 'red' })
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
