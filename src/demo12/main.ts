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
import { PI, sin } from '../math_utils.ts'
import { rotateY, isolateTransformations } from '../primitives.ts'
import { rotateX, ring } from '../primitives.ts'

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(sin(millis() / 5000) * 1.5)
  rotateY(-millis() / 2000)

  render3dAxes()

  for (let radius = 250; radius > 0; radius -= 10)
    isolateTransformations(() => {
      rotateY(millis() / 50)
      rotateX(-PI / 2)

      ring(radius, 140 - radius / 2, {
        isDoubleSided: true,
        color: `hsl(${millis() / 100}, 100%, 50%)`,
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
