import {
  PI,
  createFrameLoop,
  fps,
  frameCount,
  millis,
  togglePause,
} from './utils'
import {
  animation,
  background,
  box,
  isolateTransformations,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  rotateZ,
  scale,
  text2d,
  translate,
} from './primitives'
import { $v } from './vector'

animation.onclick = () => togglePause()

const draw = () => {
  console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })

  background('lightGray')
  rotateX(-PI / 9) // rotate(-PI / 9, $v(1, 0, 0))
  rotateY(PI / 9 + millis() / 3000) // rotate(PI / 9 + millis() / 3000, $v(0, 1, 0))

  render3dAxes()

  // Green box.
  isolateTransformations(() => {
    scale(0.5)
    scale(0.5)

    box($v(0, 0, 0), 100, 40, 140, { color: 'green' })
  })

  // Blue box.
  isolateTransformations(() => {
    translate(100, -100, 0)
    translate(100, -100, 0)

    box($v(0, 0, 0), 100, 40, 140, { color: 'blue' })
  })

  // Red box.
  isolateTransformations(() => {
    rotateZ(millis() / 2000)
    translate(0, 150, 0)

    box($v(0, 0, 0), 100, 40, 140, { color: 'red' })
  })

  // Black box.
  isolateTransformations(() => {
    translate(250, 0, 0)
    rotateZ(millis() / 2000)

    box($v(0, 0, 0), 100, 40, 140, { color: 'black' })
  })
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const frame = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
  },
  onPaused,
  120,
)

// Start the animation loop.
requestAnimationFrame(frame)
