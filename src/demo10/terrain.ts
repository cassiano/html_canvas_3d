import { timesMapN } from '../utils.ts'
import { map, quadrilateral2d } from '../primitives.ts'
import { perlin } from '../perlin_noise.ts'
import { $v } from '../vector_3d.ts'
import { floor } from '../math_utils.ts'

export class Terrain {
  rows: number
  cols: number
  z: number[][]

  constructor(
    public cellSize: number,
    public terrainWidth: number,
    public terrainHeight: number,
    public maxDepth: number,
    public smoothiness: number,
  ) {
    this.rows = floor(terrainHeight / cellSize)
    this.cols = floor(terrainWidth / cellSize)

    this.z = []
  }

  calculate(zOffset: number) {
    this.z = timesMapN([this.cols, this.rows], (col, row) =>
      map(
        perlin.noise(col / this.smoothiness, row / this.smoothiness, zOffset),
        0,
        1,
        -this.maxDepth,
        this.maxDepth,
      ),
    )
  }

  render() {
    for (let row = 0; row < this.rows - 1; row++) {
      for (let col = 0; col < this.cols - 1; col++) {
        const x = col * this.cellSize - this.terrainWidth / 2
        const y = row * this.cellSize - this.terrainHeight / 2
        const z = this.z[col][row]

        const pointA = $v(x, y, z)
        const pointB = $v(x + this.cellSize, y, this.z[col + 1][row])
        const pointC = $v(
          x + this.cellSize,
          y + this.cellSize,
          this.z[col + 1][row + 1],
        )
        const pointD = $v(x, y + this.cellSize, this.z[col][row + 1])

        quadrilateral2d(pointA, pointB, pointC, pointD, {
          isDoubleSided: true,
          color: col % 2 === 0 ? 'white' : 'red',
        })
      }
    }
  }
}
