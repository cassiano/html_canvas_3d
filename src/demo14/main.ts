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
  rotateY,
  rotateX,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { elbowDownPosZ } from '../elbow_primitives.ts'
import { translate } from '../primitives.ts'
import {
  elbowUpPosX,
  elbowRightPosY,
  elbowFrontPosY,
} from '../elbow_primitives.ts'
import {
  elbowBackNegY,
  elbowDownNegZ,
  elbowRightNegY,
} from '../elbow_primitives.ts'
import {
  elbowFrontNegX,
  elbowUpPosZ,
  elbowBackPosY,
} from '../elbow_primitives.ts'
import {
  ElbowShapeOptions,
  elbowLeftNegZ,
  elbowDownNegX,
} from '../elbow_primitives.ts'

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

  translate(100, 100, 50)

  elbowDownPosZ(RADIUS, options, true)
  elbowBackNegY(RADIUS, options, true)
  elbowLeftNegZ(RADIUS, options, true)
  elbowFrontNegX(RADIUS, options, true)
  elbowUpPosZ(RADIUS, options, true)
  elbowBackPosY(RADIUS, options, true)
  elbowLeftNegZ(RADIUS, options, true)
  elbowDownNegX(RADIUS, options, true)
  elbowBackNegY(RADIUS, options, true)
  elbowDownNegZ(RADIUS, options, true)
  elbowRightNegY(RADIUS, options, true)
  elbowUpPosX(RADIUS, options, true)
  elbowRightPosY(RADIUS, options, true)
  elbowUpPosX(RADIUS, options, true)
  elbowFrontPosY(RADIUS, options, true)
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
