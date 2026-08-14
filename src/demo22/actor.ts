import { min } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'

export type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none'

export type ActorEnvironment = {
  directions: Record<DirectionName, Vector3d>
  isWall: (position: Vector3d) => boolean
  wrapCol: (column: number) => number
}

export const nextCell = (
  position: Vector3d,
  direction: DirectionName,
  environment: ActorEnvironment,
): Vector3d => {
  const directionVector = environment.directions[direction]

  return position
    .clone()
    .add(directionVector)
    .setX(environment.wrapCol(position.x + directionVector.x))
}

export const canMove = (
  position: Vector3d,
  direction: DirectionName,
  environment: ActorEnvironment,
): boolean => {
  if (direction === 'none') return false

  return !environment.isWall(nextCell(position, direction, environment))
}

export abstract class Actor {
  startPosition: Vector3d
  dir: DirectionName
  nextDir: DirectionName
  progress: number

  constructor(
    public position: Vector3d,
    public speedTilesPerSecond: number,
    protected environment: ActorEnvironment,
    initialDirection: DirectionName = 'left',
  ) {
    this.startPosition = position.clone()
    this.dir = initialDirection
    this.nextDir = initialDirection
    this.progress = 0
  }

  reset(direction: DirectionName = 'left') {
    this.position = this.startPosition.clone()
    this.progress = 0
    this.dir = direction
    this.nextDir = direction
  }

  positionInTiles(): Vector3d {
    const currentDirection = this.environment.directions[this.dir]

    return this.position
      .clone()
      .add(currentDirection.clone().mult(this.progress))
  }

  canMoveTo(direction: DirectionName): boolean {
    return canMove(this.position, direction, this.environment)
  }

  move(
    deltaSeconds: number,
    chooseDirectionAtCenter?: (actor: Actor) => DirectionName,
  ) {
    let travel = this.speedTilesPerSecond * deltaSeconds

    while (travel > 0) {
      if (this.progress === 0) {
        if (chooseDirectionAtCenter) {
          const selectedDirection = chooseDirectionAtCenter(this)

          if (selectedDirection !== 'none') this.nextDir = selectedDirection
        }

        if (this.canMoveTo(this.nextDir)) this.dir = this.nextDir
        else if (!this.canMoveTo(this.dir)) this.dir = 'none'
      }

      if (this.dir === 'none') return

      if (!this.canMoveTo(this.dir)) {
        this.progress = 0
        this.dir = 'none'

        return
      }

      const remainingToNextTile = 1 - this.progress
      const step = min(remainingToNextTile, travel)

      this.progress += step
      travel -= step

      if (this.progress >= 1) {
        this.position = nextCell(this.position, this.dir, this.environment)
        this.progress = 0
      }
    }
  }

  abstract render(): void
}
