import { FRAME_WINDOW } from './constants'

export const { PI, sin, cos, tan, min, max, sqrt, abs, acos } = Math

export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}

export const sample = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)]

// Frame-related variables and state
export let frameCount = 0
export let millis: number
export let fps: number
export let cumulativeFps: number
let lastFrameTime = 0
const frozenStats = { millis: 0, frameCount: 0 }

let paused = false
let pausedTextDisplayed = false

export const createFrameLoop = (
  drawFn: () => void,
  onPausedFn: () => void,
  targetFPS: number = 120,
) => {
  const frameDuration = 1000 / targetFPS

  const frame = (currentTime: number) => {
    requestAnimationFrame(frame)

    if (!paused) {
      pausedTextDisplayed = false
      millis = currentTime

      const deltaTime = currentTime - lastFrameTime

      if (deltaTime >= frameDuration) {
        lastFrameTime = currentTime - (deltaTime % frameDuration)

        drawFn()

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
      onPausedFn()

      pausedTextDisplayed = true
    }
  }

  return frame
}

export const togglePause = () => {
  paused = !paused
}
