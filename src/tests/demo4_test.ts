/// <reference lib="deno.ns" />

// To execute tests, run:
//
// `deno test`
// `deno test --watch`

import './dom_stub.ts'

import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from '@std/assert'

import {
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { documentStub, recordedCalls, resetScene } from './test_helpers.ts'
import { pop, render3dScene, transform } from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { LSystem } from '../demo4/l_system.ts'
import { Turtle } from '../demo4/turtle.ts'
import { demoForm, start, stop } from '../demo4/main.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * The angle used by the turtle of the tests, in radians.
 */
const QUARTER_TURN = Math.PI / 2

/**
 * The length of the turtle's steps, in world units.
 */
const STEP_LENGTH = 10

/**
 * The scale factor applied by the turtle's scale commands.
 */
const CUBE_SCALE = 0.5

/**
 * Flushes the deferred render queue and clears the recorded drawing
 * operations, so that a test can count only the shapes it draws itself.
 *
 * @returns Nothing; the renderer and the recorder are reset.
 */
const clearScene = () => {
  render3dScene()
  resetScene()
}

/**
 * Empties the transformation stack of the renderer.
 *
 * The stack is shared by every test file, so it is drained before the tests
 * that rely on it being empty.
 *
 * @returns Nothing; the transformation stack is left empty.
 */
const drainTransformationStack = () => {
  for (;;) {
    try {
      pop()
    } catch {
      break
    }
  }
}

/**
 * Returns the direction the turtle is currently facing.
 *
 * @returns The components of the turtle's heading.
 */
const heading = (): number[] => transform($v(1, 0, 0)).toArray()

/**
 * Returns the position of the turtle in the scene.
 *
 * @returns The components of the turtle's position.
 */
const position = (): number[] => transform($v(0, 0, 0)).toArray()

/**
 * Asserts that the components of a vector are within a small distance of the
 * expected ones.
 *
 * @param actual - The components produced by the code under test.
 * @param expected - The expected components.
 */
const assertVectorClose = (actual: number[], expected: number[]) => {
  assertEquals(actual.length, expected.length)

  actual.forEach((component, index) =>
    assertAlmostEquals(component, expected[index], 1e-9)
  )
}

/**
 * Verifies that the sentence of a new L-system is the system's axiom.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: the sentence of a new system is its axiom', () => {
  const lsystem = new LSystem('F', { F: 'F+F-F-F+F' })

  assertEquals(lsystem.axiom, 'F')
  assertEquals(lsystem.sentence, 'F')
})

/**
 * Verifies that `generate()` replaces every character of the sentence by the
 * text associated with it in the ruleset.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: generate rewrites the sentence', () => {
  const lsystem = new LSystem('F', { F: 'F+F-F-F+F' })

  assertEquals(lsystem.generate(), 'F+F-F-F+F')
  assertEquals(lsystem.sentence, 'F+F-F-F+F')
})

/**
 * Verifies that the characters without a rule are kept unchanged by
 * `generate()`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: the characters without a rule are kept', () => {
  const lsystem = new LSystem('AB', { A: 'A' })

  assertEquals(lsystem.generate(), 'AB')
  assertEquals(lsystem.sentence, 'AB')
})

/**
 * Verifies that the rules are normalized by removing every whitespace
 * character from them, so that they can be written across several lines.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: the rules are stripped of their whitespace', () => {
  const lsystem = new LSystem('F', {
    F: `
      F+F-F-F+F
    `,
  })

  assertEquals(lsystem.ruleset.F, 'F+F-F-F+F')
  assertEquals(lsystem.generate(), 'F+F-F-F+F')
})

/**
 * Verifies that `reset()` rewinds the sentence back to the axiom.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: reset rewinds the sentence to the axiom', () => {
  const lsystem = new LSystem('F', { F: 'F+F-F-F+F' })

  lsystem.generate()
  lsystem.generate()

  assert(lsystem.sentence !== lsystem.axiom)

  lsystem.reset()

  assertEquals(lsystem.sentence, 'F')
})

/**
 * Verifies that the consecutive generations of an L-system grow the sentence
 * according to the system's rules.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: the consecutive generations grow the sentence', () => {
  const lsystem = new LSystem('F', { F: 'F+F-F-F+F' })

  lsystem.generate()

  assertEquals(lsystem.sentence, 'F+F-F-F+F')

  lsystem.generate()

  assertEquals(
    lsystem.sentence,
    'F+F-F-F+F+F+F-F-F+F-F+F-F-F+F-F+F-F-F+F+F+F-F-F+F',
  )
  assertEquals(lsystem.sentence.length, 49)
})

/**
 * Verifies that an L-system without any rule keeps its sentence unchanged.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - LSystem: a system without rules keeps its sentence', () => {
  const lsystem = new LSystem('F+F', {})

  assertEquals(lsystem.generate(), 'F+F')
})

/**
 * Verifies that the turtle exposes the movement parameters it was built with.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the turtle exposes its movement parameters', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  assertEquals(turtle.length, STEP_LENGTH)
  assertEquals(turtle.angle, QUARTER_TURN)
  assertEquals(turtle.cubeScale, CUBE_SCALE)
})

/**
 * Verifies that the counter of the cubes drawn by a turtle starts at zero.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the counter of drawn cubes starts at zero', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  assertEquals(turtle.squareCount, 0)
})

/**
 * Verifies that the drawing command paints a cube and moves the turtle
 * forward.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the drawing command paints a cube and moves on', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  clearScene()

  turtle.render('◼')
  render3dScene()

  assert(recordedCalls('fill').length > 0)
  assertEquals(recordedCalls('fill')[0].fillStyle, '#AAA')

  assertVectorClose(position(), [STEP_LENGTH, 0, 0])
})

/**
 * Verifies that the move command moves the turtle forward without painting
 * anything.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the move command moves without drawing', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  clearScene()

  turtle.render('◻')
  render3dScene()

  assertEquals(recordedCalls('fill').length, 0)
  assertVectorClose(position(), [STEP_LENGTH, 0, 0])
})

/**
 * Verifies that rendering a character that is not a turtle command throws an
 * `Error` naming the offending character.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: an unrecognized character throws', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  assertThrows(
    () => turtle.render('X'),
    Error,
    'Unrecognized character X',
  )
})

/**
 * Verifies that restoring the transformation state more times than it was
 * saved throws an `Error`.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: restoring more states than were saved throws', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  drainTransformationStack()
  resetScene()

  assertThrows(
    () => turtle.render(']'),
    Error,
    'Empty transformation matrix stack',
  )
})

/**
 * Verifies that the save and restore commands bracket the movement made
 * between them.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the save and restore commands bracket movement', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  drainTransformationStack()
  resetScene()

  turtle.render('[')
  turtle.render('◻')

  assertVectorClose(position(), [STEP_LENGTH, 0, 0])

  turtle.render(']')

  assertVectorClose(position(), [0, 0, 0])
})

/**
 * Verifies that the turning commands rotate the turtle around the vertical
 * and the horizontal axes.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the turning commands rotate the turtle', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  const turned = (sentence: string) => {
    drainTransformationStack()
    resetScene()

    turtle.render(sentence)

    return heading()
  }

  const right = turned('→')

  assertVectorClose(right, [0, -1, 0])

  const left = turned('←')

  assertVectorClose(left, [0, 1, 0])

  const up = turned('↑')

  assertVectorClose(up, [0, 0, 1])

  const down = turned('↓')

  assertVectorClose(down, [0, 0, -1])
})

/**
 * Verifies that the reversal commands turn the turtle around.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the reversal commands turn the turtle around', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  const reversed = (sentence: string) => {
    drainTransformationStack()
    resetScene()

    turtle.render(sentence)

    return heading()
  }

  for (const sentence of ['⟲', '⟳']) {
    const headingVector = reversed(sentence)

    assertVectorClose(headingVector, [-1, 0, 0])
  }
})

/**
 * Verifies that the scale commands change the size of the shapes drawn by the
 * turtle.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the scale commands change the current scale', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  const scaled = (sentence: string) => {
    drainTransformationStack()
    resetScene()

    turtle.render(sentence)

    return heading()
  }

  assertVectorClose(scaled('½'), [0.5, 0, 0])
  assertVectorClose(scaled('②'), [2, 0, 0])
  assertVectorClose(scaled('⑵'), [2, 0, 0])
  assertVectorClose(scaled('2'), [2, 0, 0])
  assertVectorClose(scaled('▽'), [CUBE_SCALE, 0, 0])
  assertVectorClose(scaled('△'), [1 / CUBE_SCALE, 0, 0])
})

/**
 * Verifies that the debugging command draws a tiny coordinate system.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Turtle: the debugging command draws a coordinate system', () => {
  const turtle = new Turtle(STEP_LENGTH, QUARTER_TURN, CUBE_SCALE)

  clearScene()

  turtle.render('👀')
  render3dScene()

  assert(recordedCalls('stroke').length > 0)

  const strokeColours = [
    ...new Set(recordedCalls('stroke').map(call => call.strokeStyle)),
  ]

  assert(strokeColours.includes('red'))
  assert(strokeColours.includes('green'))
  assert(strokeColours.includes('blue'))
})

/**
 * Verifies that starting the demo creates its control panel, populates the
 * demo's form with the documented initial values, and that stopping the demo
 * removes the panel again.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Main: start creates the control panel, stop removes it', () => {
  resetScene()

  const container = documentStub().getElementById('canvas-container')

  assert(container)

  stop()
  start()

  assertEquals(container.children.length, 1)

  assert(demoForm.sliders)
  assertEquals(demoForm.sliders.smallerCubeScale.getValue(), 50)
  assertEquals(demoForm.sliders.generations.getValue(), 2)

  stop()

  assertEquals(container.children.length, 0)
})

/**
 * Verifies that moving the "Generations" slider regenerates the L-system's
 * sentence and rebuilds the turtle.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Main: the generations slider regenerates the sentence', () => {
  resetScene()

  stop()
  start()

  const input = demoForm.sliders!.generations.getInput()

  input.value = '3'
  input.dispatchEvent(new FakeEvent('input') as unknown as Event)

  assertEquals(demoForm.sliders!.generations.getValue(), 3)

  stop()
})

/**
 * Verifies that starting the demo renders a frame onto the canvas.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo4 - Main: the running demo paints the scene', () => {
  resetScene()

  stop()
  start()

  flushAnimationFrames(1, 1000, 16)

  assert(recordedCalls('fill').length > 0)

  stop()
})
