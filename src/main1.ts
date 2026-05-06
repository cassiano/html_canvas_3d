import { FRAME_WINDOW } from './constants'
import { PI } from './util'
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

const draw = () => {
  // console.log({ millis, frameCount, fps })

  background('lightGray')
  rotateX(-PI / 9)
  rotateY(PI / 9)

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
    rotateZ(millis / 2000)
    rotateZ(millis / 2000)
    translate(0, 150, 0)

    box($v(0, 0, 0), 100, 40, 140, { color: 'red' })
  })

  // Black box.
  isolateTransformations(() => {
    translate(250, 0, 0)
    rotateZ(millis / 2000)

    box($v(0, 0, 0), 100, 40, 140, { color: 'black' })
  })
}

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
    text2d('PAUSED', $v(0, 200))

    pausedTextDisplayed = true
  }
}

// Start the animation loop.
requestAnimationFrame(frame)
