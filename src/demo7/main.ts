import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, fps, millis, frameCount } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, HALF_PI } from '../math_utils.ts'
import { autoRotationEnabled, scale } from '../primitives.ts'
import {
  rotateX,
  cone,
  rotateY,
  translate,
  isolateTransformations,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const RADIUS = 100
const HEIGHT = 250
const OPACITY = 1

// -------------------------------------------------------------------------------------------------

const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  isolateTransformations(() => {
    translate(0, HEIGHT / 2, 0)
    rotateX(HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'orange',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, -HEIGHT / 2, 0)
    rotateX(-HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'brown',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(HEIGHT / 2, 0, 0)
    rotateY(-HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'yellow',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(-HEIGHT / 2, 0, 0)
    rotateY(HALF_PI)

    cone(RADIUS, HEIGHT, {
      color: 'pink',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, HEIGHT / 2)
    rotateX(PI)

    cone(RADIUS, HEIGHT, {
      color: 'lime',
      opacity: OPACITY,
    })
  })

  isolateTransformations(() => {
    translate(0, 0, -HEIGHT / 2)

    cone(RADIUS, HEIGHT, {
      color: 'magenta',
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
