import { FPS, SCREEN_Z_DISTANCE } from './constants'
import {
  createFrameLoop,
  fps,
  millis,
  timesForEach,
  togglePause,
} from './utils'
import {
  animation,
  background,
  isolateTransformations,
  planeXY,
  planeXZ,
  planeYZ,
  processDeferredRenders,
  render3dAxes,
  resetTransformationMatrix,
  rotateX,
  rotateY,
  text2d,
  transform,
  translate,
} from './primitives'
import { $v, Vector } from './vector'
import { abs, PI, sin } from './math_utils'
import { Tuple } from './utility_types'

// -------------------------------------------------------------------------------------------------

const CUBIE_SIZE = 30
const CUBIE_SPACING = 25
const CUBIES_PER_AXIS = 7

const FACES: Record<string, number> = {
  front: 0,
  right: 1,
  back: 2,
  left: 3,
  top: 4,
  bottom: 5,
} as const
const FACE_COLORS: Record<number, string> = {
  [FACES.front]: 'green',
  [FACES.right]: 'red',
  [FACES.back]: 'blue',
  [FACES.left]: 'orange',
  [FACES.top]: 'white',
  [FACES.bottom]: 'yellow',
} as const
const FACE_NORMALS: Record<number, Coord3D> = {
  [FACES.front]: [0, 0, 1], // Normal unit vector towards +z
  [FACES.right]: [1, 0, 0], // Normal unit vector towards +x
  [FACES.back]: [0, 0, -1], // Normal unit vector towards -z
  [FACES.left]: [-1, 0, 0], // Normal unit vector towards -x
  [FACES.top]: [0, 1, 0], // Normal unit vector towards +y
  [FACES.bottom]: [0, -1, 0], // Normal unit vector towards -y
} as const

// -------------------------------------------------------------------------------------------------

export type Coord3D = Tuple<number, 3>

// -------------------------------------------------------------------------------------------------

class RubikCube {
  cubies: Cubie[]

  constructor(
    public cubieSize: number,
    public cubiesPerAxis: number,
  ) {
    this.cubies = []

    for (let x = -(cubiesPerAxis - 1) / 2; x <= (cubiesPerAxis - 1) / 2; x++)
      for (let y = -(cubiesPerAxis - 1) / 2; y <= (cubiesPerAxis - 1) / 2; y++)
        for (
          let z = -(cubiesPerAxis - 1) / 2;
          z <= (cubiesPerAxis - 1) / 2;
          z++
        ) {
          const cubie = new Cubie(this, x, y, z)

          this.cubies.push(cubie)
        }
  }

  render() {
    this.cubies.forEach(cubie => cubie.render())
  }
}

// -------------------------------------------------------------------------------------------------

class Cubie {
  position: Vector
  faces: CubieFace[]

  constructor(
    public cube: RubikCube,
    x: number,
    y: number,
    z: number,
  ) {
    this.position = $v(x, y, z)
    this.faces = []

    timesForEach(6, i => {
      const face = new CubieFace(this, FACE_COLORS[i], FACE_NORMALS[i])

      this.faces.push(face)
    })
  }

  get size() {
    return this.cube.cubieSize
  }

  get center() {
    return this.position.mult(this.size + CUBIE_SPACING, false)
  }

  get distanceFromCamera() {
    return transform(this.center).z + SCREEN_Z_DISTANCE
  }

  render() {
    this.faces.forEach(face => face.render())
  }
}

// -------------------------------------------------------------------------------------------------

class CubieFace {
  normal: Vector

  constructor(
    public cubie: Cubie,
    public color: string,
    normal: Coord3D,
  ) {
    this.normal = $v(...normal)
  }

  get size() {
    return this.cubie.size
  }

  get center() {
    return this.cubie.center.add(this.normal.mult(this.size / 2, false), false)
  }

  get distanceFromCamera() {
    return transform(this.center).z + SCREEN_Z_DISTANCE
  }

  render() {
    isolateTransformations(() => {
      // Move to the face's center.
      translate(this.center)

      if (abs(this.normal.x) === 1)
        planeYZ(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
      else if (abs(this.normal.y) === 1)
        planeXZ(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
      else if (abs(this.normal.z) === 1)
        planeXY(this.size, this.size, {
          color: this.color,
          lineWidth: 2,
          opacity: 1,
        })
    })
  }
}

// -------------------------------------------------------------------------------------------------

animation.onclick = () => togglePause()

const cube = new RubikCube(CUBIE_SIZE, CUBIES_PER_AXIS)

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 5 + sin(millis() / 5000) * 1.5)
  rotateY(PI / 12 + millis() / 3000)

  render3dAxes()

  cube.render()
}

const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

const frame = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    processDeferredRenders()
  },
  onPaused,
  FPS,
)

// Start the animation loop.
requestAnimationFrame(frame)
