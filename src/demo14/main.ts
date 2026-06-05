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
import {
  elbowUpPosX,
  elbowRightPosY,
  elbowUpPosZ,
} from '../elbow_primitives.ts'
import {
  ElbowShapeOptions,
  elbowFrontPosY,
  elbowUpNegX,
  elbowLeftPosY,
} from '../elbow_primitives.ts'
import { translate, isolateTransformations, square2d } from '../primitives.ts'
import { elbowUpNegZ, elbowBackPosY } from '../elbow_primitives.ts'

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

  isolateTransformations(() => {
    translate(100, 0, 0)

    elbowUpPosX(RADIUS, options, true)
    elbowRightPosY(RADIUS, options, true)
    elbowUpPosX(RADIUS, options, true)
    elbowRightPosY(RADIUS, options, true)
    elbowUpPosX(RADIUS, options, true)
  })

  isolateTransformations(() => {
    translate(-100, 0, 0)

    elbowUpNegX(RADIUS, options, true)
    elbowLeftPosY(RADIUS, options, true)
    elbowUpNegX(RADIUS, options, true)
    elbowLeftPosY(RADIUS, options, true)
    elbowUpNegX(RADIUS, options, true)
  })

  isolateTransformations(() => {
    translate(0, 0, 100)

    elbowUpPosZ(RADIUS, options, true)
    elbowFrontPosY(RADIUS, options, true)
    elbowUpPosZ(RADIUS, options, true)
    elbowFrontPosY(RADIUS, options, true)
    elbowUpPosZ(RADIUS, options, true)
  })

  isolateTransformations(() => {
    translate(0, 0, -100)

    elbowUpNegZ(RADIUS, options, true)
    elbowBackPosY(RADIUS, options, true)
    elbowUpNegZ(RADIUS, options, true)
    elbowBackPosY(RADIUS, options, true)
    elbowUpNegZ(RADIUS, options, true)
  })

  translate(0, -50, 0)
  rotateX(PI / 2)

  square2d(200, { color: 'steelblue', isDoubleSided: true })
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
