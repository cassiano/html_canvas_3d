import { FPS_WINDOW } from './constants.ts'
import { isolateTransformations } from './primitives.ts'

declare function requestAnimationFrame(callback: (time: number) => void): number
declare function cancelAnimationFrame(handle: number): void

export const logJson = (object: unknown) => console.log(JSON.stringify(object))

export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}

export const timesMap = <T>(count: number, fn: (index: number) => T): T[] => {
  const results: T[] = []

  for (let i = 0; i < count; i++) results[i] = fn(i)

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
    paused = false

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

///////////////////////
// AI-generated code //
///////////////////////

/**
 * Recursive type to create nested arrays based on the length of the dimensions tuple.
 * [number, number] -> T[][]
 */
type NestedArray<T, D extends unknown[]> = D extends [unknown, ...infer Rest]
  ? NestedArray<T, Rest>[]
  : T

/**
 * Generates an N-dimensional array.
 * @param dimensions A tuple or array defining the size of each dimension.
 * @param callback A function receiving all current indices and returning the value.
 */
export const timesMapN = <T, D extends number[]>(
  dimensions: [...D],
  callback: (...indexes: { [K in keyof D]: number }) => T,
): NestedArray<T, D> => {
  // Internal helper to track accumulated indices through recursion
  const recurse = (currentDims: number[], args: number[]): any => {
    const [first, ...rest] = currentDims

    return timesMap(first, i =>
      rest.length === 0
        ? callback(...([...args, i] as any))
        : recurse(rest, [...args, i]),
    )
  }

  // Handle empty dimensions case
  if (dimensions.length === 0) return [] as NestedArray<T, D>

  return recurse(dimensions, [])
}

export const timesForEachN = <T, D extends number[]>(
  dimensions: [...D],
  callback: (...indexes: { [K in keyof D]: number }) => T,
): void => {
  // Internal helper to track accumulated indices through recursion
  const recurse = (currentDims: number[], args: number[]): void => {
    const [first, ...rest] = currentDims

    timesForEach(first, i => {
      rest.length === 0
        ? callback(...([...args, i] as any))
        : recurse(rest, [...args, i])
    })
  }

  // Handle empty dimensions case
  if (dimensions.length === 0) return

  recurse(dimensions, [])
}
