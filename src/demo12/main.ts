/////////////////
// Sphere Demo //
/////////////////

import { FPS, FPS_LOGGING_FRAME_FREQUENCY } from '../constants.ts'
import { createFrameLoop, fps, frameCount, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { cos, PI, sin } from '../math_utils.ts'
import { rotateY, isolateTransformations } from '../primitives.ts'
import { rotateX, ring } from '../primitives.ts'

const TOTAL_RINGS = 25
const LARGEST_RING_RADIUS = 250

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_FREQUENCY === 0)
    console.log({ fps: fps() })

  background('lightGray')

  rotateX(sin(millis() / 5000) * 1.5)
  rotateY(-millis() / 2000)

  render3dAxes()

  const highlightedRing = Math.floor(millis() / 100) % TOTAL_RINGS
  let ringIndex = 0

  for (
    let radius = LARGEST_RING_RADIUS;
    radius > 0;
    radius -= 250 / TOTAL_RINGS
  ) {
    isolateTransformations(() => {
      rotateY(millis() / 50)
      rotateX(-PI / 2)

      const hue = millis() / 100
      const saturation = 100
      const lightness =
        ringIndex === highlightedRing ||
        TOTAL_RINGS - ringIndex === highlightedRing
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

const { start, stop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

export { start, stop }
