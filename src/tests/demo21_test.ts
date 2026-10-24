/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { assert, assertEquals, assertFalse } from '@std/assert'

import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { render3dScene } from '../primitives.ts'
import {
  clearAnimationFrames,
  domStub,
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { recordedCalls, recordingContext, resetScene } from './test_helpers.ts'
import {
  G,
  AU,
  KM_TO_M,
  SUN_MASS_IN_KG,
  EARTH_YEAR_IN_DAYS,
  EARTH_DAY_IN_SECONDS,
  EARTH_YEAR_IN_SECONDS,
  EARTH_MOON_DISTANCE_IN_KM,
  MOON_RADIUS_IN_KM,
  MOON_ORBITAL_PERIOD_IN_DAYS,
  MOON_ORBITAL_PERIOD_IN_SECONDS,
  EARTH_RADIUS_IN_KM,
  EARTH_ORBIT_DURATION_IN_SECONDS,
  EARTH_MOON_CENTERS_DISTANCE_IN_M,
  DEFAULT_RADIUS_SCALE,
  DEFAULT_DISTANCE_SCALE,
  EARTH_MOON_DISTANCE_SCALE,
  SIMULATION_SECONDS_PER_REAL_SECOND,
  demoForm,
  sun,
  earth,
  start,
  stop,
} from '../demo21/main.ts'
import { AstronomicalBody } from '../demo21/astronomical_body.ts'
import { Mover3D as Demo21Mover } from '../demo21/mover_3d.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Resets demo21 state.
 */
const resetDemo21 = () => {
  stop()
  clearAnimationFrames()
  resetScene()
  demoForm.sliders = undefined
  demoForm.toggles = undefined
}

/**
 * Timestamp counter for animation frames.
 */
let lastFrameTime = 4000

/**
 * Advances animation frames.
 */
const advanceFrames = (times: number) => {
  lastFrameTime += 5000
  return flushAnimationFrames(times, lastFrameTime, 16)
}

/**
 * Verifies demo21 constants.
 */
test('Demo 21 - constants', () => {
  assertEquals(KM_TO_M, 1000)
  assertEquals(EARTH_DAY_IN_SECONDS, 86400)
  assertEquals(EARTH_YEAR_IN_SECONDS, EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS)
  assertEquals(MOON_ORBITAL_PERIOD_IN_SECONDS, MOON_ORBITAL_PERIOD_IN_DAYS * EARTH_DAY_IN_SECONDS)
  assertEquals(EARTH_MOON_CENTERS_DISTANCE_IN_M, (EARTH_RADIUS_IN_KM + EARTH_MOON_DISTANCE_IN_KM + MOON_RADIUS_IN_KM) * KM_TO_M)
  assertEquals(SIMULATION_SECONDS_PER_REAL_SECOND, EARTH_YEAR_IN_SECONDS / EARTH_ORBIT_DURATION_IN_SECONDS)
  assert(G > 0)
  assert(AU > 0)
  assert(SUN_MASS_IN_KG > 0)
})

/**
 * Verifies exported bodies.
 */
test('Demo 21 - exported bodies', () => {
  assert(earth !== undefined)
  assert(sun !== undefined)
  assertEquals(earth.name, 'earth')
  assertEquals(sun.name, 'sun')
})

/**
 * Verifies AstronomicalBody construction and methods.
 */
test('Demo 21 - AstronomicalBody', () => {
  const body = new AstronomicalBody('test', 6371000, 1e11, 5e24, 'blue', 365 * 86400)
  assertEquals(body.name, 'test')
  assert(body.position.x !== 0)
  assert(body.acceleration)
  const other = new AstronomicalBody('other', 1, 0, 1e30, 'yellow', 0)
  other.position = $v(0, 1e11, 0)
  body.attract(other)
  assert(body.acceleration.mag() >= 0)
  body.update(100)
  assert(body.position.x !== 0 || body.position.y !== 0)
})

/**
 * Verifies Demo21 Mover3D.
 */
test('Demo 21 - Mover3D', () => {
  class D extends Demo21Mover {
    render() {}
  }
  const m = new D(1, $v(0, 0, 0), $v(1, 0, 0), $v(0, 0, 0))
  m.applyForce($v(2, 0, 0))
  m.update(1)
  // velocity += acceleration * dt = (1,0,0) + (2,0,0) = (3,0,0)
  // position += velocity * dt = (0,0,0) + (3,0,0) = (3,0,0)
  // acceleration cleared
  assertEquals(m.position.toArray(), [3, 0, 0])
  assertEquals(m.velocity.toArray(), [3, 0, 0])
  assertEquals(m.acceleration.toArray(), [0, 0, 0])
})

/**
 * Verifies start/stop.
 */
test('Demo 21 - start and stop', () => {
  resetDemo21()
  start()
  advanceFrames(2)
  render3dScene()
  // Check slider exists
  assert(demoForm.sliders?.spacing !== undefined)
  stop()
  clearAnimationFrames()
})
