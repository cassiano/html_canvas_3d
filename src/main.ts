import { DEPTH, FRAME_WINDOW, GRAVITY } from './constants'
import { PI } from './util'
import { SphereMover } from './sphere_mover'
import {
  animation,
  background,
  planeXZ,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './primitives'
import { $v } from './vector'

const TARGET_FPS = 120 // Set your desired FPS here
const FRAME_DURATION = 1000 / TARGET_FPS // How many milliseconds per frame

let lastFrameTime = 0 // Tracks the last time a frame was actually drawn
let frameCount = 0
let millis: number
const frozenStats = { millis: 0, frameCount: 0 }
let cumulativeFps: number
let fps: number

let paused = false
let pausedTextDisplayed = false

animation.onclick = () => {
  paused = !paused
}

const deltaAngle = (2 * PI) / 1e3
const gravity = $v(0, -GRAVITY, 0)
// const mover = new CubeMover(10, 0, 0, 0, 100)
const mover = new SphereMover(10, 0, 150, 0, 100)
const weight = gravity.clone().mult(mover.mass)

let yAngle = 0

const draw = () => {
  // console.log({ millis, frameCount, fps, cumulativeFps })

  background('lightGray')

  rotateX(-PI / 3)
  rotateY(PI / 12 + yAngle)

  render3dAxes()
  planeXZ($v(0, -DEPTH, 0), 200, 200)

  mover.render({
    xAngle: millis / 3000,
    yAngle: millis / 3000,
    zAngle: millis / 3000,
  })

  // Do the physics and animation updates.
  mover.update(DEPTH)
  mover.checkEdges(DEPTH)
  mover.applyForce(weight)

  yAngle += deltaAngle
}

// let angle = 0

// const draw = () => {
//   // console.log({ millis, frameCount, fps })

//   background('lightGray')
//   rotateX(-PI / 9)
//   rotateY(PI / 9)

//   render3dAxes()

//   // Green box.
//   isolateTransformations(() => {
//     scale(0.5)
//     scale(0.5)

//     box($v(0, 0, 0), 50, 25, 70, { color: 'green' })
//   })

//   // Blue box.
//   isolateTransformations(() => {
//     translate(100, -100, 0)
//     translate(100, -100, 0)

//     box($v(0, 0, 0), 50, 25, 70, { color: 'blue' })
//   })

//   // Red box.
//   isolateTransformations(() => {
//     rotateZ(angle / 2)
//     rotateZ(angle / 2)
//     translate(0, 150, 0)

//     box($v(0, 0, 0), 50, 25, 70, { color: 'red' })
//   })

//   // Black box.
//   isolateTransformations(() => {
//     translate(250, 0, 0)
//     rotateZ(angle)

//     box($v(0, 0, 0), 50, 25, 70, { color: 'black' })
//   })

//   angle += 0.005
// }

const frame = (currentTime: number) => {
  // 1. Schedule the next check immediately
  requestAnimationFrame(frame)

  // Check if not paused.
  if (!paused) {
    pausedTextDisplayed = false
    millis = currentTime

    // 2. Calculate how much time has passed since the last draw
    const deltaTime = currentTime - lastFrameTime

    // 3. Only run logic if enough time has passed
    if (deltaTime >= FRAME_DURATION) {
      // Adjust lastFrameTime.
      // Subtracting the remainder (deltaTime % FRAME_DURATION) helps keep
      // the timing consistent even if the browser timing is slightly off.
      lastFrameTime = currentTime - (deltaTime % FRAME_DURATION)

      resetTransformationMatrix()
      draw()

      frameCount++
    }

    cumulativeFps = frameCount / (millis / 1000)
    fps =
      (frameCount - frozenStats.frameCount) /
      ((millis - frozenStats.millis) / 1000)

    if (frameCount % FRAME_WINDOW === 0) {
      frozenStats.frameCount = frameCount
      frozenStats.millis = millis
    }
  } else if (!pausedTextDisplayed) {
    text2d('PAUSED', $v(0, 0))

    pausedTextDisplayed = true
  }
}

// Start the animation loop.
requestAnimationFrame(frame)
