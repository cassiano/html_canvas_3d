import { FPS_WINDOW } from './constants'
import { isolateTransformations } from './primitives.ts'

export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}

export const timesMap = <T>(count: number, fn: (index: number) => T): T[] => {
  const results: T[] = []

  for (let i = 0; i < count; i++) results[i] = fn(i)

  return results
}

// AI-generated.
export const timesMapN = <C extends number[], T>(
  counts: [...C],
  fn: (...indices: { [K in keyof C]: number }) => T,
): T[] => {
  const results: T[] = []
  const dimensions = counts.length

  // A temporary array to track the current index at each level of recursion
  const currentIndices = new Array(dimensions) as { [K in keyof C]: number }

  const iterate = (dimIndex: number) => {
    // Base case: we have reached the innermost dimension
    if (dimIndex === dimensions) {
      results.push(fn(...currentIndices))
      return
    }

    // Recursive step: iterate through the current dimension
    const count = counts[dimIndex]
    for (let i = 0; i < count; i++) {
      currentIndices[dimIndex] = i as any // Cast index to match the mapped tuple type
      iterate(dimIndex + 1)
    }
  }

  // Start recursion if there are dimensions, otherwise return empty
  if (dimensions > 0) {
    iterate(0)
  }

  return results
}

export const timesReduce = <T>(
  count: number,
  fn: (acc: T, item: number) => T,
  initialAcc?: T,
): T => {
  const startIndex = initialAcc === undefined ? 1 : 0
  let acc = initialAcc ?? (0 as T)

  for (let i = startIndex; i < count; i++) acc = fn(acc, i)

  return acc
}

export const sample = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)]

// Frame-related variables and state
let frameCount_ = 0
let millis_: number
let fps_: number
let cumulativeFps_: number
let lastFrameTime = 0
const frozenStats = { millis: 0, frameCount: 0 }

let paused = false
let pausedTextDisplayed = false

export const millis = () => millis_
export const fps = () => fps_
export const cumulativeFps = () => cumulativeFps_
export const frameCount = () => frameCount_

export const createFrameLoop = (
  drawFn: () => void,
  onPausedFn: () => void,
  targetFPS: number = 120,
) => {
  const frameDuration = 1000 / targetFPS
  let running = false
  let animationId: number | null = null

  const frame = (currentTime: number) => {
    if (!running) return

    animationId = requestAnimationFrame(frame)

    if (!paused) {
      pausedTextDisplayed = false
      millis_ = currentTime

      const deltaTime = currentTime - lastFrameTime

      if (deltaTime >= frameDuration) {
        lastFrameTime = currentTime - (deltaTime % frameDuration)

        isolateTransformations(drawFn)

        frameCount_++
      }

      cumulativeFps_ = frameCount_ / (millis_ / 1000)
      fps_ =
        (frameCount_ - frozenStats.frameCount) /
        ((millis_ - frozenStats.millis) / 1000)

      if (frameCount_ % FPS_WINDOW === 0) {
        frozenStats.frameCount = frameCount_
        frozenStats.millis = millis_
      }
    } else if (!pausedTextDisplayed) {
      onPausedFn()

      pausedTextDisplayed = true
    }
  }

  const start = () => {
    if (!running) {
      running = true

      requestAnimationFrame(frame)
    }
  }

  const stop = () => {
    running = false

    if (animationId !== null) {
      cancelAnimationFrame(animationId)

      animationId = null
    }
  }

  return { start, stop }
}

export const togglePause = () => {
  paused = !paused
}
