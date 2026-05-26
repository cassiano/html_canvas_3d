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

const NOISE_DIMENSIONS = [30, 30] as [number, number]

const noise = new PerlinNoise({
  // seed: 123,
  gridSize: NOISE_DIMENSIONS as [number, number], // 2d grid
})

const noiseValues = timesMapN(NOISE_DIMENSIONS, (i, j) => {
  const x = i / NOISE_DIMENSIONS[0]
  const y = j / NOISE_DIMENSIONS[1]

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

  const width = 200
  const height = 200
  const depth = 300

  timesMapN([NOISE_DIMENSIONS[0] - 1, NOISE_DIMENSIONS[1] - 1], (i, j) => {
    const { x: xA, y: yA, z: zA } = noiseValues[i][j]
    const { x: xB, y: yB, z: zB } = noiseValues[i + 1][j]
    const { x: xC, y: yC, z: zC } = noiseValues[i + 1][j + 1]
    const { x: xD, y: yD, z: zD } = noiseValues[i][j + 1]

    const pointA = $v((xA * 2 - 1) * width, (yA * 2 - 1) * height, zA * depth)
    const pointB = $v((xB * 2 - 1) * width, (yB * 2 - 1) * height, zB * depth)
    const pointC = $v((xC * 2 - 1) * width, (yC * 2 - 1) * height, zC * depth)
    const pointD = $v((xD * 2 - 1) * width, (yD * 2 - 1) * height, zD * depth)

    quadrilateral2d(pointA, pointB, pointC, pointD, {
      isDoubleSided: true,
      color: 'white',
    })
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
