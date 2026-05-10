import { Cubie } from './cubie'
import { Tuple } from './utility_types'

export type Coord3D = Tuple<number, 3>

export class RubikCube {
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
    const sortedCubies = this.cubies.toSorted(
      (left, right) => right.distanceFromCamera - left.distanceFromCamera,
    )

    sortedCubies.forEach(cubie => cubie.render())
  }
}
