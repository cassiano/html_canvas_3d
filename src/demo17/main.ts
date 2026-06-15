////////////////
// Torus Demo //
////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
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
import { torus, rotateX } from '../primitives.ts'
import { PI } from '../math_utils.ts'

// -------------------------------------------------------------------------------------------------

const COLOR = 'powderblue'
const CIRCLE_SEGMENTS = 36
const TORUS_CIRCLE_SEGMENTS = 72
const OPACITY = 0.5
const RADIUS = 200
const TUBE_RADIUS = 70
const CIRCLE_SLICES = 32
const TUBE_RING_DEPTH = 50

const options: ElbowShapeOptions = {
  color: COLOR,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  circleSegments: CIRCLE_SEGMENTS,
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

  torus(RADIUS, TUBE_RADIUS, TUBE_RING_DEPTH, TORUS_CIRCLE_SEGMENTS, options)
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
