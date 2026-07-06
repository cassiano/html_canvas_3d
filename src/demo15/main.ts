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
import { PI, ceil, floor, map, max, min, TWO_PI } from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import {
  sample,
  createSlider,
  createDemoControlPanel,
  createToggle,
} from '../utils.ts'
import { Tuple } from '../utility_types.ts'
import { sphere, line, rotateY, rotateZ } from '../primitives.ts'
import { translate, scale, isolateTransformations } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 12
const OPACITY = 0.25
const RADIUS = 100
const CIRCLE_SLICES = 8
const TOTAL_ELBOWS = 50
const COLOR = 'peachpuff'

const DEFAULT_BALL_SPEED = 5
const BALL_RADIUS = (RADIUS / 2) * 0.7
const BALL_COLOR = 'white'
const BALL_PATH_COLOR = 'yellow'
const BALL_PATH_LINE_WIDTH = 5

const options: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: COLOR,
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
const axesKeys = Object.keys(elbow)
let previousAxis: AxesNamesType = sample(axesKeys) as AxesNamesType
let nextAxis: AxesNamesType
let skipGeneration = false
const elbowSequence: [AxesNamesType, AxesNamesType][] = []

timesForEach(TOTAL_ELBOWS, () => {
  if (skipGeneration) return

  breadcrumbs.push(
    AXES_VISITS_HISTORY[previousAxis](breadcrumbs[breadcrumbs.length - 1]),
  )

  let invalidVisit = true
  const transitions = Object.keys(elbow[previousAxis])

  while (invalidVisit && transitions.length > 0) {
    nextAxis = sample(transitions) as AxesNamesType

    invalidVisit =
      breadcrumbs.findIndex(value =>
        value.equals(
          AXES_VISITS_HISTORY[nextAxis](breadcrumbs[breadcrumbs.length - 1]),
        ),
      ) !== -1

    if (invalidVisit) transitions.splice(transitions.indexOf(nextAxis), 1)
  }

  skipGeneration = transitions.length === 0

  const savedPreviousAxis = previousAxis

  previousAxis = nextAxis

  elbowSequence.push([savedPreviousAxis, nextAxis] as const)
})

const visitedCoords = breadcrumbs.reduce(
  (acc, item) => {
    acc[0].push(item.x)
    acc[1].push(item.y)
    acc[2].push(item.z)

    return acc
  },
  [[], [], []] as Tuple<number[], 3>,
)

const [xMax, xMin] = [max(...visitedCoords[0]), min(...visitedCoords[0])]
const [yMax, yMin] = [max(...visitedCoords[1]), min(...visitedCoords[1])]
const [zMax, zMin] = [max(...visitedCoords[2]), min(...visitedCoords[2])]

const averageCoords = $v(
  (xMax + xMin) / 2,
  (yMax + yMin) / 2,
  (zMax + zMin) / 2,
)

const centerCoords = averageCoords.clone().mult(-RADIUS)

const maxAxisDistance = max(xMax - xMin, yMax - yMin, zMax - zMin)

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type Demo15FormType = {
  sliders?: Record<'ballSpeed', ReturnType<typeof createSlider>>
  toggles?: Record<
    'showBallPath' | 'rotateAroundYAxis',
    ReturnType<typeof createToggle>
  >
}

export const demo15Form: Demo15FormType = {}

const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demo15Form.sliders = {
    ballSpeed: createSlider({
      label: 'Ball speed',
      min: 1,
      max: 10,
      value: DEFAULT_BALL_SPEED,
      container: demoControlPanel,
    }),
  }

  demo15Form.toggles = {
    showBallPath: createToggle({
      label: 'Show ball path?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
    rotateAroundYAxis: createToggle({
      label: 'Rotate around Y-axis?',
      value: true,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  rotateX(PI / 4)

  if (demo15Form.toggles?.rotateAroundYAxis.getValue())
    rotateY(-millis() / 2000)
  else rotateY(PI / 6)

  render3dAxes()

  scale(1 / ceil(maxAxisDistance / 8))

  translate(centerCoords)

  isolateTransformations(() => {
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
  })

  const ballSpeed =
    demo15Form.sliders?.ballSpeed.getValue() ?? DEFAULT_BALL_SPEED
  const ballSpeedFactor = map(ballSpeed, 1, 10, 500, 50)

  let previousPoint = ORIGIN

  const currentIndex =
    floor(millis() / ballSpeedFactor) % (elbowSequence.length * 2)

  elbowSequence.forEach((sequence, i) => {
    const nextPoint1 = AXES_VISITS_HISTORY[sequence[0]](previousPoint)
    const nextPoint2 = AXES_VISITS_HISTORY[sequence[1]](nextPoint1)

    if (i === floor(currentIndex / 2)) {
      isolateTransformations(() => {
        if (currentIndex % 2 === 0) {
          translate(
            previousPoint
              .lerp(nextPoint1, (millis() % ballSpeedFactor) / ballSpeedFactor)
              .clone()
              .mult(RADIUS / 2),
          )
        } else {
          translate(
            nextPoint1
              .lerp(nextPoint2, (millis() % ballSpeedFactor) / ballSpeedFactor)
              .clone()
              .mult(RADIUS / 2),
          )
        }

        rotateX(((millis() / 2000) * TWO_PI * ballSpeed) / 5)
        rotateY(((millis() / 2000) * TWO_PI * ballSpeed) / 5)
        rotateZ(((millis() / 2000) * TWO_PI * ballSpeed) / 5)

        sphere(BALL_RADIUS, {
          color: BALL_COLOR,
          longitudeLines: 18,
          latitudeLines: 9,
        })
      })
    }

    if (demo15Form.toggles?.showBallPath.getValue()) {
      line(
        previousPoint.clone().mult(RADIUS / 2),
        nextPoint1.clone().mult(RADIUS / 2),
        {
          color: BALL_PATH_COLOR,
          lineWidth: BALL_PATH_LINE_WIDTH,
        },
      )
      line(
        nextPoint1.clone().mult(RADIUS / 2),
        nextPoint2.clone().mult(RADIUS / 2),
        {
          color: BALL_PATH_COLOR,
          lineWidth: BALL_PATH_LINE_WIDTH,
        },
      )
    }

    previousPoint = nextPoint2
  })
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
