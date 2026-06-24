////////////////////////////////
// Colorful Random Snake Demo //
////////////////////////////////

import { FPS, FPS_LOGGING_FRAME_PERIOD, AxesNamesType } from '../constants.ts'
import { createFrameLoop, millis, frameCount, fps } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateY,
  rotateX,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI, floor, map } from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import { sample, timesMap } from '../utils.ts'
import { Tuple } from '../utility_types.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5
const RADIUS = 100
const CIRCLE_SLICES = 16
const TOTAL_ELBOWS = 25
const COLOR = 'peachpuff'

const options: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: COLOR,
}

// 24 possible axes transitions.
const AXES_TRANSITIONS: Record<AxesNamesType, Tuple<AxesNamesType, 4>> = {
  x: ['y', '-y', 'z', '-z'],
  y: ['x', '-x', 'z', '-z'],
  z: ['x', '-x', 'y', '-y'],
  ['-x']: ['y', '-y', 'z', '-z'],
  ['-y']: ['x', '-x', 'z', '-z'],
  ['-z']: ['x', '-x', 'y', '-y'],
}

const axesKeys = Object.keys(AXES_TRANSITIONS)
let previousAxis: AxesNamesType = sample(axesKeys) as AxesNamesType

const elbowSequence = timesMap(TOTAL_ELBOWS, () => {
  const nextAxis = sample(AXES_TRANSITIONS[previousAxis]) as AxesNamesType
  const savedPreviousAxis = previousAxis

  previousAxis = nextAxis

  return [savedPreviousAxis, nextAxis] as const
})

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  elbowSequence.forEach(([source, destination], i) => {
    const hue = floor(map(i, 0, TOTAL_ELBOWS - 1, 0, 360))
    const saturation = 100
    const lightness = 75

    // @ts-ignore: source and destination are both typed as `AxisType`.
    elbow[source][destination]?.(
      RADIUS,
      { ...options, color: `hsl(${hue}, ${saturation}%, ${lightness}%)` },
      true,
    )
  })
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
