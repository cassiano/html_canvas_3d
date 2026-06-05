import { timesMapN } from '../utils.ts'
import { Cubie } from './cubie.ts'

export class RubikCube {
  cubies: Cubie[]

  constructor(
    public cubieSize: number,
    public cubiesPerAxis: number,
    cubieSpacing: number,
  ) {
    this.cubies = timesMapN(
      [cubiesPerAxis, cubiesPerAxis, cubiesPerAxis],
      (x, y, z) =>
        new Cubie(
          this,
          cubieSpacing,
          x - (cubiesPerAxis - 1) / 2,
          y - (cubiesPerAxis - 1) / 2,
          z - (cubiesPerAxis - 1) / 2,
        ),
    ).flat(2)
  }

  render(rotateCubies = false) {
    this.cubies.forEach(cubie => cubie.render(rotateCubies))
  }
}
