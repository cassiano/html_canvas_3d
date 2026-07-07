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
import { launchesPer100Frames as launchesPer100Frames } from './demo17_form.ts'

// -------------------------------------------------------------------------------------------------

const GRAVITY = 0.03
const gravity = $v(0, -GRAVITY, 0)
const FIREWORKS_PARTICLES_DEFAULT_MIN_COUNT = 100
const FIREWORKS_PARTICLES_DEFAULT_MAX_COUNT = 1000
const DEFAULT_FIREWORKS_LAUNCHES_PER_100_FRAMES = 10

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
    show3dAxes: createToggle({
      label: 'Show 3D axes?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
    renderIn3d: createToggle({
      label: '3D version?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

let launchCount = 0

// const counts = { fireworks: 0, particles: 0 }
// const maxCounts = { fireworks: 0, particles: 0 }

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('black')

  if (show3dAxes()) render3dAxes()

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
