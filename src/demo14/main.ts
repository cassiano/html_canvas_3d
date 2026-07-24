import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
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
import { ElbowShapeOptions } from '../elbow_primitives.ts'
import { elbow } from '../elbow_primitives.ts'
import { translate, autoRotationEnabled } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5
const RADIUS = 100
const CIRCLE_SLICES = 16

const options1: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: 'darkGray',
}

const options2: ElbowShapeOptions = {
  ...options1,
  color: 'orangered',
}

const options3: ElbowShapeOptions = {
  ...options1,
  color: 'black',
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  translate(-200, 0, -RADIUS / 2)

  elbow.x.y(RADIUS, options1, true)
  elbow.y.x(RADIUS, options2, true)
  elbow.x['-y'](RADIUS, options3, true)
  elbow['-y'].x(RADIUS, options1, true)
  elbow.x.y(RADIUS, options2, true)
  elbow.y.x(RADIUS, options3, true)
  elbow.x['-y'](RADIUS, options1, true)
  elbow['-y'].x(RADIUS, options2, true)
  elbow.x.z(RADIUS, options3, true)
  elbow.z['-x'](RADIUS, options1, true)
  elbow['-x']['-y'](RADIUS, options2, true)
  elbow['-y']['-x'](RADIUS, options3, true)
  elbow['-x'].y(RADIUS, options1, true)
  elbow.y['-x'](RADIUS, options2, true)
  elbow['-x']['-y'](RADIUS, options3, true)
  elbow['-y']['-x'](RADIUS, options1, true)
  elbow['-x'].y(RADIUS, options2, true)
  elbow.y['-x'](RADIUS, options3, true)
  elbow['-x']['-z'](RADIUS, options1, true)
  elbow['-z'].x(RADIUS, options2, true)
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
