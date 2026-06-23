///////////////////////////////
// UFO (Flying Saurcer) Demo //
///////////////////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import {
  createFrameLoop,
  fps,
  frameCount,
  millis,
  createDemoControlPanel,
  createSlider,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  isolateTransformations,
  rotateX,
  ring,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { cos, sin, HALF_PI } from '../math_utils.ts'

// -------------------------------------------------------------------------------------------------

const DEFAULT_TOTAL_RINGS = 25
const LARGEST_RING_RADIUS = 250

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type Demo12FormType = {
  sliders?: Record<'totalRings', ReturnType<typeof createSlider>>
}

export const demo12Form: Demo12FormType = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo12Form.sliders = {
    totalRings: createSlider({
      label: 'Total rings',
      min: 1,
      max: 100,
      value: DEFAULT_TOTAL_RINGS,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  if (!demo12Form.sliders) return

  const { totalRings } = demo12Form.sliders

  background('lightGray')

  rotateX(sin(millis() / 5000) * 1.5)
  rotateY(-millis() / 2000)

  render3dAxes()

  const highlightedRing = Math.floor(millis() / 100) % totalRings.getValue()
  let ringIndex = 0

  for (
    let radius = LARGEST_RING_RADIUS;
    radius > 0;
    radius -= 250 / totalRings.getValue()
  ) {
    isolateTransformations(() => {
      rotateY(millis() / 50)
      rotateX(-HALF_PI)

      const hue = millis() / 100
      const saturation = 100
      const lightness =
        ringIndex === highlightedRing ||
        totalRings.getValue() - ringIndex === highlightedRing
          ? 100
          : ((cos(millis() / 5000) + 1) / 2) * 40 + 30

      ring(radius, 140 - radius / 2, {
        isDoubleSided: true,
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      })
    })

    ringIndex++
  }
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
