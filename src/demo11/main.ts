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
import {
  rotateZ,
  elbow,
  isolateTransformations,
  rotateY,
} from '../primitives.ts'
import { rotateX, cylinder, translate } from '../primitives.ts'

const PIPE = { radius: 25, height: 150, color: 'darkGray' }

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  cylinder(PIPE.radius, PIPE.height, { color: 'pink', circleSegments: 36 })

  isolateTransformations(() => {
    translate(0, PIPE.height / 2, 0)
    elbow(PIPE.radius * 2, { color: PIPE.color, circleSegments: 36 })
  })

  isolateTransformations(() => {
    translate(PIPE.radius + PIPE.height / 2, PIPE.radius + PIPE.height / 2, 0)
    rotateZ(PI / 2)
    cylinder(PIPE.radius, PIPE.height, {
      color: 'yellow',
      circleSegments: 36,
    })
  })

  isolateTransformations(() => {
    translate(
      2 * PIPE.radius + PIPE.height,
      PIPE.radius + PIPE.height / 2,
      PIPE.radius,
    )

    rotateY(PI)
    rotateX(PI / 2)
    elbow(PIPE.radius * 2, { color: PIPE.color, circleSegments: 36 })
  })

  isolateTransformations(() => {
    translate(
      2 * PIPE.radius + PIPE.height,
      PIPE.radius + PIPE.height / 2,
      PIPE.radius + PIPE.height / 2,
    )
    rotateX(PI / 2)
    cylinder(PIPE.radius, PIPE.height, {
      color: 'orange',
      circleSegments: 36,
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
