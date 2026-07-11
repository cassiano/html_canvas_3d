import {
  FPS,
  FPS_LOGGING_FRAME_PERIOD,
  AxesNamesType,
  ORIGIN,
} from '../constants.ts'
import { createFrameLoop, frameCount, fps, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
  rotateX,
  rotate,
} from '../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import {
  PI,
  ceil,
  floor,
  map,
  max,
  min,
  TWO_PI,
  HALF_PI,
  cos,
  sin,
} from '../math_utils.ts'
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
import { AXES } from '../constants.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 12
const OPACITY = 0.25
const RADIUS = 100
const CIRCLE_SLICES = 12
const COLOR = 'peachpuff'

const DEFAULT_BALL_SPEED = 5
const BALL_RADIUS = (RADIUS / 2) * 0.7
const BALL_COLOR = 'white'
const BALL_PATH_COLOR = 'yellow'
const BALL_PATH_LINE_WIDTH = 5

const SPHERICAL_RADIUS_LIMIT = 4
const SPHERICAL_RADIUS_LIMIT_SQUARED = SPHERICAL_RADIUS_LIMIT ** 2

const BALL_PATH_PERPENDICULAR_AXIS_MAPPING: Record<
  AxesNamesType,
  Record<
    string,
    {
      rotationAxis?: AxesNamesType
      transformationFn: (radius: number) => void
      inverted: boolean
    }
  >
> = {
  x: {
    y: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(radius / 2, radius / 2, 0)
        rotateX(PI)
        rotateY(PI)
      },
      inverted: true,
    },
    z: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(radius / 2, 0, radius / 2)
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: true,
    },
    ['-y']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(radius / 2, -radius / 2, 0)
        rotateY(PI)
      },
      inverted: true,
    },
    ['-z']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(radius / 2, 0, -radius / 2)
        rotateX(HALF_PI)
        rotateY(PI)
      },
      inverted: true,
    },
  },

  y: {
    x: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {},
      inverted: false,
    },
    z: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateY(-HALF_PI)
      },
      inverted: false,
    },
    ['-x']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
      },
      inverted: false,
    },
  },

  z: {
    x: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
      },
      inverted: false,
    },
    y: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(0, radius / 2, radius / 2)
        rotateX(PI)
        rotateY(-HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-x']: {
    y: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(-radius / 2, radius / 2, 0)
        rotateX(PI)
      },
      inverted: true,
    },
    z: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, radius / 2)
        rotateX(-HALF_PI)
      },
      inverted: true,
    },
    ['-y']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(-radius / 2, -radius / 2, 0)
      },
      inverted: true,
    },
    ['-z']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, -radius / 2)
        rotateX(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-y']: {
    x: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(PI)
      },
      inverted: false,
    },
    z: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(-HALF_PI)
        rotateZ(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(PI)
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
        rotateX(PI)
      },
      inverted: false,
    },
  },

  ['-z']: {
    x: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
      },
      inverted: false,
    },
    y: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(0, radius / 2, -radius / 2)
        rotateX(PI)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      rotationAxis: 'z',
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
      rotationAxis: '-z',
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, -radius / 2)
        rotateY(-HALF_PI)
      },
      inverted: true,
    },
  },
}

const options: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: COLOR,
}

const AXES_VISITS_HISTORY: Record<AxesNamesType, (prev: Vector3d) => Vector3d> =
  {
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
let nextAxis!: AxesNamesType
let skipGeneration = false
const elbowSequence: [AxesNamesType, AxesNamesType][] = []

while (!skipGeneration) {
  breadcrumbs.push(
    AXES_VISITS_HISTORY[previousAxis](breadcrumbs[breadcrumbs.length - 1]),
  )

  let invalidVisit = true
  const transitions = Object.keys(elbow[previousAxis])

  while (invalidVisit && transitions.length > 0) {
    nextAxis = sample(transitions) as AxesNamesType

    const newLocation = AXES_VISITS_HISTORY[nextAxis](
      breadcrumbs[breadcrumbs.length - 1],
    )

    invalidVisit =
      breadcrumbs.findIndex(value => value.equals(newLocation)) !== -1 ||
      newLocation.magSq() > SPHERICAL_RADIUS_LIMIT_SQUARED

    if (invalidVisit) transitions.splice(transitions.indexOf(nextAxis), 1)
  }

  skipGeneration = transitions.length === 0

  const savedPreviousAxis = previousAxis

  previousAxis = nextAxis

  elbowSequence.push([savedPreviousAxis, nextAxis] as const)
}

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
      const hue = floor(map(i, 0, elbowSequence.length - 1, 0, 360))
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
  const ballSpeedFactor = map(ballSpeed, 1, 10, 1500, 50)

  let entryPoint = ORIGIN

  const currentIndex = floor(millis() / ballSpeedFactor) % elbowSequence.length

  elbowSequence.forEach((sequence, i) => {
    const intermediatePoint = AXES_VISITS_HISTORY[sequence[0]](entryPoint)
    const exitPoint = AXES_VISITS_HISTORY[sequence[1]](intermediatePoint)

    if (i === currentIndex) {
      const mapping =
        BALL_PATH_PERPENDICULAR_AXIS_MAPPING[sequence[0]][sequence[1]]

      const theta = map(
        (millis() % ballSpeedFactor) / ballSpeedFactor,
        0,
        1,
        mapping.inverted ? HALF_PI : 0,
        mapping.inverted ? 0 : HALF_PI,
      )

      isolateTransformations(() => {
        translate(entryPoint.clone().mult(RADIUS / 2))

        mapping.transformationFn(RADIUS)

        translate($v(1 - cos(theta), sin(theta), 0).mult(RADIUS / 2))

        if (mapping.rotationAxis !== undefined)
          rotate(
            (millis() / 3000) * TWO_PI * map(ballSpeed, 1, 10, 1, 2),
            AXES[mapping.rotationAxis],
          )

        sphere(BALL_RADIUS, {
          color: BALL_COLOR,
          longitudeLines: 18,
          latitudeLines: 12,
        })
      })
    }

    if (demo15Form.toggles?.showBallPath.getValue()) {
      line(
        entryPoint.clone().mult(RADIUS / 2),
        intermediatePoint.clone().mult(RADIUS / 2),
        {
          color: BALL_PATH_COLOR,
          lineWidth: BALL_PATH_LINE_WIDTH,
        },
      )
      line(
        intermediatePoint.clone().mult(RADIUS / 2),
        exitPoint.clone().mult(RADIUS / 2),
        {
          color: BALL_PATH_COLOR,
          lineWidth: BALL_PATH_LINE_WIDTH,
        },
      )
    }

    entryPoint = exitPoint
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
