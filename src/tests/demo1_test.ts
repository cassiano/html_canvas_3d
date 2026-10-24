/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { assert, assertEquals, assertThrows } from '@std/assert'

import { $v, Vector3d } from '../vector_3d.ts'
import { CubeSphereMover } from '../demo1/cube_sphere_mover.ts'
import { Mover3D } from '../demo1/mover_3d.ts'
import { render3dScene } from '../primitives.ts'
import { clearAnimationFrames, flushAnimationFrames } from './dom_stub.ts'
import { recordedCalls, resetScene } from './test_helpers.ts'
import { start, stop } from '../demo1/main.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Concrete mover used to exercise the abstract `Mover3D` behaviour.
 */
class DummyMover extends Mover3D {
  /** The distance from the center to the border. */
  private _radius: number

  /**
   * Creates a dummy mover.
   *
   * @param mass - The mass of the mover.
   * @param xOrPositionOrRadius - x coordinate, position vector, or border radius.
   * @param yOrRadius - y coordinate or border radius when position provided.
   * @param z - z coordinate.
   * @param radius - border radius when coords provided.
   */
  constructor(
    mass: number,
    xOrPositionOrRadius: number | Vector3d,
    yOrRadius?: number,
    z?: number,
    radius?: number,
  ) {
    if (typeof xOrPositionOrRadius === 'number') {
      if (yOrRadius === undefined && z === undefined && radius === undefined) {
        // (mass, radius)
        super(mass, 0, 100, 0)
        this._radius = xOrPositionOrRadius
      } else {
        super(mass, xOrPositionOrRadius, yOrRadius ?? 0, z ?? 0)
        this._radius = radius ?? 0
      }
    } else {
      super(mass, xOrPositionOrRadius)
      this._radius = yOrRadius ?? 0
    }
  }

  /** Renders nothing. */
  override render() {}

  /** Returns the configured border distance. */
  override distanceFromCenterToBorder() {
    return this._radius
  }
}

/**
 * The timestamp used by animation frames.
 */
let lastFrameTime = 2000

/**
 * Runs animation frames far enough in the future to guarantee they are drawn.
 *
 * @param times - How many frames to run.
 * @returns The timestamps.
 */
const advanceFrames = (times: number) => {
  lastFrameTime += 10000

  return flushAnimationFrames(times, lastFrameTime, 16)
}

/**
 * Verifies that the `Mover3D` constructor accepts both coordinate and vector
 * forms.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - Mover3D constructor overloads', () => {
  const byCoords = new DummyMover(5, 1, 2, 3, 1)
  const byVector = new DummyMover(5, $v(1, 2, 3))

  assertEquals(byCoords.position.toArray(), [1, 2, 3])
  assertEquals(byVector.position.toArray(), [1, 2, 3])
  assertEquals(byCoords.velocity.toArray(), [0, 0, 0])
  assertEquals(byCoords.acceleration.toArray(), [0, 0, 0])
  assertEquals(byCoords.mass, 5)
})

/**
 * Verifies that applying a force accumulates an acceleration scaled by mass.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - Mover3D applyForce divides by mass', () => {
  const mover = new DummyMover(10, 0)
  mover.applyForce($v(20, 0, 0))
  assertEquals(mover.acceleration.toArray(), [2, 0, 0])
})

/**
 * Verifies that `applyForce` throws when the mass is zero.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - Mover3D applyForce throws when mass is zero', () => {
  const mover = new DummyMover(0, 0)
  assertThrows(() => mover.applyForce($v(1, 0, 0)))
})

/**
 * Verifies that `update` integrates velocity and acceleration, and skips
 * accelerating while touching the bottom.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - Mover3D update physics', () => {
  const mover = new DummyMover(1, 1)
  // At (0, 100, 0) with radius 1 and height 5000, not touching bottom.
  mover.velocity = $v(1, -2, 0)
  mover.acceleration = $v(0, -1, 0)
  mover.update(5000)
  assertEquals(mover.position.toArray(), [1, 98, 0])
  assertEquals(mover.velocity.toArray(), [1, -3, 0])
  assertEquals(mover.acceleration.toArray(), [0, 0, 0])

  // When touching the bottom, acceleration is not applied to velocity.
  const grounded = new DummyMover(1, 0, 0, 0, 10)
  grounded.position = $v(0, -4995, 0)
  grounded.velocity = $v(0, -5, 0)
  grounded.acceleration = $v(0, -10, 0)
  grounded.update(5000)
  // Velocity added to position even when touching.
  assertEquals(grounded.position.y, -5000)
  // Acceleration not applied.
  assertEquals(grounded.velocity.y, -5)
  assertEquals(grounded.acceleration.toArray(), [0, 0, 0])
})

/**
 * Verifies that `checkEdges` bounces the mover off the floor.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - Mover3D checkEdges bounces', () => {
  const mover = new DummyMover(1, 0, 0, 0, 10)
  mover.position = $v(0, -4991, 0)
  mover.velocity = $v(1, -3, 0)
  mover.checkEdges(5000)
  assertEquals(mover.velocity.toArray(), [1, 3, 0])
})

/**
 * Verifies `CubeSphereMover` constructors and its border distance.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - CubeSphereMover constructors', () => {
  const byCoords = new CubeSphereMover(2, 1, 2, 3, 10)
  const byVector = new CubeSphereMover(2, $v(1, 2, 3), 10)

  assertEquals(byCoords.position.toArray(), [1, 2, 3])
  assertEquals(byVector.position.toArray(), [1, 2, 3])
  assertEquals(byCoords.distanceFromCenterToBorder(), 10)
  assertEquals(byVector.radius, 10)
})

/**
 * Verifies that the cube-and-sphere mover renders both shapes.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - CubeSphereMover renders the cube and sphere', () => {
  resetScene()
  const mover = new CubeSphereMover(1, 0, 0, 0, 5)
  mover.render()
  render3dScene()
  // Sphere and cube produce fills.
  assert(recordedCalls('fill').length >= 2)
})

/**
 * Verifies that `start()` runs the frame loop and `stop()` stops it.
 *
 * @returns Nothing; the test fails by throwing an assertion error when the
 *   expected behaviour is not met.
 * @throws {Error} When an assertion fails.
 */
test('Demo 1 - start and stop', () => {
  stop()
  clearAnimationFrames()
  resetScene()

  start()

  advanceFrames(2)
  render3dScene()

  // The demo draws the background, axes, platform, and the mover.
  assert(recordedCalls('fill').length + recordedCalls('stroke').length > 0)

  stop()
  clearAnimationFrames()
})
