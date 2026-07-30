import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  isolateTransformations,
  translate,
  ring,
  rotateZ,
  rotateX,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { cos, PI, sin, HALF_PI } from '../math_utils.ts'
import { elbow } from '../elbow_primitives.ts'
import { rotateY, autoRotationEnabled, scale } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const PIPE = { radius: 25, height: 150 }
const ELBOW_COLOR = 'darkGray'
const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  const radius = PIPE.radius + cos(millis() / 1500) * 15
  const height = PIPE.height + sin(millis() / 2500) * 150

  translate((-height / 3) * 2, -height / 2, -height / 2)

  elbow['-y'].x(radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(0, height / 2, 0)

  isolateTransformations(() => {
    rotateX(HALF_PI)

    ring(radius, height, {
      color: 'pink',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  translate(0, height / 2, 0)

  elbow.y.x(radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(radius + height / 2, radius, 0)

  isolateTransformations(() => {
    rotateZ(HALF_PI)
    rotateX(HALF_PI)

    ring(radius, height, {
      color: 'yellow',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  translate(height / 2, 0, 0)

  elbow.x.z(radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(radius, 0, radius + height / 2)

  ring(radius, height, {
    color: 'orange',
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(0, 0, height / 2)

  elbow.z['-y'](radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(0, -(height / 2 + radius), radius)

  isolateTransformations(() => {
    rotateX(HALF_PI)

    ring(radius, height, {
      color: 'lime',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  translate(0, -height / 2, 0)

  elbow['-y']['-z'](radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(0, -radius, -(height / 2 + radius))

  isolateTransformations(() => {
    ring(radius, height, {
      color: 'moccasin',
      circleSegments: CIRCLE_SEGMENTS,
      opacity: OPACITY,
    })
  })

  translate(0, 0, -height / 2)

  elbow['-z']['-x'](radius * 2, {
    color: ELBOW_COLOR,
    circleSegments: CIRCLE_SEGMENTS,
    opacity: OPACITY,
  })

  translate(-(height / 2 + radius), 0, -radius)

  isolateTransformations(() => {
    rotateY(HALF_PI)

    ring(radius, height, {
      color: 'lightseagreen',
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
