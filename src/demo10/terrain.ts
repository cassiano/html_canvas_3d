import { timesMapN, millis } from '../utils.ts'
import { map, quadrilateral } from '../primitives.ts'
import { perlin } from '../perlin_noise.ts'
import { $v } from '../vector_3d.ts'
import { floor } from '../math_utils.ts'

export class Terrain {
  rows: number
  cols: number
  z: number[][] = []

  constructor(
    public tileSize: number,
    public width: number,
    public height: number,
    public depth: number,
    public smoothiness: number,
  ) {
    this.rows = floor(height / tileSize)
    this.cols = floor(width / tileSize)
  }

  calculate(zOffset: number) {
    this.z = timesMapN([this.cols, this.rows], (col, row) =>
      map(
        perlin.noise(col / this.smoothiness, row / this.smoothiness, zOffset),
        0,
        1,
        -this.depth / 2,
        this.depth / 2,
      ),
    )
  }

  render() {
    for (let row = 0; row < this.rows - 1; row++) {
      for (let col = 0; col < this.cols - 1; col++) {
        const x = col * this.tileSize - this.width / 2
        const y = row * this.tileSize - this.height / 2
        const z = this.z[col][row]

        const pointA = $v(x, y, z)
        const pointB = $v(x + this.tileSize, y, this.z[col + 1][row])
        const pointC = $v(
          x + this.tileSize,
          y + this.tileSize,
          this.z[col + 1][row + 1],
        )
        const pointD = $v(x, y + this.tileSize, this.z[col][row + 1])

        const hue = millis() / 100 // [0, 360]
        const saturation = 100 // [0, 100]
        const lightness = map(z, -this.depth, this.depth, 0, 110) // [0, 100]

        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`

        quadrilateral(pointA, pointB, pointC, pointD, {
          isDoubleSided: true,
          color,
        })
      }
    }
  }
}
