import { FPS_WINDOW } from './constants.ts'
import { random } from './math_utils.ts'
import { isolateTransformations } from './primitives.ts'

declare function requestAnimationFrame(callback: (time: number) => void): number
declare function cancelAnimationFrame(handle: number): void

/**
 * Logs a value as JSON to the browser console.
 *
 * @param object - The value to serialize and log.
 */
export const logJson = (object: unknown) => console.log(JSON.stringify(object))

/**
 * Invokes a callback a given number of times.
 *
 * @param count - How many times the callback should run. Values below `1`
 *   mean the callback never runs.
 * @param fn - The callback, receiving the zero-based iteration index.
 */
export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}

/**
 * Collects the results of invoking a callback a given number of times.
 *
 * @param count - How many times the callback should run.
 * @param fn - The callback, receiving the zero-based iteration index and
 *   returning the value to collect.
 * @returns The collected values, in iteration order.
 */
export const timesMap = <T>(count: number, fn: (index: number) => T): T[] => {
  const results: T[] = []

  for (let i = 0; i < count; i++) results[i] = fn(i)

  return results
}

/**
 * Folds a range of indices into a single value.
 *
 * @param count - The exclusive upper bound of the index range.
 * @param fn - The reducer, receiving the accumulator and the current index.
 * @param initialAcc - The initial accumulator. When omitted, the reduction
 *   starts from the first index instead of from `0`.
 * @returns The accumulated value.
 */
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

/**
 * Invokes a callback for every item of a collection, from the last item to
 * the first.
 *
 * @param collection - The collection to iterate over.
 * @param fn - The callback, receiving the item and its index.
 */
export const reversedForEach = <T>(
  collection: T[],
  fn: (item: T, index: number) => void,
) => {
  for (let i = collection.length - 1; i >= 0; i--) fn(collection[i], i)
}

/**
 * Picks a random item from a collection.
 *
 * @param items - The collection to pick from.
 * @returns One of the items, chosen at random.
 */
export const sample = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)]

/**
 * Returns the items of the first collection that are absent from the second.
 *
 * @param array1 - The collection to filter.
 * @param array2 - The collection whose items should be excluded.
 * @returns A new array with the remaining items.
 */
export const arraySub = <T>(array1: T[], array2: T[]): T[] =>
  array1.filter(item => !array2.includes(item))

// Frame-related variables and state
let frameCount_ = 0
let millis_: number
let fps_: number
let cumulativeFps_: number
let lastFrameTime = 0
const frozenStats = { millis: 0, frameCount: 0 }

let paused = false
let pausedTextDisplayed = false

/**
 * Returns the timestamp of the most recent rendered frame, in milliseconds
 * since the page was loaded.
 *
 * @returns The timestamp of the current frame.
 */
export const millis = () => millis_

/**
 * Returns the current frame rate, measured over the most recent window of
 * frames.
 *
 * @returns The current FPS.
 */
export const fps = () => fps_

/**
 * Returns the average frame rate since the loop started.
 *
 * @returns The cumulative FPS.
 */
export const cumulativeFps = () => cumulativeFps_

/**
 * Returns how many frames have been rendered since the loop started.
 *
 * @returns The current frame count.
 */
export const frameCount = () => frameCount_

/**
 * Creates a render loop driven by the browser's animation frames.
 *
 * The loop throttles drawing to the requested frame rate, isolates the
 * transformation state around every frame, and keeps the frame statistics
 * exposed by {@link millis}, {@link fps}, {@link cumulativeFps} and
 * {@link frameCount} up to date.
 *
 * @param drawFn - Called once per rendered frame to produce the scene.
 * @param onPausedFn - Called once when the loop transitions into the paused
 *   state, to display a pause indicator.
 * @param targetFPS - The frame rate the loop should aim for. Defaults to
 *   `120`.
 * @returns An object with `start()` and `stop()` methods controlling the loop.
 */
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

/**
 * Toggles the paused state of the active frame loop.
 *
 * While paused, the loop keeps running but no longer draws frames.
 */
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
 *
 * @param dimensions - A tuple or array defining the size of each dimension.
 * @param callback - A function receiving all current indices and returning the value.
 * @returns The nested array holding the values produced by the callback.
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

/**
 * Invokes a callback for every combination of indices of an N-dimensional
 * space.
 *
 * @param dimensions - A tuple or array defining the size of each dimension.
 * @param callback - A function receiving all current indices.
 */
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
      if (remainingDimensions.length === 0) {
        callback(...augmentedIndexes(i))
      } else {
        accumulateIndices(remainingDimensions, [...currentIndexes, i])
      }
    })
  }

  // Handle empty dimensions case
  if (dimensions.length === 0) return

  accumulateIndices(dimensions, [])
}

// Slider configuration
/**
 * The configuration accepted by {@link createSlider}.
 */
export interface SliderConfig {
  /** The text shown next to the slider. */
  label?: string
  /** The lowest value the slider can take. */
  min?: number
  /** The highest value the slider can take. */
  max?: number
  /** The granularity of the slider's values. */
  step?: number
  /** The initial value of the slider. */
  value?: number
  /** The length of the slider, in pixels. */
  length?: number
  /** The accent color of the slider. */
  color?: string
  /** The background color of the slider's container. */
  backgroundColor?: string
  /** The color of the label and of the value display. */
  textColor?: string
  /** Called whenever the slider's value changes. */
  onChange?: (value: number) => void
  /** The element the slider is appended to. Defaults to `document.body`. */
  container?: HTMLElement
  /** Whether the slider should be rendered vertically. */
  vertical?: boolean
  /** Whether the current value should be displayed. */
  showValue?: boolean
  /** Formats the value for display. */
  valueFormatter?: (value: number) => string
}

/**
 * The configuration accepted by {@link createToggle}.
 */
export interface ToggleConfig {
  /** The text shown next to the toggle. */
  label?: string
  /** The initial state of the toggle. */
  value?: boolean
  /** The text shown when the toggle is on. */
  onLabel?: string
  /** The text shown when the toggle is off. */
  offLabel?: string
  /** The accent color of the toggle. */
  color?: string
  /** The color of the label and of the value display. */
  textColor?: string
  /** Called whenever the toggle's state changes. */
  onChange?: (value: boolean) => void
  /** The element the toggle is appended to. Defaults to `document.body`. */
  container?: HTMLElement
  /** Whether the current state should be displayed. */
  showValue?: boolean
}

/**
 * Creates a labelled on/off toggle.
 *
 * @param config - The toggle's configuration.
 * @returns A controller exposing the current value and lifecycle helpers.
 */
export const createToggle = (config: ToggleConfig) => {
  const {
    label = 'Value',
    value = false,
    onLabel = 'On',
    offLabel = 'Off',
    color = 'green',
    textColor = 'black',
    onChange,
    container = document.body,
    showValue = true,
  } = config

  const wrapper = document.createElement('div')
  wrapper.style.display = 'grid'
  wrapper.style.gridTemplateColumns = '200px auto'
  wrapper.style.alignItems = 'center'
  wrapper.style.columnGap = '0px'
  wrapper.style.margin = '0px 0'
  wrapper.style.fontFamily = 'Arial, sans-serif'

  const labelEl = document.createElement('label')
  labelEl.textContent = label
  labelEl.style.color = textColor
  labelEl.style.fontWeight = 'bold'
  labelEl.style.fontSize = '14px'
  labelEl.style.justifySelf = 'start'

  const toggleContainer = document.createElement('div')
  toggleContainer.style.display = 'flex'
  toggleContainer.style.alignItems = 'center'
  toggleContainer.style.gap = '8px'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = value
  input.style.cursor = 'pointer'
  input.style.width = '20px'
  input.style.height = '20px'
  input.style.accentColor = color

  const valueDisplay = document.createElement('span')
  valueDisplay.textContent = value ? onLabel : offLabel
  valueDisplay.style.color = textColor
  valueDisplay.style.minWidth = '50px'
  valueDisplay.style.fontSize = '14px'
  valueDisplay.style.fontWeight = 'bold'

  input.addEventListener('change', e => {
    const newValue = (e.target as HTMLInputElement).checked
    valueDisplay.textContent = newValue ? onLabel : offLabel
    onChange?.(newValue)
  })

  toggleContainer.appendChild(input)
  if (showValue) toggleContainer.appendChild(valueDisplay)

  wrapper.appendChild(labelEl)
  wrapper.appendChild(toggleContainer)
  container.appendChild(wrapper)

  return {
    /**
     * Returns the toggle's current state.
     *
     * @returns `true` when the toggle is on.
     */
    getValue: () => input.checked,
    /**
     * Sets the toggle's state and notifies the change listener.
     *
     * @param newValue - The new state of the toggle.
     */
    setValue: (newValue: boolean) => {
      input.checked = newValue
      valueDisplay.textContent = newValue ? onLabel : offLabel
      onChange?.(newValue)
    },
    /**
     * Returns the toggle's wrapper element.
     *
     * @returns The wrapper element.
     */
    getElement: () => wrapper,
    /**
     * Returns the toggle's underlying checkbox element.
     *
     * @returns The checkbox element.
     */
    getInput: () => input,
    /**
     * Removes the toggle from the DOM.
     */
    destroy: () => wrapper.remove(),
    /**
     * Changes the toggle's accent color.
     *
     * @param newColor - The new accent color.
     */
    setColor: (newColor: string) => {
      input.style.accentColor = newColor
    },
  }
}

/**
 * Creates a labelled range slider.
 *
 * @param config - The slider's configuration.
 * @returns A controller exposing the current value and lifecycle helpers.
 */
export const createSlider = (config: SliderConfig) => {
  const {
    label = 'Value',
    min = 0,
    max = 100,
    step = 1,
    value = (min + max) / 2,
    length = 200,
    color = 'green',
    textColor = 'black',
    onChange,
    container = document.body,
    vertical = false,
    showValue = true,
    valueFormatter = v => v.toFixed(1),
  } = config

  // Create wrapper
  const wrapper = document.createElement('div')
  wrapper.style.display = 'grid'
  wrapper.style.gridTemplateColumns = '200px auto'
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
    /**
     * Returns the slider's current value.
     *
     * @returns The current value.
     */
    getValue: () => Number(input.value),
    /**
     * Sets the slider's value, clamped to its configured range, and notifies
     * the change listener.
     *
     * @param newValue - The new value of the slider.
     */
    setValue: (newValue: number) => {
      input.value = String(Math.max(min, Math.min(max, newValue)))
      valueDisplay.textContent = valueFormatter(Number(input.value))
      onChange?.(Number(input.value))
    },
    /**
     * Returns the slider's wrapper element.
     *
     * @returns The wrapper element.
     */
    getElement: () => wrapper,
    /**
     * Returns the slider's underlying range input element.
     *
     * @returns The range input element.
     */
    getInput: () => input,
    /**
     * Removes the slider from the DOM.
     */
    destroy: () => wrapper.remove(),
    /**
     * Changes the slider's accent color.
     *
     * @param newColor - The new accent color.
     */
    setColor: (newColor: string) => {
      input.style.accentColor = newColor
    },
  }
}

/**
 * Creates the floating panel used by the demos to host their controls.
 *
 * @param canvasContainer - The element the panel is appended to.
 * @returns The panel element.
 */
export const createDemoControlPanel = (canvasContainer: HTMLElement) => {
  const demoControlPanel = document.createElement('div')

  demoControlPanel.style.position = 'absolute'
  demoControlPanel.style.top = '10px'
  demoControlPanel.style.left = '300px'
  demoControlPanel.style.backgroundColor = 'white'
  demoControlPanel.style.padding = '10px'
  demoControlPanel.style.borderRadius = '5px'
  demoControlPanel.style.zIndex = '100'

  canvasContainer?.appendChild(demoControlPanel)

  return demoControlPanel
}

/**
 * Returns a random RGB color.
 *
 * @param min - The lowest value each channel can take. Defaults to `0`.
 * @param max - The highest value each channel can take. Defaults to `255`.
 * @returns A CSS color string.
 */
export const randomColor = (min = 0, max = 255) =>
  `rgb(${random(min, max)}, ${random(min, max)}, ${random(min, max)})`

/**
 * Asserts that a value is neither `undefined` nor `null`.
 *
 * @param val - The value to check.
 * @throws {TypeError} When `val` is `undefined`.
 */
export function assertIsNotUndefined<T>(
  val: T | undefined | null,
): asserts val is NonNullable<T> | null {
  if (val === undefined)
    throw new TypeError(
      `Expected value not to be undefined, but received ${val}`,
    )
}

/**
 * Asserts that a value is neither `null` nor `undefined`.
 *
 * @param val - The value to check.
 * @throws {TypeError} When `val` is `null`.
 */
export function assertIsNotNull<T>(
  val: T | undefined | null,
): asserts val is NonNullable<T> | undefined {
  if (val === null)
    throw new TypeError(`Expected value not to be null, but received ${val}`)
}

/**
 * Asserts that a value is neither `undefined` nor `null`.
 *
 * @param val - The value to check.
 * @throws {TypeError} When `val` is `undefined` or `null`.
 */
export function assertIsNotUndefinedOrNull<T>(
  val: T | undefined | null,
): asserts val is NonNullable<T> {
  if (val === undefined || val === null)
    throw new TypeError(
      `Expected value not to be undefined or null, but received ${val}`,
    )
}
