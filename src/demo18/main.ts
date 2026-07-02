/////////////////////
// Sine Curve Demo //
/////////////////////

import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { createFrameLoop, frameCount, fps, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  rotateX,
  line,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, sin, TWO_PI } from '../math_utils.ts'
import { animation, isolateTransformations } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const X_STEP = 0.1
const SCALE = 20

const getPoint = (x: number) => $v(x, sin(x), 0)

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  for (let angle = 0; angle < TWO_PI; angle += TWO_PI / 72) {
    isolateTransformations(() => {
      rotateY(angle)

      for (let x = 0; x < animation.width / 2 / SCALE; x += X_STEP) {
        const pointA = getPoint(x).mult(SCALE)
        const pointB = getPoint(x + X_STEP).mult(SCALE)

        line(pointA, pointB, { noSplit: true })
      }
    })
  }
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
