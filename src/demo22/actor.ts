import { min } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'
import { COLUMN_COUNT, DIRECTIONS } from './constants.ts'

export type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none'

export let isWall = (_position: Vector3d): boolean => true

export function configureWallCheck(check: (position: Vector3d) => boolean) {
  isWall = check
}

export const wrapCol = (col: number): number => {
  if (col < 0) return COLUMN_COUNT - 1
  if (col >= COLUMN_COUNT) return 0

  return col
}

export const nextCell = (
  position: Vector3d,
  direction: DirectionName,
): Vector3d => {
  const directionVector = DIRECTIONS[direction]

  return position
    .clone()
    .add(directionVector)
    .setX(wrapCol(position.x + directionVector.x))
}

export const canMove = (
  position: Vector3d,
  direction: DirectionName,
): boolean => {
  if (direction === 'none') return false

  return !isWall(nextCell(position, direction))
}

export abstract class Actor {
  readonly startPosition: Vector3d
  dir: DirectionName
  nextDir: DirectionName
  progress: number

  constructor(
    public position: Vector3d,
    public speedTilesPerSecond: number,
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
    const currentDirection = DIRECTIONS[this.dir]

    return this.position
      .clone()
      .add(currentDirection.clone().mult(this.progress))
  }

  canMoveTo(direction: DirectionName): boolean {
    return canMove(this.position, direction)
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
        this.position = nextCell(this.position, this.dir)
        this.progress = 0
      }
    }
  }

  abstract render(...args: (() => number)[]): void
}
