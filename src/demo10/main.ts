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
  project,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import { rotateX } from '../primitives.ts'

import { PerlinNoise } from '@arvarus/perlin-noise'
import { rotateZ, quadrilateral2d } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

const NOISE_DIMENSIONS = [64, 64] as [number, number]

const GRID = { width: 500, height: 500, depth: 500 }

const noise = new PerlinNoise({
  // seed: 123,
  gridSize: NOISE_DIMENSIONS, // 2d grid
})

const randomCoords = timesMapN(NOISE_DIMENSIONS, (i, j) => {
  const x = i / NOISE_DIMENSIONS[0] // 0 < x < 1
  const y = j / NOISE_DIMENSIONS[1] // 0 < y < 1

  const k = noise.noise([x, y]) // -1 < x < 1

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
      const { x: xA, y: yA, z: zA } = randomCoords[i][j]
      const { x: xB, y: yB, z: zB } = randomCoords[i + 1][j]
      const { x: xC, y: yC, z: zC } = randomCoords[i + 1][j + 1]
      const { x: xD, y: yD, z: zD } = randomCoords[i][j + 1]

      const pointA = $v(
        project(xA, 0, 1, -GRID.width / 2, GRID.width / 2),
        project(yA, 0, 1, -GRID.height / 2, GRID.height / 2),
        (zA * GRID.depth) / 2,
      )
      const pointB = $v(
        project(xB, 0, 1, -GRID.width / 2, GRID.width / 2),
        project(yB, 0, 1, -GRID.height / 2, GRID.height / 2),
        (zB * GRID.depth) / 2,
      )
      const pointC = $v(
        project(xC, 0, 1, -GRID.width / 2, GRID.width / 2),
        project(yC, 0, 1, -GRID.height / 2, GRID.height / 2),
        (zC * GRID.depth) / 2,
      )
      const pointD = $v(
        project(xD, 0, 1, -GRID.width / 2, GRID.width / 2),
        project(yD, 0, 1, -GRID.height / 2, GRID.height / 2),
        (zD * GRID.depth) / 2,
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
