import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createFrameLoop,
  frameCount,
  fps,
  createToggle,
  createDemoControlPanel,
} from '../utils.ts'
import {
  background,
  render3dScene,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { Fireworks } from './fireworks.ts'
import { render3dAxes, animation, scale } from '../primitives.ts'
import { demo17Form } from './demo17_form.ts'
import { createSlider } from '../utils.ts'
import { launchesPer100Frames as launchesPer100Frames } from './demo17_form.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The downward acceleration applied to the fireworks on every frame.
 */
const GRAVITY = 0.03

/**
 * The force pulling the fireworks towards the bottom of the screen.
 */
const gravity = $v(0, -GRAVITY, 0)

/**
 * The initial value of the "Particles (min)" slider.
 */
const FIREWORKS_PARTICLES_DEFAULT_MIN_COUNT = 100

/**
 * The initial value of the "Particles (max)" slider.
 */
const FIREWORKS_PARTICLES_DEFAULT_MAX_COUNT = 1000

/**
 * The initial value of the "Launches per 100 frames" slider.
 */
const DEFAULT_FIREWORKS_LAUNCHES_PER_100_FRAMES = 10

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The demo's control panel, while the demo is running.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * Creates the demo's control panel and registers the controls it holds.
 *
 * The panel is appended to the canvas container, and the sliders and the
 * toggle it holds are stored in the demo's form state, so that the rest of
 * the demo can read the user's choices.
 *
 * @returns Nothing; the control panel is created and registered as a side
 *   effect.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo17Form.sliders = {
    minParticles: createSlider({
      label: 'Particles (min)',
      min: 100,
      max: 1000,
      value: FIREWORKS_PARTICLES_DEFAULT_MIN_COUNT,
      container: demoControlPanel,
    }),
    maxParticles: createSlider({
      label: 'Particles (max)',
      min: 100,
      max: 10000,
      step: 100,
      value: FIREWORKS_PARTICLES_DEFAULT_MAX_COUNT,
      container: demoControlPanel,
    }),
    launchesPer100Frames: createSlider({
      label: 'Launches per 100 frames',
      min: 1,
      max: 100,
      value: DEFAULT_FIREWORKS_LAUNCHES_PER_100_FRAMES,
      container: demoControlPanel,
    }),
  }

  demo17Form.toggles = {
    renderIn3d: createToggle({
      label: '3D version?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

/**
 * How many fireworks have been launched since the last 100-frame period.
 */
let launchCount = 0

// const counts = { fireworks: 0, particles: 0 }
// const maxCounts = { fireworks: 0, particles: 0 }

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the demo.
 *
 * New fireworks are launched according to the demo's settings, and the
 * fireworks already in the scene are moved, exploded and drawn.
 *
 * @returns Nothing; the scene is drawn as a side effect.
 * @throws {Error} With the message `demo3Form.sliders should contain a
 *   value`, when the demo's control panel has not been created yet, because
 *   the launch rate and the explosion's particle count are taken from it.
 * @throws {Error} With the message `demo3Form.toggles should contain a
 *   value`, when the demo's control panel has not been created yet, because
 *   the fireworks' depth and the explosion's shape depend on the "3D
 *   version" setting.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  scale(1.3)

  render3dAxes()

  // Reset the launch count every 100 frames.
  if (frameCount() % 100 === 0) launchCount = 0

  if (launchCount < launchesPer100Frames()) {
    Fireworks.create(animation.width, animation.height)

    launchCount++
  }

  Fireworks.reversedForEach((fireworks, i) => {
    fireworks.applyForce(gravity)
    fireworks.run()

    if (fireworks.isDead()) Fireworks.destroy(i)
  })

  // counts.fireworks = Fireworks.count()
  // counts.particles = Fireworks.globalParticleCount()

  // if (counts.fireworks > maxCounts.fireworks)
  //   maxCounts.fireworks = counts.fireworks
  // if (counts.particles > maxCounts.particles)
  //   maxCounts.particles = counts.particles

  // logJson({ counts, maxCounts })
}

/**
 * Draws the indicator shown while the demo is paused.
 *
 * @returns Nothing; the indicator is drawn as a side effect.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

/**
 * Starts the demo.
 *
 * The demo's control panel is created, and the animation frame loop begins.
 *
 * @returns Nothing; the animation frame loop is started as a side effect.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * The demo's control panel is removed from the page, and the animation frame
 * loop ends.
 *
 * @returns Nothing; the animation frame loop is stopped as a side effect.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
