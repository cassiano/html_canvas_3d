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
import {
  rotateY,
  rotateZ,
  rotate,
  sphere,
  scale,
  autoRotationEnabled,
} from '../primitives.ts'
import { translate, isolateTransformations } from '../primitives.ts'
import { AXES } from '../constants.ts'
import { Tuple } from '../utility_types.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The number of segments used to approximate the circular cross-sections.
 */
const CIRCLE_SEGMENTS = 16

/**
 * The fill opacity shared by every elbow of the generated path.
 */
const OPACITY = 0.25

/**
 * The radius of the elbows forming the generated path, in world units.
 */
const RADIUS = 100

/**
 * The number of slices used to approximate the curved cross-sections.
 */
const CIRCLE_SLICES = 16

/**
 * The fill color of the elbows forming the generated path.
 */
const COLOR = 'peachpuff'

/**
 * The speed of the ball travelling along the path, in the initial state.
 */
const DEFAULT_BALL_SPEED = 7

/**
 * The radius of the ball travelling along the path, in world units.
 */
const BALL_RADIUS = (RADIUS / 2) * 0.99

/**
 * The fill color of the ball travelling along the path.
 */
const BALL_COLOR = 'white'

/**
 * The radius of the sphere the generated path is confined to, in elbow widths,
 * in the initial state.
 */
const DEFAULT_VIRTUAL_SPHERE_RADIUS = 3

/**
 * The maximum number of backtracking attempts made while generating a path.
 */
const MAX_RETRIES = 9999

/**
 * The transformations used to align the ball with the elbow it is travelling
 * through.
 *
 * The outer record is keyed by the elbow's entry axis, and the inner one by
 * its exit axis. Every entry holds the transformation that maps the ball's
 * path onto the elbow's plane, plus a flag telling whether that elbow is
 * traversed in the inverted direction.
 */
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
      /**
       * Aligns the ball with the elbow going from the positive X-axis to the
       * positive Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(radius / 2, radius / 2, 0)
        rotateX(PI)
        rotateY(PI)
      },
      inverted: true,
    },
    z: {
      /**
       * Aligns the ball with the elbow going from the positive X-axis to the
       * positive Z-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(radius / 2, 0, radius / 2)
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: true,
    },
    ['-y']: {
      /**
       * Aligns the ball with the elbow going from the positive X-axis to the
       * negative Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(radius / 2, -radius / 2, 0)
        rotateY(PI)
      },
      inverted: true,
    },
    ['-z']: {
      /**
       * Aligns the ball with the elbow going from the positive X-axis to the
       * negative Z-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
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
      /**
       * Aligns the ball with the elbow going from the positive Y-axis to the
       * positive X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {},
      inverted: false,
    },
    z: {
      /**
       * Aligns the ball with the elbow going from the positive Y-axis to the
       * positive Z-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateY(-HALF_PI)
      },
      inverted: false,
    },
    ['-x']: {
      /**
       * Aligns the ball with the elbow going from the positive Y-axis to the
       * negative X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      /**
       * Aligns the ball with the elbow going from the positive Y-axis to the
       * negative Z-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
      },
      inverted: false,
    },
  },

  z: {
    x: {
      /**
       * Aligns the ball with the elbow going from the positive Z-axis to the
       * positive X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
      },
      inverted: false,
    },
    y: {
      /**
       * Aligns the ball with the elbow going from the positive Z-axis to the
       * positive Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(0, radius / 2, radius / 2)
        rotateX(PI)
        rotateY(-HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      /**
       * Aligns the ball with the elbow going from the positive Z-axis to the
       * negative X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
      /**
       * Aligns the ball with the elbow going from the positive Z-axis to the
       * negative Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-x']: {
    y: {
      /**
       * Aligns the ball with the elbow going from the negative X-axis to the
       * positive Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(-radius / 2, radius / 2, 0)
        rotateX(PI)
      },
      inverted: true,
    },
    z: {
      /**
       * Aligns the ball with the elbow going from the negative X-axis to the
       * positive Z-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, radius / 2)
        rotateX(-HALF_PI)
      },
      inverted: true,
    },
    ['-y']: {
      /**
       * Aligns the ball with the elbow going from the negative X-axis to the
       * negative Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(-radius / 2, -radius / 2, 0)
      },
      inverted: true,
    },
    ['-z']: {
      /**
       * Aligns the ball with the elbow going from the negative X-axis to the
       * negative Z-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(-radius / 2, 0, -radius / 2)
        rotateX(HALF_PI)
      },
      inverted: true,
    },
  },

  ['-y']: {
    x: {
      /**
       * Aligns the ball with the elbow going from the negative Y-axis to the
       * positive X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(PI)
      },
      inverted: false,
    },
    z: {
      /**
       * Aligns the ball with the elbow going from the negative Y-axis to the
       * positive Z-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, radius / 2)
        rotateY(-HALF_PI)
        rotateZ(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      /**
       * Aligns the ball with the elbow going from the negative Y-axis to the
       * negative X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(PI)
        rotateY(PI)
      },
      inverted: false,
    },
    ['-z']: {
      /**
       * Aligns the ball with the elbow going from the negative Y-axis to the
       * negative Z-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateY(HALF_PI)
        rotateX(PI)
      },
      inverted: false,
    },
  },

  ['-z']: {
    x: {
      /**
       * Aligns the ball with the elbow going from the negative Z-axis to the
       * positive X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(-HALF_PI)
      },
      inverted: false,
    },
    y: {
      /**
       * Aligns the ball with the elbow going from the negative Z-axis to the
       * positive Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(0, radius / 2, -radius / 2)
        rotateX(PI)
        rotateY(HALF_PI)
      },
      inverted: true,
    },
    ['-x']: {
      /**
       * Aligns the ball with the elbow going from the negative Z-axis to the
       * negative X-axis.
       *
       * @param _radius - The radius of the elbow the ball is travelling
       *   through. It is not used by this transformation.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (_radius: number) => {
        rotateX(HALF_PI)
        rotateZ(PI)
      },
      inverted: false,
    },
    ['-y']: {
      /**
       * Aligns the ball with the elbow going from the negative Z-axis to the
       * negative Y-axis.
       *
       * @param radius - The radius of the elbow the ball is travelling
       *   through.
       * @returns Nothing; the scene's transformation state is changed.
       */
      transformationFn: (radius: number) => {
        translate(0, -radius / 2, -radius / 2)
        rotateY(-HALF_PI)
      },
      inverted: true,
    },
  },
}

/**
 * The shape options shared by every elbow of the generated path.
 */
const options: ElbowShapeOptions = {
  circleSegments: CIRCLE_SEGMENTS,
  opacity: OPACITY,
  elbowCircleSlices: CIRCLE_SLICES,
  color: COLOR,
}

/**
 * The functions used to move from one elbow's center to the next one.
 *
 * The outer record is keyed by the axis the path is travelling along, and
 * every function returns the center of the next elbow.
 */
const ELBOWS_PATHS: Record<
  AxesNamesType,
  (prev: Vector3d, offset?: number) => Vector3d
> = {
  /**
   * Moves the path towards the positive X-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the X-axis.
   * @returns The center of the next elbow.
   */
  x: (previous: Vector3d, offset = 1) => previous.clone().add(offset, 0, 0),
  /**
   * Moves the path towards the positive Y-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the Y-axis.
   * @returns The center of the next elbow.
   */
  y: (previous: Vector3d, offset = 1) => previous.clone().add(0, offset, 0),
  /**
   * Moves the path towards the positive Z-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the Z-axis.
   * @returns The center of the next elbow.
   */
  z: (previous: Vector3d, offset = 1) => previous.clone().add(0, 0, offset),
  /**
   * Moves the path towards the negative X-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the X-axis.
   * @returns The center of the next elbow.
   */
  ['-x']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(offset, 0, 0),
  /**
   * Moves the path towards the negative Y-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the Y-axis.
   * @returns The center of the next elbow.
   */
  ['-y']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(0, offset, 0),
  /**
   * Moves the path towards the negative Z-axis.
   *
   * @param previous - The center of the elbow being left behind.
   * @param offset - The distance to the next center, along the Z-axis.
   * @returns The center of the next elbow.
   */
  ['-z']: (previous: Vector3d, offset = 1) =>
    previous.clone().sub(0, 0, offset),
}

// -------------------------------------------------------------------------------------------------

// Get the canvas container
/**
 * The DOM element hosting the demo's canvas and control panel.
 *
 * It is looked up eagerly, so that the demo fails fast with a clear message
 * when the expected element is missing from the page.
 *
 * @throws {Error} When the `canvas-container` element is not present in the
 *   document.
 */
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The panel hosting the demo's control widgets, while the demo is running.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * The demo's control widgets, grouped by the kind of control.
 */
type Demo15FormType = {
  /** The slider controlling the ball's speed, and the radius of the sphere shown. */
  sliders?: Record<
    'ballSpeed' | 'virtualSphereRadius',
    ReturnType<typeof createSlider>
  >
  /** The toggles controlling the centripetal force and the virtual sphere. */
  toggles?: Record<
    'applyCentripetalForce' | 'showVirtualSphere',
    ReturnType<typeof createToggle>
  >
}

/**
 * The demo's control widgets.
 *
 * The object is populated when the demo starts, and its widgets are removed
 * from the page when the demo stops.
 */
export const demo15Form: Demo15FormType = {}

/**
 * Creates the demo's control panel and populates {@link demo15Form}.
 *
 * @returns Nothing; the created widgets are stored in {@link demo15Form}.
 */
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
  }
}

// -------------------------------------------------------------------------------------------------

/**
 * The description of a single elbow of the generated path.
 */
type ElbowDetails = {
  /** The axis the ball enters the elbow through. */
  from: AxesNamesType
  /** The axis the ball leaves the elbow through. */
  to: AxesNamesType
  /** The center of the elbow, in world units. */
  center: Vector3d
  /** The point where the ball enters the elbow, in world units. */
  startingPosition: Vector3d
  /** The exit axes that were still available when the elbow was created. */
  remainingTransitions: AxesNamesType[]
}

/**
 * The offset applied to the scene, so that the generated path is centered on
 * the screen.
 */
let centerCoords: Vector3d

/**
 * The largest distance between two points of the generated path, along any
 * of the axes.
 */
let maxAxisDistance: number

/**
 * The elbows of the generated path, in the order the ball travels through
 * them.
 */
const elbows: ElbowDetails[] = []

/**
 * Generates a random path of elbows confined to a virtual sphere.
 *
 * The path is built by repeatedly picking a random exit axis for the current
 * elbow, keeping only the moves that reach a center not visited yet and
 * still inside the virtual sphere. When a move is not viable, the generator
 * backtracks to the previous elbow and tries another exit axis.
 *
 * @param virtualSphereRadius - The radius of the sphere the path is confined
 *   to, in elbow widths.
 * @returns Nothing; the generated path is stored in {@link elbows}, and the
 *   scene's framing in {@link centerCoords} and {@link maxAxisDistance}.
 * @throws {TypeError} When the generator has to backtrack past the first
 *   elbow of the path, leaving no previous elbow to continue from.
 */
const generateElbows = (virtualSphereRadius: number) => {
  const axesKeys = Object.keys(elbow)

  elbows.length = 0

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

// Generate the initial path, so that the demo has something to display.
generateElbows(DEFAULT_VIRTUAL_SPHERE_RADIUS)

// -------------------------------------------------------------------------------------------------

/**
 * Draws a single frame of the generated path and of the ball travelling
 * along it.
 *
 * The path is scaled and centered on the screen, and the ball advances from
 * one elbow to the next, spinning while it crosses each one of them.
 *
 * @returns Nothing; the shapes are queued for rendering as a side effect.
 * @throws {TypeError} When the generated path is empty, so that the ball has
 *   no elbow to travel through.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  background('lightGray')

  scale(1.3)
  rotateX(PI / 4)

  if (autoRotationEnabled) rotateY(-millis() / 2000)
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

/**
 * Draws the label shown while the demo is paused.
 *
 * @returns Nothing; the label is drawn into the canvas as a side effect.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

/**
 * Creates the demo's frame loop and exposes its controls.
 *
 * The destructured `startFrameLoop` function begins the animation frame loop
 * that renders the scene, while `stopFrameLoop` ends it.
 *
 * @returns Nothing; `startFrameLoop` and `stopFrameLoop` control the demo's
 *   frame loop.
 */
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
 * Creates the control panel and begins the animation frame loop.
 *
 * @returns Nothing; the demo runs until {@link stop} is called.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * Removes the control panel from the page and ends the animation frame loop.
 *
 * @returns Nothing; the demo's control panel is removed as a side effect.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
