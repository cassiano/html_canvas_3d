import { Cubie } from './cubie.ts'

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
    this.cubies.forEach(cubie => cubie.render())
  }
}
