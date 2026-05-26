//////////////////////////
// Rotating Sphere Demo //
//////////////////////////

import { FPS } from '../constants.ts'
import { createFrameLoop, fps, timesMapN, millis } from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateX } from '../primitives.ts'

import { PerlinNoise } from '@arvarus/perlin-noise'
import { rotateZ, quadrilateral2d } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const NOISE_DIMENSIONS = [50, 50] as [number, number]

const GRID_WIDTH = 250
const GRID_HEIGHT = 250
const GRID_DEPTH = 200

const noise = new PerlinNoise({
  // seed: 123,
  gridSize: NOISE_DIMENSIONS, // 2d grid
})

const noiseValues = timesMapN(NOISE_DIMENSIONS, (i, j) => {
  const x = i / NOISE_DIMENSIONS[0] // 0 ≤ x ≤ 1
  const y = j / NOISE_DIMENSIONS[1] // 0 ≤ y ≤ 1

  const k = noise.noise([x, y])

  return { x, y, z: k }
})

const draw = () => {
  // console.log({ fps: fps(), millis: millis(), frameCount: frameCount() })
  console.log({ fps: fps() })

  background('lightGray')

  rotateX(-PI / 2 + PI / 9)
  rotateZ(millis() / 2000)

  render3dAxes()

  for (let i = 0; i < NOISE_DIMENSIONS[0] - 1; i++) {
    for (let j = 0; j < NOISE_DIMENSIONS[1] - 1; j++) {
      const { x: xA, y: yA, z: zA } = noiseValues[i][j]
      const { x: xB, y: yB, z: zB } = noiseValues[i + 1][j]
      const { x: xC, y: yC, z: zC } = noiseValues[i + 1][j + 1]
      const { x: xD, y: yD, z: zD } = noiseValues[i][j + 1]

      const pointA = $v(
        (xA * 2 - 1) * GRID_WIDTH,
        (yA * 2 - 1) * GRID_HEIGHT,
        zA * GRID_DEPTH,
      )
      const pointB = $v(
        (xB * 2 - 1) * GRID_WIDTH,
        (yB * 2 - 1) * GRID_HEIGHT,
        zB * GRID_DEPTH,
      )
      const pointC = $v(
        (xC * 2 - 1) * GRID_WIDTH,
        (yC * 2 - 1) * GRID_HEIGHT,
        zC * GRID_DEPTH,
      )
      const pointD = $v(
        (xD * 2 - 1) * GRID_WIDTH,
        (yD * 2 - 1) * GRID_HEIGHT,
        zD * GRID_DEPTH,
      )

      quadrilateral2d(pointA, pointB, pointC, pointD, {
        isDoubleSided: true,
        color: 'white',
      })
    }
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
