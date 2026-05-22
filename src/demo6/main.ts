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
import { rotateX, circleFilled2d, rotate } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  // for (let angle = 0; angle <= 2 * PI; angle += (2 * PI) / 2) {
  //   isolateTransformations(() => {
  //     rotateX(angle)

  //     circleFilled2d(200, {
  //       color: 'green',
  //       alwaysVisible: true,
  //       opacity: 1,
  //     })
  //   })
  // }

  rotate(PI / 4, $v(1, 1, 1))

  circleFilled2d(200, {
    color: 'green',
    alwaysVisible: true,
    opacity: 1,
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
