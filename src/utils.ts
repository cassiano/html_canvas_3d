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
type NestedArray<T, D extends number[]> = D extends [
  number,
  ...infer Rest extends number[],
]
  ? NestedArray<T, Rest>[]
  : T

type ArrayAsObject<D extends number[]> = { [K in keyof D]: number }

/**
 * Generates an N-dimensional array.
 * @param dimensions A tuple or array defining the size of each dimension.
 * @param callback A function receiving all current indices and returning the value.
 */
export const timesMapN = <T, D extends number[]>(
  dimensions: [...D],
  callback: (...indexes: ArrayAsObject<D>) => T,
): NestedArray<T, D> => {
  // Internal helper to track accumulated indices through recursion
  const accumulateIndices = (
    currentDimensions: number[],
    currentIndexes: number[],
    // deno-lint-ignore no-explicit-any
  ): any => {
    const [firstDimension, ...remainingDimensions] = currentDimensions
    const augmentedIndexes = (i: number) =>
      [...currentIndexes, i] as ArrayAsObject<D>

    return timesMap(firstDimension, i =>
      remainingDimensions.length === 0
        ? callback(...augmentedIndexes(i))
        : accumulateIndices(remainingDimensions, [...currentIndexes, i]),
    )
  }

  // Handle empty dimensions case
  if (dimensions.length === 0) return [] as NestedArray<T, D>

  return accumulateIndices(dimensions, [])
}

export const timesForEachN = <T, D extends number[]>(
  dimensions: [...D],
  callback: (...indexes: ArrayAsObject<D>) => T,
): void => {
  // Internal helper to track accumulated indices through recursion
  const accumulateIndices = (
    currentDimensions: number[],
    currentIndexes: number[],
  ): void => {
    const [firstDimension, ...remainingDimensions] = currentDimensions
    const augmentedIndexes = (i: number) =>
      [...currentIndexes, i] as ArrayAsObject<D>

    timesForEach(firstDimension, i => {
      remainingDimensions.length === 0
        ? callback(...augmentedIndexes(i))
        : accumulateIndices(remainingDimensions, [...currentIndexes, i])
    })
  }

  // Handle empty dimensions case
  if (dimensions.length === 0) return

  accumulateIndices(dimensions, [])
}

// Slider configuration
export interface SliderConfig {
  label?: string
  min?: number
  max?: number
  step?: number
  value?: number
  length?: number
  color?: string
  backgroundColor?: string
  textColor?: string
  onChange?: (value: number) => void
  container?: HTMLElement
  vertical?: boolean
  showValue?: boolean
  valueFormatter?: (value: number) => string
}

export const createSlider = (config: SliderConfig) => {
  const {
    label = 'Value',
    min = 0,
    max = 100,
    step = 1,
    value = (min + max) / 2,
    length = 200,
    color = '#4CAF50',
    textColor = '#000',
    onChange,
    container = document.body,
    vertical = false,
    showValue = true,
    valueFormatter = v => v.toFixed(1),
  } = config

  // Create wrapper
  const wrapper = document.createElement('div')
  wrapper.style.display = 'grid'
  wrapper.style.gridTemplateColumns = '150px auto'
  wrapper.style.alignItems = 'center'
  wrapper.style.columnGap = '0px'
  wrapper.style.margin = '0px 0'
  wrapper.style.fontFamily = 'Arial, sans-serif'

  // Create label
  const labelEl = document.createElement('label')
  labelEl.textContent = label
  labelEl.style.color = textColor
  labelEl.style.fontWeight = 'bold'
  labelEl.style.fontSize = '14px'
  labelEl.style.justifySelf = 'start'

  // Create slider container
  const sliderContainer = document.createElement('div')
  sliderContainer.style.display = 'flex'
  sliderContainer.style.alignItems = 'center'
  sliderContainer.style.gap = '8px'

  // Create input range
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)
  input.style.width = vertical ? '40px' : `${length}px`
  input.style.height = vertical ? `${length}px` : '6px'
  if (vertical) input.style.writingMode = 'bt-lr'
  input.style.cursor = 'pointer'
  input.style.accentColor = color

  // Create value display
  const valueDisplay = document.createElement('span')
  valueDisplay.textContent = valueFormatter(value)
  valueDisplay.style.color = textColor
  valueDisplay.style.minWidth = '50px'
  valueDisplay.style.fontSize = '14px'
  valueDisplay.style.fontWeight = 'bold'

  // Update value display on input
  input.addEventListener('input', e => {
    const newValue = Number((e.target as HTMLInputElement).value)
    valueDisplay.textContent = valueFormatter(newValue)
    onChange?.(newValue)
  })

  // Assemble components
  sliderContainer.appendChild(input)
  if (showValue) sliderContainer.appendChild(valueDisplay)

  wrapper.appendChild(labelEl)
  wrapper.appendChild(sliderContainer)
  container.appendChild(wrapper)

  // Return controller object
  return {
    getValue: () => Number(input.value),
    setValue: (newValue: number) => {
      input.value = String(Math.max(min, Math.min(max, newValue)))
      valueDisplay.textContent = valueFormatter(Number(input.value))
      onChange?.(Number(input.value))
    },
    getElement: () => wrapper,
    getInput: () => input,
    destroy: () => wrapper.remove(),
    setColor: (newColor: string) => {
      input.style.accentColor = newColor
    },
  }
}

export const createDemoControlPanel = (canvasContainer: HTMLElement) => {
  const demoControlPanel = document.createElement('div')

  demoControlPanel.style.position = 'absolute'
  demoControlPanel.style.top = '10px'
  demoControlPanel.style.left = '10px'
  demoControlPanel.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
  demoControlPanel.style.padding = '10px'
  demoControlPanel.style.borderRadius = '5px'
  demoControlPanel.style.zIndex = '100'

  canvasContainer?.appendChild(demoControlPanel)

  return demoControlPanel
}
