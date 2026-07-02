import {
  FPS,
  FPS_LOGGING_FRAME_PERIOD,
  AxesNamesType,
  ORIGIN,
} from '../constants.ts'
import {
  createFrameLoop,
  frameCount,
  fps,
  timesForEach,
  millis,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateX,
} from '../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { PI, floor, map, max, min } from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import { sample, logJson } from '../utils.ts'
import { Tuple } from '../utility_types.ts'
import { translate, rotateY, scale } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 16
const OPACITY = 0.5
const RADIUS = 100
const CIRCLE_SLICES = 16
const TOTAL_ELBOWS = 100
const COLOR = 'peachpuff'

const MAX_RETRY_COUNT = 100

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

const AXES_VISITS_HISTORY = {
  x: (previous: Vector3d) => previous.clone().add(1, 0, 0),
  y: (previous: Vector3d) => previous.clone().add(0, 1, 0),
  z: (previous: Vector3d) => previous.clone().add(0, 0, 1),
  ['-x']: (previous: Vector3d) => previous.clone().sub(1, 0, 0),
  ['-y']: (previous: Vector3d) => previous.clone().sub(0, 1, 0),
  ['-z']: (previous: Vector3d) => previous.clone().sub(0, 0, 1),
}

const breadcrumbs = [ORIGIN]
const axesKeys = Object.keys(AXES_TRANSITIONS)
let previousAxis: AxesNamesType = sample(axesKeys) as AxesNamesType
let nextAxis: AxesNamesType
let stopGeneration = false
const elbowSequence: [AxesNamesType, AxesNamesType][] = []

timesForEach(TOTAL_ELBOWS, () => {
  if (stopGeneration) return null

  breadcrumbs.push(
    AXES_VISITS_HISTORY[previousAxis](breadcrumbs[breadcrumbs.length - 1]),
  )

  let invalidVisit = true
  let retryCount = 0

  while (invalidVisit && retryCount <= MAX_RETRY_COUNT) {
    nextAxis = sample(AXES_TRANSITIONS[previousAxis]) as AxesNamesType
    retryCount++

    invalidVisit =
      breadcrumbs.findIndex(value =>
        value.equals(
          AXES_VISITS_HISTORY[nextAxis](breadcrumbs[breadcrumbs.length - 1]),
        ),
      ) !== -1
  }

  stopGeneration = retryCount > MAX_RETRY_COUNT

  const savedPreviousAxis = previousAxis

  previousAxis = nextAxis

  elbowSequence.push([savedPreviousAxis, nextAxis] as const)
})

logJson({ breadcrumbs })

const visitedCoords = breadcrumbs.reduce(
  (acc, item) => {
    acc[0].push(item.x)
    acc[1].push(item.y)
    acc[2].push(item.z)

    return acc
  },
  [[], [], []] as Tuple<number[], 3>,
)

const averageCoords = $v(
  min(...visitedCoords[0]) +
    (max(...visitedCoords[0]) - min(...visitedCoords[0])) / 2,
  min(...visitedCoords[1]) +
    (max(...visitedCoords[1]) - min(...visitedCoords[1])) / 2,
  min(...visitedCoords[2]) +
    (max(...visitedCoords[2]) - min(...visitedCoords[2])) / 2,
)

const centerCoords = averageCoords.mult(-RADIUS)

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1 / 2)

  rotateX(PI / 4)
  rotateY(-millis() / 2000)

  render3dAxes()

  translate(centerCoords)

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
