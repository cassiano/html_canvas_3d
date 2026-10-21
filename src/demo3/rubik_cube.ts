import { timesMapN } from '../utils.ts'
import { Cubie } from './cubie.ts'

/**
 * A Rubik's cube built from equally sized cubies.
 *
 * The cube arranges its cubies in a regular grid and knows the size of each
 * one of them.
 */
export class RubikCube {
  /**
   * The cubies that make up the cube.
   */
  cubies: Cubie[]

  /**
   * Creates a cube.
   *
   * @param cubieSize - The edge length of a single cubie, in pixels.
   * @param cubiesPerAxis - How many cubies the cube holds along each axis.
   */
  constructor(
    /** The edge length of a single cubie, in pixels. */
    public cubieSize: number,
    /** How many cubies the cube holds along each axis. */
    public cubiesPerAxis: number,
  ) {
    this.cubies = timesMapN(
      [cubiesPerAxis, cubiesPerAxis, cubiesPerAxis],
      (x, y, z) =>
        new Cubie(
          this,
          x - (cubiesPerAxis - 1) / 2,
          y - (cubiesPerAxis - 1) / 2,
          z - (cubiesPerAxis - 1) / 2,
          {
            x: x === cubiesPerAxis - 1,
            y: y === cubiesPerAxis - 1,
            z: z === cubiesPerAxis - 1,
            '-x': x === 0,
            '-y': y === 0,
            '-z': z === 0,
          },
        ),
    ).flat(2)
  }

  /**
   * Draws every cubie of the cube.
   *
   * @returns Nothing; the cubies' faces are queued for rendering.
   * @throws {Error} With the message `demo3Form.sliders should contain a value`
   *   when the demo's sliders have not been created yet.
   * @throws {Error} With the message `demo3Form.toggles should contain a value`
   *   when the demo's toggles have not been created yet.
   */
  render() {
    this.cubies.forEach(cubie => cubie.render())
  }
}
