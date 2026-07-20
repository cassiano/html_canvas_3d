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
} from '../primitives.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import {
  PI,
  floor,
  map,
  HALF_PI,
  cos,
  sin,
  TWO_PI,
  max,
  min,
  ceil,
} from '../math_utils.ts'
import { ElbowShapeOptions, elbow } from '../elbow_primitives.ts'
import {
  sample,
  createSlider,
  createDemoControlPanel,
  createToggle,
} from '../utils.ts'
import { rotateY, rotateZ, rotate, sphere, scale } from '../primitives.ts'
import { translate, isolateTransformations } from '../primitives.ts'
import { AXES } from '../constants.ts'
import { Tuple } from '../utility_types.ts'

// -------------------------------------------------------------------------------------------------

const CIRCLE_SEGMENTS = 16
const OPACITY = 0.25
const RADIUS = 100
const CIRCLE_SLICES = 16
const COLOR = 'peachpuff'

const DEFAULT_BALL_SPEED = 7
const BALL_RADIUS = (RADIUS / 2) * 0.99
const BALL_COLOR = 'white'

const DEFAULT_VIRTUAL_SPHERE_RADIUS = 3

const MAX_RETRIES = 9999

const BALL_ROTATION_MAPPINGS: Record<
  AxesNamesType,
  Record<
    string,
    {
      transformationFn: (radius: number) => void
      inverted: boolean
    }
  >
> = {
  x: {
    y: {
      transformationFn: (radius: number) => {
        translate(radius / 2, radius / 2, 0)
        rotateX(PI)
        rotateY(PI)
      },
      inverted: true,
    },
    z: {
      transformationFn: (radius: number) => {
        translate(radius / 2, 0, radius / 2)
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: true,
    },
    ['-y']: {
      transformationFn: (radius: number) => {
        translate(radius / 2, -radius / 2, 0)
        rotateY(PI)
      },
      inverted: true,
    },
    ['-z']: {
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
      transformationFn: (_radius: number) => {},
      inverted: false,
    },
    z: {
      transformationFn: (_radius: number) => {
        rotateY(-HALF_PI)
      },
      inverted: false,
    },
    ['-x']: {
      transformationFn: (_radius: number) => {
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
      },
      inverted: false,
    },
  },

  z: {
    x: {
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
      },
      inverted: false,
    },
    y: {
      transformationFn: (radius: number) => {
        translate(0, radius / 2, radius / 2)
        rotateX(PI)
        rotateY(-HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-x']: {
    y: {
      transformationFn: (radius: number) => {
        translate(-radius / 2, radius / 2, 0)
        rotateX(PI)
      },
      inverted: true,
    },
    z: {
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, radius / 2)
        rotateX(-HALF_PI)
      },
      inverted: true,
    },
    ['-y']: {
      transformationFn: (radius: number) => {
        translate(-radius / 2, -radius / 2, 0)
      },
      inverted: true,
    },
    ['-z']: {
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, -radius / 2)
        rotateX(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-y']: {
    x: {
      transformationFn: (_radius: number) => {
        rotateX(PI)
      },
      inverted: false,
    },
    z: {
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(-HALF_PI)
        rotateZ(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      transformationFn: (_radius: number) => {
        rotateX(PI)
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
        rotateX(PI)
      },
      inverted: false,
    },
  },

  ['-z']: {
    x: {
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
      },
      inverted: false,
    },
    y: {
      transformationFn: (radius: number) => {
        translate(0, radius / 2, -radius / 2)
        rotateX(PI)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
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

const ELBOWS_PATHS: Record<
  AxesNamesType,
  (prev: Vector3d, offset?: number) => Vector3d
> = {
  x: (previous: Vector3d, offset = 1) => previous.clone().add(offset, 0, 0),
  y: (previous: Vector3d, offset = 1) => previous.clone().add(0, offset, 0),
  z: (previous: Vector3d, offset = 1) => previous.clone().add(0, 0, offset),
  ['-x']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(offset, 0, 0),
  ['-y']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(0, offset, 0),
  ['-z']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(0, 0, offset),
}

// -------------------------------------------------------------------------------------------------

// Get the canvas container
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

let demoControlPanel: HTMLDivElement | null

type Demo15FormType = {
  sliders?: Record<
    'ballSpeed' | 'virtualSphereRadius',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<
    'applyCentripetalForce' | 'showVirtualSphere' | 'rotateAroundYAxis',
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
    virtualSphereRadius: createSlider({
      label: 'Virtual sphere radius',
      min: 3,
      max: 6,
      value: DEFAULT_VIRTUAL_SPHERE_RADIUS,
      onChange: generateElbows,
      container: demoControlPanel,
    }),
  }

  demo15Form.toggles = {
    applyCentripetalForce: createToggle({
      label: 'Apply centripetal force?',
      value: true,
      showValue: false,
      container: demoControlPanel,
    }),
    showVirtualSphere: createToggle({
      label: 'Show virtual sphere?',
      value: false,
      showValue: false,
      container: demoControlPanel,
    }),
    rotateAroundYAxis: createToggle({
      label: 'Rotate around Y axis?',
      value: true,
      showValue: false,
      container: demoControlPanel,
    }),
  }
}

// -------------------------------------------------------------------------------------------------

type ElbowDetails = {
  from: AxesNamesType
  to: AxesNamesType
  center: Vector3d
  startingPosition: Vector3d
  remainingTransitions: AxesNamesType[]
}

let centerCoords: Vector3d
let maxAxisDistance: number
const elbows: ElbowDetails[] = []

const generateElbows = (virtualSphereRadius: number) => {
  const axesKeys = Object.keys(elbow)

  let skipGeneration = false
  let retries = 0
  let fromAxis: AxesNamesType = sample(axesKeys) as AxesNamesType
  let transitions: AxesNamesType[] | undefined = undefined

  while (!skipGeneration) {
    let validVisit = false
    transitions ??= Object.keys(elbow[fromAxis]) as AxesNamesType[]

    let toAxis: AxesNamesType
    let newCenter: Vector3d

    while (!validVisit && transitions.length > 0) {
      toAxis = sample(transitions) as AxesNamesType

      newCenter = ELBOWS_PATHS[fromAxis](
        elbows.length === 0
          ? ELBOWS_PATHS[fromAxis](ORIGIN, -0.5)
          : elbows[elbows.length - 1].center,
      )

      transitions.splice(transitions.indexOf(toAxis), 1)

      validVisit =
        elbows.findIndex(({ center }) => center.equals(newCenter)) === -1 &&
        newCenter.magSq() <= virtualSphereRadius ** 2
    }

    if (validVisit) {
      elbows.push({
        from: fromAxis,
        to: toAxis!,
        center: newCenter!,
        startingPosition:
          elbows.length === 0
            ? ORIGIN
            : ELBOWS_PATHS[fromAxis](elbows[elbows.length - 1].center, 0.5),
        remainingTransitions: transitions,
      })

      fromAxis = toAxis!
      transitions = undefined
    } else {
      // Remove the last elbow.
      elbows.pop()

      // Locate its previous elbow.
      const previousElbow = elbows[elbows.length - 1]

      // Backtrack to the previous elbow and try a different path.
      fromAxis = previousElbow.to
      transitions = previousElbow.remainingTransitions

      if (++retries > MAX_RETRIES) {
        skipGeneration = true

        console.warn(
          'Max retries reached. Stopping generation of elbows to avoid infinite loop.',
        )
      }
    }
  }

  const visitedCoords = elbows.reduce(
    (acc, { center }) => {
      acc[0].push(center.x)
      acc[1].push(center.y)
      acc[2].push(center.z)

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

  centerCoords = averageCoords.clone().mult(-RADIUS)

  maxAxisDistance = max(xMax - xMin, yMax - yMin, zMax - zMin)
}

generateElbows(DEFAULT_VIRTUAL_SPHERE_RADIUS)

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

  scale(1 / ceil(maxAxisDistance / 6))

  if (demo15Form.toggles?.showVirtualSphere.getValue()) {
    const virtualSphereRadius =
      demo15Form.sliders?.virtualSphereRadius.getValue() ??
      DEFAULT_VIRTUAL_SPHERE_RADIUS

    sphere((virtualSphereRadius + 1 / 2) * RADIUS, {
      opacity: 0.1,
      color: 'lightGray',
    })
  }

  translate(centerCoords)

  isolateTransformations(() => {
    for (let i = 0; i < elbows.length; i++) {
      const { from, to } = elbows[i]
      const hue = floor(map(i, 0, elbows.length - 1, 0, 360))
      const saturation = 100
      const lightness = 75

      // @ts-ignore: source and destination are both typed as `AxisType`.
      elbow[from][to]?.(
        RADIUS,
        { ...options, color: `hsl(${hue}, ${saturation}%, ${lightness}%)` },
        true,
      )
    }
  })

  const ballSpeed =
    demo15Form.sliders?.ballSpeed.getValue() ?? DEFAULT_BALL_SPEED

  // logJson({ elbowsLength: elbows.length })

  const ballSpeedFactor = map(ballSpeed, 1, 10, 1500, 50)
  const currentIndex = floor(millis() / ballSpeedFactor) % elbows.length

  const mapping =
    BALL_ROTATION_MAPPINGS[elbows[currentIndex].from][elbows[currentIndex].to]

  const theta = map(
    (millis() % ballSpeedFactor) / ballSpeedFactor,
    0,
    1,
    mapping.inverted ? HALF_PI : 0,
    mapping.inverted ? 0 : HALF_PI,
  )

  isolateTransformations(() => {
    const entryPoint = elbows[currentIndex].startingPosition
      .clone()
      .mult(RADIUS)

    // Move the ball to the elbows's starting position, which is the entry point of the ball
    // into the elbow.
    translate(entryPoint)

    // Apply the transformation function such that the ball path aligns with the XY plane where
    // the elbow is drawn. This is necessary because the ball path is always drawn in the XY plane.
    mapping.transformationFn(RADIUS)

    // Move the ball to the correct position along the circular path.
    translate($v(1 - cos(theta), sin(theta), 0).mult(RADIUS / 2))

    const applyCentripetalForce =
      demo15Form.toggles?.applyCentripetalForce.getValue()

    // Rotate the ball around the appropriate axis to follow the circular path of the elbow.
    rotate(
      (millis() / 3000) * TWO_PI * map(ballSpeed, 1, 10, 1, 3),
      AXES[
        (mapping.inverted && !applyCentripetalForce) ||
        (!mapping.inverted && applyCentripetalForce)
          ? '-z'
          : 'z'
      ],
    )

    sphere(BALL_RADIUS, {
      color: BALL_COLOR,
      longitudeLines: 18,
      latitudeLines: 12,
    })
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
