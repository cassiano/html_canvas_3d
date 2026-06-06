///////////////
// Tire Demo //
///////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  rotateX,
  translate,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { elbowFromTo } from '../elbow_primitives.ts'
import { ElbowShapeOptions } from '../elbow_primitives.ts'

// -------------------------------------------------------------------------------------------------

const COLOR = 'darkGray'
const CIRCLE_SEGMENTS = 32
const OPACITY = 0.5
const RADIUS = 200
const CIRCLE_SLICES = 32

const options: ElbowShapeOptions = {
  color: COLOR,
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  translate(0, -RADIUS / 2, 0)

  elbowFromTo.x.y(RADIUS, options, true)
  elbowFromTo.y['-x'](RADIUS, options, true)
  elbowFromTo['-x']['-y'](RADIUS, options, true)
  elbowFromTo['-y'].x(RADIUS, options, true)
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
