/////////////////
// Sphere Demo //
/////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateY, ElbowShapeOptions, translate } from '../primitives.ts'
import { rotateX } from '../primitives.ts'
import { elbowLeftNegY, elbowUpNegX } from '../elbows.ts'
import {
  elbowDownPosX,
  elbowDownPosZ,
  elbowBackNegY,
  elbowBackPosY,
  elbowLeftNegZ,
  elbowFrontNegX,
  elbowUpPosX,
  elbowRightNegZ,
} from '../elbows.ts'

// -------------------------------------------------------------------------------------------------

const COLOR = 'darkGray'
const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5
const RADIUS = 100
const CIRCLE_SLICES = 16

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

  elbowUpPosX(RADIUS, options)
  translate(RADIUS / 2, RADIUS / 2, 0)
  elbowBackPosY(RADIUS, options)
  translate(0, RADIUS / 2, -RADIUS / 2)
  elbowRightNegZ(RADIUS, options)
  translate(RADIUS / 2, 0, -RADIUS / 2)
  elbowDownPosX(RADIUS, options)
  translate(RADIUS / 2, -RADIUS / 2, 0)
  elbowBackNegY(RADIUS, options)
  translate(0, -RADIUS / 2, -RADIUS / 2)
  elbowLeftNegZ(RADIUS, options)
  translate(-RADIUS / 2, 0, -RADIUS / 2)
  elbowFrontNegX(RADIUS, options)
  translate(-RADIUS / 2, 0, RADIUS / 2)
  elbowDownPosZ(RADIUS, options)
  translate(0, -RADIUS / 2, RADIUS / 2)
  elbowLeftNegY(RADIUS, options)
  translate(-RADIUS / 2, -RADIUS / 2, 0)
  elbowUpNegX(RADIUS, options)
  translate(-RADIUS / 2, RADIUS / 2, 0)
  // point(ORIGIN, { size: 10, color: 'yellow' }) // Used for debugging.
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
