/// <reference lib="deno.ns" />

import './dom_stub.ts'

import { assert, assertEquals, assertFalse } from '@std/assert'

import { $v } from '../vector_3d.ts'
import { render3dScene } from '../primitives.ts'
import {
  clearAnimationFrames,
  domStub,
  FakeEvent,
  flushAnimationFrames,
} from './dom_stub.ts'
import { recordingContext, resetScene } from './test_helpers.ts'
import { Game } from '../demo22/game.ts'
import { Actor } from '../demo22/actor.ts'
import { Pacman } from '../demo22/pacman.ts'
import { Ghost } from '../demo22/ghost.ts'
import { start, stop } from '../demo22/main.ts'
import { BLINKY_NAME } from '../demo22/constants.ts'
import { createKeyboardEvent } from './dom_stub.ts'

/**
 * Alias for `Deno.test`, used to register the test cases in this file.
 */
const test = Deno.test

/**
 * Resets demo22 state.
 */
const resetDemo22 = () => {
  stop()
  clearAnimationFrames()
  resetScene()
}

/**
 * Timestamp counter for animation frames.
 */
let lastFrameTime = 5000

/**
 * Advances animation frames.
 */
const advanceFrames = (times: number) => {
  lastFrameTime += 5000
  return flushAnimationFrames(times, lastFrameTime, 16)
}

/**
 * Verifies Actor base class.
 */
test('Demo 22 - Actor', () => {
  class D extends Actor {
    render() {}
  }
  const a = new D($v(1, 1), 0.1)
  assertEquals(a.position.toArray(), [1, 1, 0])
  assertEquals(a.dir, 'left')
})

/**
 * Verifies Pacman construction.
 */
test('Demo 22 - Pacman', () => {
  const p = new Pacman($v(13, 26), 0.8)
  assertEquals(p.position.toArray(), [13, 26, 0])
})

/**
 * Verifies Ghost construction.
 */
test('Demo 22 - Ghost', () => {
  const g = new Ghost($v(11, 14), 0.75, 'left', 0, BLINKY_NAME, 'B', 'red')
  assertEquals(g.position.toArray(), [11, 14, 0])
  assertEquals(g.name, BLINKY_NAME)
  assertEquals(g.color, 'red')
})

/**
 * Verifies Game instantiation and methods exist.
 */
test('Demo 22 - Game', () => {
  const game = new Game()
  assert(game.drawFrame)
  assert(game.handleKeydown)
  assert(game.renderPaused)
  assert(game.stop)
})

/**
 * Verifies demo22 start/stop.
 */
test('Demo 22 - start and stop', () => {
  resetDemo22()
  start()
  advanceFrames(2)
  render3dScene()
  // Keyboard listener should be registered
  domStub.document.dispatchEvent(createKeyboardEvent('ArrowRight') as any)
  stop()
  clearAnimationFrames()
})
