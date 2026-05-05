import { CUBIE_SIZE, CUBIES_PER_AXIS, FRAME_WINDOW } from './constants'
import { PI } from './util'
import {
  animation,
  background,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
} from './primitives'
import { $v } from './vector'
import { RubikCube } from './rubik_cube'

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

const cube = new RubikCube(CUBIE_SIZE, CUBIES_PER_AXIS)

const draw = () => {
  // console.log({ millis, frameCount, fps, cumulativeFps })

  background('lightGray')

  rotateX(-PI / 5)
  rotateY(PI / 12 + millis / 5000)

  render3dAxes()

  cube.render()
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
