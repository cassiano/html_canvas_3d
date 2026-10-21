import { timesMapN, millis, timesForEachN } from '../utils.ts'
import { quad } from '../primitives.ts'
import { perlin } from '../perlin_noise.ts'
import { $v } from '../vector_3d.ts'
import { floor, map } from '../math_utils.ts'

/**
 * A procedural terrain made of a grid of tiles whose heights vary like
 * Perlin noise.
 *
 * The terrain is a regular grid of rectangular tiles, centered on the
 * origin of the coordinate system. The height of each tile is derived from
 * a noise function, so the terrain keeps morphing as the noise is sampled at
 * different points in time.
 */
export class Terrain {
  /** The number of rows of tiles of the terrain. */
  rows: number
  /** The number of columns of tiles of the terrain. */
  cols: number
  /**
   * The height of each tile, indexed by column and then by row. It is empty
   * until {@link Terrain.calculate} has been called.
   */
  z: number[][] = []

  /**
   * Creates a terrain with the given dimensions and tessellation.
   *
   * @param tileSize - The size of a single tile, in world units.
   * @param width - The total width of the terrain, in world units.
   * @param height - The total height of the terrain, in world units.
   * @param depth - The maximum height variation of the terrain, in world
   *   units.
   * @param smoothiness - The scale of the noise used to shape the terrain.
   *   Smaller values produce rougher terrain.
   */
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

  /**
   * Recomputes the height of every tile of the terrain.
   *
   * The heights are sampled from a noise function evaluated at the given
   * offset, so calling this method again with a different offset produces a
   * different shape. The tile heights are kept within half of the terrain's
   * depth, around its middle.
   *
   * @param zOffset - The position along the noise's third dimension at which
   *   the terrain is sampled.
   * @returns Nothing; the function replaces the terrain's height map in
   *   place.
   */
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

  /**
   * Draws the terrain as a grid of colored tiles.
   *
   * Each tile is drawn as a quadrilateral whose corners are the heights of
   * the four grid points it spans. The color of a tile is derived from its
   * average height, and its hue changes over time.
   *
   * @returns Nothing; the function draws to the canvas.
   * @throws {TypeError} When the terrain has not been calculated yet, because
   *   the heights of the tiles are still unknown.
   */
  render() {
    // Notice how we purposely skip the last row and column.
    timesForEachN([this.cols - 1, this.rows - 1], (col, row) => {
      const x = col * this.tileSize - this.width / 2
      const y = row * this.tileSize - this.height / 2
      const z = this.z[col][row]

      const nextX = x + this.tileSize
      const nextY = y + this.tileSize

      const z00 = z
      const z10 = this.z[col + 1][row]
      const z11 = this.z[col + 1][row + 1]
      const z01 = this.z[col][row + 1]

      const pointA = $v(x, y, z00)
      const pointB = $v(nextX, y, z10)
      const pointC = $v(nextX, nextY, z11)
      const pointD = $v(x, nextY, z01)

      const hue = millis() / 100 // [0, 360]
      const saturation = 100 // [0, 100]
      const lightness = map(
        (z00 + z01 + z10 + z11) / 4, // Average depth.
        -this.depth / 2,
        this.depth / 2,
        0,
        100,
      ) // [0, 100]

      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`

      quad(pointA, pointB, pointC, pointD, {
        isDoubleSided: true,
        color,
      })
    })
  }
}
