import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
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
import { jupiterRing } from '../primitives.ts'
import { isolateTransformations } from '../primitives.ts'
import {
  autoRotationEnabled,
  sphere,
  rotateY,
  rotateX,
  rotateZ,
} from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const RADIUS = 100

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 20)
  rotateZ(-PI / 3.5)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  sphere(RADIUS, { color: 'orange' })

  isolateTransformations(() => {
    rotateX(PI / 2)

    jupiterRing(RADIUS + 20, RADIUS + 40, 64, {
      color: 'purple',
      opacity: 0.5,
    })

    jupiterRing(RADIUS + 40, RADIUS + 80, 64, {
      color: 'lightGreen',
      opacity: 0.5,
    })

    jupiterRing(RADIUS + 80, RADIUS + 85, 64, {
      color: 'turquoise',
      opacity: 0.5,
    })

    jupiterRing(RADIUS + 85, RADIUS + 105, 64, {
      color: 'brown',
      opacity: 0.5,
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
