////////////////////////
// Colored Boxes Demo //
////////////////////////

import { createFrameLoop, fps, millis, togglePause } from './../utils.ts'
import {
  animation,
  background,
  box,
  isolateTransformations,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  text2d,
  translate,
} from './../primitives.ts'
import { $v } from './../vector.ts'
import { PI } from './../math_utils.ts'
import { FPS } from './../constants.ts'

animation.onclick = () => togglePause()

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 9)
  rotateY(millis() / 3000)

  render3dAxes()

  // Green box.
  isolateTransformations(() => {
    scale(0.5)
    scale(0.5)

    box(100, 40, 250, { color: 'green', alwaysVisible: true })
  })

  // Blue box.
  isolateTransformations(() => {
    translate(100, -100, 0)
    translate(100, -100, 0)

    box(100, 40, 250, { color: 'blue', alwaysVisible: true })
  })

  // Red box.
  isolateTransformations(() => {
    rotateZ(millis() / 2000)
    translate(0, 150, 0)

    box(100, 40, 250, { color: 'red', alwaysVisible: true })
  })

  // Orange box.
  isolateTransformations(() => {
    translate(250, 0, 0)
    rotateZ(millis() / 2000)

    box(100, 40, 250, { color: 'orange', alwaysVisible: true })
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
