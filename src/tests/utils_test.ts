/// <reference lib="deno.ns" />

import './dom_stub.ts'

import {
  assert,
  assertEquals,
  assertMatch,
  assertStrictEquals,
  assertThrows,
} from '@std/assert'

import { transform, translate } from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import {
  arraySub,
  assertIsNotNull,
  assertIsNotUndefined,
  assertIsNotUndefinedOrNull,
  createDemoControlPanel,
  createFrameLoop,
  createSlider,
  createToggle,
  cumulativeFps,
  fps,
  frameCount,
  logJson,
  millis,
  randomColor,
  reversedForEach,
  sample,
  timesForEach,
  timesForEachN,
  timesMap,
  timesMapN,
  timesReduce,
  togglePause,
} from '../utils.ts'
import {
  clearAnimationFrames,
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { resetScene } from './test_helpers.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Reads the text content of a descendant of an element.
 *
 * @param element - The ancestor element.
 * @param path - The child indices leading to the descendant.
 * @returns The descendant's text content.
 */
const childText = (element: HTMLElement, ...path: number[]): string =>
  path.reduce<Element>(
    (current, index) => current.children[index],
    element,
  ).textContent ?? ''

/**
 * Runs a frame loop for a fixed number of animation frames.
 *
 * @param drawFn - The callback invoked by the loop.
 * @param targetFPS - The frame rate the loop should aim for.
 * @param frames - How many animation frames to flush.
 * @param startTime - The timestamp of the first frame.
 * @param step - The number of milliseconds between frames.
 * @returns Nothing.
 */
const runLoop = (
  drawFn: () => void,
  targetFPS: number,
  frames: number,
  startTime: number,
  step: number,
) => {
  clearAnimationFrames()

  const loop = createFrameLoop(drawFn, () => {}, targetFPS)

  loop.start()
  flushAnimationFrames(frames, startTime, step)
  loop.stop()

  return loop
}

/**
 * Verifies that `timesForEach` invokes the callback once per index.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - timesForEach()', () => {
  const indices: number[] = []

  timesForEach(3, i => indices.push(i))

  assertEquals(indices, [0, 1, 2])

  // Counts below one never run the callback.
  let calls = 0
  timesForEach(0, () => calls++)
  timesForEach(-4, () => calls++)

  assertEquals(calls, 0)
})

/**
 * Verifies that `timesMap` collects one result per index.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - timesMap()', () => {
  assertEquals(timesMap(4, i => i * i), [0, 1, 4, 9])
  assertEquals(timesMap(0, i => i), [])
})

/**
 * Verifies that `timesReduce` folds the indices, optionally starting from an
 * explicit accumulator.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - timesReduce()', () => {
  // Without an initial accumulator the reduction starts from the first index.
  assertEquals(timesReduce(4, (acc: number, i) => acc + i), 0 + 1 + 2 + 3)

  // With an initial accumulator every index is folded in, starting from zero.
  assertEquals(timesReduce(4, (acc: number, i) => acc + i, 10), 10 + 0 + 1 + 2 + 3)

  assertEquals(timesReduce(0, (acc: number, i) => acc + i), 0)
  assertEquals(timesReduce(0, (acc: number, i) => acc + i, 7), 7)
})

/**
 * Verifies that `reversedForEach` visits the collection from last to first.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - reversedForEach()', () => {
  const visited: string[] = []

  reversedForEach(['a', 'b', 'c'], (item, index) =>
    visited.push(`${item}${index}`))

  assertEquals(visited, ['c2', 'b1', 'a0'])
})

/**
 * Verifies that `sample` returns the only item of a single-element
 * collection.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - sample()', () => {
  const only = { id: 1 }

  assertStrictEquals(sample([only]), only)

  const items = [1, 2, 3, 4, 5]

  for (let i = 0; i < 50; i++) assert(items.includes(sample(items)))
})

/**
 * Verifies that `arraySub` removes the items of the second collection.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - arraySub()', () => {
  assertEquals(arraySub([1, 2, 3, 4], [2, 4]), [1, 3])
  assertEquals(arraySub([1, 2], []), [1, 2])
  assertEquals(arraySub([], [1]), [])
})

/**
 * Verifies that `randomColor` produces a CSS `rgb()` color whose channels
 * respect the requested range.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - randomColor()', () => {
  const color = randomColor()

  assertMatch(color, /^rgb\([^,]+, [^,]+, [^)]+\)$/)

  for (let i = 0; i < 25; i++) {
    const channels = randomColor(10, 20)
      .slice('rgb('.length, -1)
      .split(', ')
      .map(Number)

    assertEquals(channels.length, 3)

    channels.forEach(channel => {
      assert(channel >= 10)
      assert(channel <= 20)
    })
  }
})

/**
 * Verifies that `timesMapN` builds a nested array of the requested shape.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - timesMapN()', () => {
  assertEquals(timesMapN([2, 3], (i, j) => i * 10 + j), [
    [0, 1, 2],
    [10, 11, 12],
  ])

  assertEquals(timesMapN([2], i => i * 2), [0, 2])
})

/**
 * Verifies that `timesForEachN` visits every combination of indices.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - timesForEachN()', () => {
  const visited: string[] = []

  timesForEachN([2, 3], (i, j) => visited.push(`${i},${j}`))

  assertEquals(visited, ['0,0', '0,1', '0,2', '1,0', '1,1', '1,2'])

  let calls = 0
  timesForEachN<number, number[]>([], () => calls++)

  assertEquals(calls, 0)
})

/**
 * Verifies that `assertIsNotUndefined` rejects only `undefined`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - assertIsNotUndefined()', () => {
  assertThrows(
    () => assertIsNotUndefined(undefined),
    TypeError,
    'Expected value not to be undefined',
  )

  // `null` is explicitly allowed.
  assertIsNotUndefined(null)
  assertIsNotUndefined(0)
  assertIsNotUndefined('')
})

/**
 * Verifies that `assertIsNotNull` rejects only `null`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - assertIsNotNull()', () => {
  assertThrows(
    () => assertIsNotNull(null),
    TypeError,
    'Expected value not to be null',
  )

  // `undefined` is explicitly allowed.
  assertIsNotNull(undefined)
  assertIsNotNull(0)
})

/**
 * Verifies that `assertIsNotUndefinedOrNull` rejects both `undefined` and
 * `null`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - assertIsNotUndefinedOrNull()', () => {
  assertThrows(
    () => assertIsNotUndefinedOrNull(undefined),
    TypeError,
    'Expected value not to be undefined or null',
  )
  assertThrows(
    () => assertIsNotUndefinedOrNull(null),
    TypeError,
    'Expected value not to be undefined or null',
  )

  assertIsNotUndefinedOrNull(0)
  assertIsNotUndefinedOrNull('value')
})

/**
 * Verifies that `logJson` writes the JSON representation of its argument to
 * the console.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - logJson()', () => {
  const original = console.log
  const messages: unknown[][] = []

  console.log = (...args: unknown[]) => messages.push(args)

  try {
    logJson({ a: 1, b: [2, 3] })
  } finally {
    console.log = original
  }

  assertEquals(messages, [['{"a":1,"b":[2,3]}']])
})

/**
 * Verifies that `createSlider` builds a labelled range input with the
 * documented defaults.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() defaults', () => {
  resetScene()

  const container = document.createElement('div')
  const slider = createSlider({ container })

  assertEquals(slider.getElement().parentElement, container)
  assertEquals(childText(slider.getElement(), 0), 'Value')

  const input = slider.getInput()

  assertEquals(input.type, 'range')
  assertEquals(input.min, '0')
  assertEquals(input.max, '100')
  assertEquals(input.step, '1')
  assertEquals(input.value, '50')
  assertEquals(input.style.width, '200px')
  assertEquals(input.style.height, '6px')
  assertEquals(input.style.accentColor, 'green')
  assertEquals(slider.getValue(), 50)

  // The default formatter shows one decimal place.
  assertEquals(childText(slider.getElement(), 1, 1), '50.0')
})

/**
 * Verifies that `createSlider` honours a custom configuration.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() custom configuration', () => {
  resetScene()

  const container = document.createElement('div')
  const slider = createSlider({
    container,
    label: 'Speed',
    min: -10,
    max: 10,
    step: 0.5,
    value: 2,
    length: 320,
    color: 'blue',
    textColor: 'red',
    showValue: false,
    valueFormatter: value => `${value}!`,
  })

  const input = slider.getInput()

  assertEquals(childText(slider.getElement(), 0), 'Speed')
  assertEquals(input.min, '-10')
  assertEquals(input.max, '10')
  assertEquals(input.step, '0.5')
  assertEquals(input.value, '2')
  assertEquals(input.style.width, '320px')
  assertEquals(input.style.accentColor, 'blue')
  assertEquals(slider.getValue(), 2)

  // `showValue: false` omits the value display from the control row.
  assertEquals(slider.getElement().children[1].children.length, 1)
})

/**
 * Verifies that `createSlider` renders vertically when asked to.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() vertical layout', () => {
  resetScene()

  const slider = createSlider({
    container: document.createElement('div'),
    vertical: true,
    length: 150,
  })

  const input = slider.getInput()

  assertEquals(input.style.width, '40px')
  assertEquals(input.style.height, '150px')
  assertEquals(input.style.writingMode, 'bt-lr')
})

/**
 * Verifies that `createSlider().setValue` clamps the value and notifies the
 * change listener.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() setValue()', () => {
  resetScene()

  const values: number[] = []
  const slider = createSlider({
    container: document.createElement('div'),
    min: 0,
    max: 100,
    onChange: value => values.push(value),
  })

  slider.setValue(25)
  assertEquals(slider.getValue(), 25)

  slider.setValue(-10)
  assertEquals(slider.getValue(), 0)

  slider.setValue(1000)
  assertEquals(slider.getValue(), 100)

  assertEquals(values, [25, 0, 100])
  assertEquals(childText(slider.getElement(), 1, 1), '100.0')
})

/**
 * Verifies that typing into the range input updates the display and notifies
 * the change listener.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() input event', () => {
  resetScene()

  const values: number[] = []
  const slider = createSlider({
    container: document.createElement('div'),
    onChange: value => values.push(value),
  })

  const input = slider.getInput()

  input.value = '37'
  input.dispatchEvent(new FakeEvent('input') as unknown as Event)

  assertEquals(values, [37])
  assertEquals(childText(slider.getElement(), 1, 1), '37.0')
})

/**
 * Verifies that a slider's colour can be changed and that `destroy` removes
 * it from the DOM.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createSlider() setColor() and destroy()', () => {
  resetScene()

  const container = document.createElement('div')
  const slider = createSlider({ container })

  slider.setColor('purple')
  assertEquals(slider.getInput().style.accentColor, 'purple')

  assertEquals(container.children.length, 1)

  slider.destroy()

  assertEquals(container.children.length, 0)
  assertEquals(slider.getElement().parentElement, null)
})

/**
 * Verifies that `createToggle` builds a checkbox with the documented
 * defaults.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createToggle() defaults', () => {
  resetScene()

  const container = document.createElement('div')
  const toggle = createToggle({ container })

  assertEquals(toggle.getElement().parentElement, container)
  assertEquals(childText(toggle.getElement(), 0), 'Value')

  const input = toggle.getInput()

  assertEquals(input.type, 'checkbox')
  assertEquals(input.checked, false)
  assertEquals(input.style.accentColor, 'green')
  assertEquals(toggle.getValue(), false)
  assertEquals(childText(toggle.getElement(), 1, 1), 'Off')
})

/**
 * Verifies that `createToggle` honours a custom configuration.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createToggle() custom configuration', () => {
  resetScene()

  const changes: boolean[] = []
  const toggle = createToggle({
    container: document.createElement('div'),
    label: 'Axes',
    value: true,
    onLabel: 'Shown',
    offLabel: 'Hidden',
    color: 'orange',
    showValue: false,
    onChange: value => changes.push(value),
  })

  assertEquals(childText(toggle.getElement(), 0), 'Axes')
  assertEquals(toggle.getValue(), true)
  assertEquals(toggle.getInput().style.accentColor, 'orange')
  assertEquals(toggle.getElement().children[1].children.length, 1)

  // Constructing the toggle does not fire the change listener.
  assertEquals(changes, [])
})

/**
 * Verifies that `createToggle().setValue` updates the display and notifies
 * the change listener.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createToggle() setValue()', () => {
  resetScene()

  const changes: boolean[] = []
  const toggle = createToggle({
    container: document.createElement('div'),
    onChange: value => changes.push(value),
  })

  toggle.setValue(true)

  assertEquals(toggle.getValue(), true)
  assertEquals(childText(toggle.getElement(), 1, 1), 'On')

  toggle.setValue(false)

  assertEquals(toggle.getValue(), false)
  assertEquals(childText(toggle.getElement(), 1, 1), 'Off')
  assertEquals(changes, [true, false])
})

/**
 * Verifies that clicking the checkbox updates the display and notifies the
 * change listener.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createToggle() change event', () => {
  resetScene()

  const changes: boolean[] = []
  const toggle = createToggle({
    container: document.createElement('div'),
    onChange: value => changes.push(value),
  })

  const input = toggle.getInput()

  input.checked = true
  input.dispatchEvent(new FakeEvent('change') as unknown as Event)

  assertEquals(changes, [true])
  assertEquals(childText(toggle.getElement(), 1, 1), 'On')
})

/**
 * Verifies that a toggle's colour can be changed and that `destroy` removes
 * it from the DOM.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createToggle() setColor() and destroy()', () => {
  resetScene()

  const container = document.createElement('div')
  const toggle = createToggle({ container })

  toggle.setColor('black')
  assertEquals(toggle.getInput().style.accentColor, 'black')

  assertEquals(container.children.length, 1)

  toggle.destroy()

  assertEquals(container.children.length, 0)
  assertEquals(toggle.getElement().parentElement, null)
})

/**
 * Verifies that `createDemoControlPanel` creates a styled panel and appends
 * it to the given container.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createDemoControlPanel()', () => {
  resetScene()

  const container = document.createElement('div')
  const panel = createDemoControlPanel(container)

  assertEquals(panel.parentElement, container)
  assertEquals(panel.style.position, 'absolute')
  assertEquals(panel.style.top, '10px')
  assertEquals(panel.style.left, '300px')
  assertEquals(panel.style.backgroundColor, 'white')
  assertEquals(panel.style.zIndex, '100')
})

/**
 * Verifies that the frame loop draws every frame when the timestamps match
 * the requested frame duration, and keeps the frame statistics up to date.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createFrameLoop() draws every frame', () => {
  resetScene()

  const baselineFrames = frameCount()
  let draws = 0

  runLoop(() => draws++, 10, 5, 1_000_000, 100)

  assertEquals(draws, 5)
  assertEquals(frameCount() - baselineFrames, 5)

  // The statistics are refreshed after every frame.
  assertEquals(millis(), 1_000_400)
  assert(Number.isFinite(fps()))
  assert(Number.isFinite(cumulativeFps()))
})

/**
 * Verifies that the frame loop throttles the drawing to the requested frame
 * rate when the animation frames arrive faster than needed.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createFrameLoop() throttles the frame rate', () => {
  resetScene()

  let draws = 0

  // Five frames sharing the same timestamp can only produce a single draw.
  runLoop(() => draws++, 10, 5, 4_000_000, 0)

  assertEquals(draws, 1)
})

/**
 * Verifies that `stop()` cancels the pending animation frame.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createFrameLoop() stop()', () => {
  resetScene()

  let draws = 0
  const loop = createFrameLoop(() => draws++, () => {}, 10)

  clearAnimationFrames()
  loop.start()
  flushAnimationFrames(2, 6_000_000, 100)

  assertEquals(draws, 2)

  loop.stop()

  // Nothing is left to run, so flushing has no effect.
  assertEquals(flushAnimationFrames(3, 6_000_200, 100), [])
  assertEquals(draws, 2)

  // `start()` can resume the loop after it was stopped.
  loop.start()
  flushAnimationFrames(1, 6_000_300, 100)
  loop.stop()

  assertEquals(draws, 3)
})

/**
 * Verifies that pausing the loop stops drawing and invokes the pause
 * callback exactly once, until the loop is resumed.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createFrameLoop() pause()', () => {
  resetScene()

  let draws = 0
  let pausedCallbacks = 0
  let isPaused = false
  const setPaused = (value: boolean) => {
    if (isPaused === value) return

    togglePause()
    isPaused = value
  }

  const loop = createFrameLoop(
    () => draws++,
    () => pausedCallbacks++,
    10,
  )

  clearAnimationFrames()
  loop.start()

  try {
    flushAnimationFrames(1, 8_000_000, 100)

    assertEquals(draws, 1)
    assertEquals(pausedCallbacks, 0)

    setPaused(true)
    flushAnimationFrames(2, 8_000_100, 100)

    // The pause indicator is shown only once, and no frame is drawn.
    assertEquals(draws, 1)
    assertEquals(pausedCallbacks, 1)

    setPaused(false)
    flushAnimationFrames(1, 8_000_300, 100)

    assertEquals(draws, 2)
  } finally {
    // Make sure the shared pause flag does not leak into other tests.
    setPaused(false)
    loop.stop()
  }
})

/**
 * Verifies that `createFrameLoop` isolates the transformation state around
 * every drawn frame.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Utils - createFrameLoop() isolates transformations', () => {
  resetScene()

  let offsetInsideFrame = 0

  runLoop(() => {
    translate(10, 0, 0)

    offsetInsideFrame = transform($v(0, 0, 0)).x
  }, 10, 1, 12_000_000, 100)

  // The translation applied inside the frame took effect there...
  assertEquals(offsetInsideFrame, 10)

  // ...but it did not leak out of the loop.
  assertEquals(transform($v(0, 0, 0)).toArray(), [0, 0, 0])
})
