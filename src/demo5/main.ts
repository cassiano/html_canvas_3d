//////////////////////////
// Rotating Sphere Demo //
//////////////////////////

import { FPS } from '../constants.ts'
import { createFrameLoop, fps, millis, togglePause } from '../utils.ts'
import {
  animation,
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateY,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { sphere, rotateX, rotateZ } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-(millis() / 2000))
  rotateZ(millis() / 3000)

  render3dAxes()

  sphere(250, { color: 'orange', opacity: 0.5 })
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
