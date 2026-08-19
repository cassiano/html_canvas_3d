import { min } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'
import {
  COLUMN_COUNT,
  DirectionName,
  DIRECTIONS,
  DIRECTION_MAP,
} from './constants.ts'

// Game installs the maze-specific wall test once; movement helpers remain
// independent of the Game instance and can be shared by every actor.
export let isWall = (_position: Vector3d): boolean => true

export function configureWallCheck(check: (position: Vector3d) => boolean) {
  isWall = check
}

export const wrapCol = (col: number): number => {
  // Pacman's tunnel connects the first and last columns of the maze.
  if (col < 0) return COLUMN_COUNT - 1
  if (col >= COLUMN_COUNT) return 0

  return col
}

export const nextCell = (
  position: Vector3d,
  direction: DirectionName,
): Vector3d => {
  // Movement is grid-based; only horizontal movement can wrap through the
  // tunnel, while the vertical coordinate remains inside the maze.
  const directionVector = DIRECTIONS[direction]

  return position
    .clone()
    .add(directionVector)
    .setX(wrapCol(position.x + directionVector.x))
}

export abstract class Actor {
  readonly startPosition: Vector3d
  dir: DirectionName
  nextDir: DirectionName
  progress: number

  constructor(
    public position: Vector3d,
    public speedTilesPerSecond: number,
    initialDirection: DirectionName = DIRECTION_MAP.left,
  ) {
    this.startPosition = position.clone()
    this.dir = initialDirection
    this.nextDir = initialDirection
    this.progress = 0
  }

  reset(direction: DirectionName = DIRECTION_MAP.left) {
    // Clear partial-tile progress while preserving the actor's spawn tile.
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
    return direction === DIRECTION_MAP.none
      ? false
      : !isWall(nextCell(this.position, direction))
  }

  move(
    deltaSeconds: number,
    chooseDirectionAtCenter?: (actor: Actor) => DirectionName,
  ) {
    // Consume travel in tile-sized chunks so large frames remain deterministic
    // and actors cannot skip collision checks at intermediate tiles.
    let travel = this.speedTilesPerSecond * deltaSeconds

    while (travel > 0) {
      if (this.progress === 0) {
        if (chooseDirectionAtCenter) {
          const selectedDirection = chooseDirectionAtCenter(this)

          if (selectedDirection !== DIRECTION_MAP.none)
            this.nextDir = selectedDirection
        }

        if (this.canMoveTo(this.nextDir)) this.dir = this.nextDir
        else if (!this.canMoveTo(this.dir)) this.dir = DIRECTION_MAP.none
      }

      if (this.dir === DIRECTION_MAP.none) return

      if (!this.canMoveTo(this.dir)) {
        this.progress = 0
        this.dir = DIRECTION_MAP.none

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
