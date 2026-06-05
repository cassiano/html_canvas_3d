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
import { cos, PI, sin } from '../math_utils.ts'
import {
  rotateY,
  isolateTransformations,
  translate,
  ring,
  rotateZ,
} from '../primitives.ts'
import { rotateX } from '../primitives.ts'
import { elbowUpPosZ } from '../elbows.ts'
import { elbowRightNegY, elbowRightPosY, elbowFrontPosX } from '../elbows.ts'

// -------------------------------------------------------------------------------------------------

const PIPE = { radius: 25, height: 150 }
const ELBOW_COLOR = 'darkGray'
const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  const radius = PIPE.radius + cos(millis() / 1500) * 15
  const height = PIPE.height + sin(millis() / 2500) * 150

  isolateTransformations(() => {
    translate(0, -height / 2, 0)

    elbowRightNegY(radius * 2, {
      color: ELBOW_COLOR,
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    rotateX(PI / 2)

    ring(radius, height, {
      color: 'pink',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, height / 2, 0)

    elbowRightPosY(radius * 2, {
      color: ELBOW_COLOR,
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(radius + height / 2, radius + height / 2, 0)
    rotateZ(PI / 2)
    rotateX(PI / 2)

    ring(radius, height, {
      color: 'yellow',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(radius + height, radius + height / 2, 0)

    elbowFrontPosX(radius * 2, {
      color: ELBOW_COLOR,
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(2 * radius + height, radius + height / 2, radius + height / 2)

    ring(radius, height, {
      color: 'orange',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(2 * radius + height, radius + height / 2, radius + height)

    elbowUpPosZ(radius * 2, {
      color: ELBOW_COLOR,
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
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
