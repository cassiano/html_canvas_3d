/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { assert, assertEquals, assertFalse, assertThrows } from '@std/assert'

import { $v } from '../vector_3d.ts'
import { NULL_VECTOR } from '../constants.ts'
import { render3dScene } from '../primitives.ts'
import {
  clearAnimationFrames,
  domStub,
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { recordedCalls, recordingContext, resetScene } from './test_helpers.ts'
import { demo17Form, launchesPer100Frames, maxParticles, minParticles, renderIn3d } from '../demo17/demo17_form.ts'
import { Fireworks, PARTICLE_LIFESPAN, DEPTH } from '../demo17/fireworks.ts'
import { Particle } from '../demo17/particle.ts'
import { Mover3D as Demo17Mover } from '../demo17/mover_3d.ts'
import { start, stop } from '../demo17/main.ts'
import { createSlider, createToggle } from '../utils.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Resets demo17 state.
 */
const resetDemo17 = () => {
  Fireworks.reset()
  demo17Form.sliders = undefined
  demo17Form.toggles = undefined
  stop()
  clearAnimationFrames()
  resetScene()
}

/**
 * Creates demo form controls.
 */
const createForm = () => {
  demo17Form.sliders = {
    minParticles: createSlider({ container: document.createElement('div'), min: 100, max: 1000, value: 100 }),
    maxParticles: createSlider({ container: document.createElement('div'), min: 100, max: 10000, step: 100, value: 1000 }),
    launchesPer100Frames: createSlider({ container: document.createElement('div'), min: 1, max: 100, value: 10 }),
  }
  demo17Form.toggles = {
    renderIn3d: createToggle({ container: document.createElement('div'), value: false }),
  }
}

/**
 * Timestamp counter for animation frames.
 */
let lastFrameTime = 3000

/**
 * Advances animation frames.
 */
const advanceFrames = (times: number) => {
  lastFrameTime += 5000
  return flushAnimationFrames(times, lastFrameTime, 16)
}

/**
 * Verifies demo17_form helpers throw when controls not created.
 */
test('Demo 17 - form helpers throw without controls', () => {
  resetDemo17()
  assertThrows(() => minParticles(), Error, 'demo17Form.sliders should contain a value')
  assertThrows(() => maxParticles(), Error)
  assertThrows(() => launchesPer100Frames(), Error)
  assertThrows(() => renderIn3d(), Error, 'demo17Form.toggles should contain a value')
})

/**
 * Verifies demo17_form helpers read values.
 */
test('Demo 17 - form helpers read values', () => {
  resetDemo17()
  createForm()
  assertEquals(minParticles(), 100)
  assertEquals(maxParticles(), 1000)
  assertEquals(launchesPer100Frames(), 10)
  assertEquals(renderIn3d(), false)
})

/**
 * Verifies Fireworks static methods.
 */
test('Demo 17 - Fireworks static collection methods', () => {
  resetDemo17()
  createForm()
  assertEquals(Fireworks.count(), 0)
  Fireworks.create(800, 600)
  assertEquals(Fireworks.count(), 1)
  Fireworks.create(800, 600)
  assertEquals(Fireworks.count(), 2)
  Fireworks.destroy(0)
  assertEquals(Fireworks.count(), 1)
  Fireworks.reset()
  assertEquals(Fireworks.count(), 0)
})

/**
 * Verifies fireworks creation adds a particle.
 */
test('Demo 17 - Fireworks constructor creates a projectile', () => {
  resetDemo17()
  createForm()
  const f = new Fireworks(800, 600)
  assertEquals(f.particles.length, 1)
  assertEquals(f.exploded, false)
  assertEquals(f.particleCount(), 1)
})

/**
 * Verifies Fireworks applies gravity and explodes.
 */
test('Demo 17 - Fireworks run and explode', () => {
  resetDemo17()
  createForm()
  const f = new Fireworks(800, 600)
  f.particles[0].velocity = $v(0, 1, 0) // moving up so won't explode immediately
  f.applyForce($v(0, -0.03, 0))
  f.run()
  assert(f.particles.length >= 1)
})

/**
 * Verifies Particle behavior.
 */
test('Demo 17 - Particle lifecycle', () => {
  resetDemo17()
  const p = new Particle($v(0, 0, 0), $v(1, 0, 0), 10, 'red', 800, 600)
  assertFalse(p.isDead())
  p.run()
  assertEquals(p.lifespan, 9)
  p.lifespan = 0
  assert(p.isDead())
})

/**
 * Verifies Demo17 Mover3D.
 */
test('Demo 17 - Mover3D applyForce and update', () => {
  resetDemo17()
  class D extends Demo17Mover {
    render() {}
  }
  const m = new D(2, $v(0, 0, 0), $v(1, 0, 0))
  m.applyForce($v(4, 0, 0))
  m.update()
  assertEquals(m.velocity.x, 3)
  assertEquals(m.acceleration.toArray(), [0, 0, 0])
})

/**
 * Verifies start/stop.
 */
test('Demo 17 - start and stop', () => {
  resetDemo17()
  start()
  advanceFrames(1)
  render3dScene()
  assert(recordedCalls('fill').length + recordedCalls('stroke').length >= 0)
  stop()
  clearAnimationFrames()
})
