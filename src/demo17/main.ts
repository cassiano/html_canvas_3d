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
import { render3dAxes, animation } from '../primitives.ts'
import { demo17Form, show3dAxes } from './demo17_form.ts'
import { createSlider } from '../utils.ts'
import { launchPeriod } from './demo17_form.ts'

// -------------------------------------------------------------------------------------------------

const GRAVITY = 0.03
const gravity = $v(0, -GRAVITY, 0)
const FIREWORKS_PARTICLES_COUNT_RANGE = [10, 1000] as const
const DEFAULT_FIREWORKS_LAUNCH_PERIOD_IN_FRAMES = 12

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo17Form.sliders = {
    minParticles: createSlider({
      label: 'Particles (min)',
      min: 100,
      max: 1000,
      value: FIREWORKS_PARTICLES_COUNT_RANGE[0],
      container: demoControlPanel,
    }),
    maxParticles: createSlider({
      label: 'Particles (max)',
      min: 100,
      max: 10000,
      step: 100,
      value: FIREWORKS_PARTICLES_COUNT_RANGE[1],
      container: demoControlPanel,
    }),
    launchPeriod: createSlider({
      label: 'Launch period',
      min: 1,
      max: 120,
      value: DEFAULT_FIREWORKS_LAUNCH_PERIOD_IN_FRAMES,
      container: demoControlPanel,
    }),
  }

  demo17Form.toggles = {
    show3dAxes: createToggle({
      label: 'Show 3D axes?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
    renderIn3d: createToggle({
      label: '3D (instead of 2D)?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

// const counts = { fireworks: 0, particles: 0 }
// const maxCounts = { fireworks: 0, particles: 0 }

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  if (show3dAxes()) render3dAxes()

  if (frameCount() % launchPeriod() === 0)
    Fireworks.create(animation.width, animation.height)

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

const start = () => {
  createDemoControls()
  startFrameLoop()
}

const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
