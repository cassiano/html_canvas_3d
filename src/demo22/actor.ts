//////////////////////
// AI-assisted code //
//////////////////////

import { min } from '../math_utils.ts'
import { Vector3d } from '../vector_3d.ts'
import {
  COLUMN_COUNT,
  DirectionName,
  DIRECTIONS,
  LEFT,
  NONE,
} from './constants.ts'

/**
 * The base class shared by every maze actor.
 *
 * An actor lives on the tile grid: it occupies a whole cell, and the
 * fractional distance it has covered towards the next cell is tracked
 * separately so movement can be animated smoothly.
 */
export abstract class Actor {
  /** The cell the actor returns to when the round is reset. */
  readonly startPosition: Vector3d
  /** The direction the actor is currently travelling in. */
  dir: DirectionName
  /** The direction the actor will adopt as soon as it can move that way. */
  nextDir: DirectionName
  /** The fraction of the next cell already covered, within `[0, 1)`. */
  progress = 0

  /**
   * Creates an actor.
   *
   * @param position - The cell the actor starts on, in maze tiles.
   * @param speedTilesPerSecond - The actor's travelling speed, in tiles per
   *   second.
   * @param initialDirection - The direction the actor starts travelling in.
   *   Defaults to `LEFT`.
   */
  constructor(
    public position: Vector3d,
    public speedTilesPerSecond: number,
    initialDirection: DirectionName = LEFT,
  ) {
    this.startPosition = position.clone()
    this.dir = initialDirection
    this.nextDir = initialDirection
  }

  /**
   * Returns the actor to its starting cell and clears any partial progress.
   *
   * @param direction - The direction the actor should travel in afterwards.
   *   Defaults to `LEFT`.
   * @returns Nothing; the actor's state is updated in place.
   */
  reset(direction: DirectionName = LEFT) {
    // Clear partial-tile progress while preserving the actor's spawn tile.
    this.position = this.startPosition.clone()
    this.progress = 0
    this.dir = direction
    this.nextDir = direction
  }

  /**
   * Returns the actor's exact position, including the fractional progress
   * towards the next cell.
   *
   * @returns A new vector holding the actor's interpolated position, in maze
   *   tiles.
   */
  positionInTiles(): Vector3d {
    const currentDirection = DIRECTIONS[this.dir]

    return this.position
      .clone()
      .add(currentDirection.clone().mult(this.progress))
  }

  /**
   * Tells whether the actor may travel in the given direction.
   *
   * @param direction - The direction to test.
   * @returns `true` when the neighbouring cell in that direction is
   *   walkable; the neutral `none` direction is never walkable.
   */
  canMoveTo(direction: DirectionName): boolean {
    return direction === NONE ? false : !Actor.isWall(this.nextCell(direction))
  }

  /**
   * Advances the actor along the maze.
   *
   * The actor travels at most one cell per step, so it never skips over an
   * intermediate cell, and it stops as soon as the way ahead is blocked.
   *
   * @param deltaSeconds - The elapsed wall-clock time since the previous
   *   update, in seconds.
   * @param chooseDirectionAtCenter - Optional callback invoked whenever the
   *   actor reaches a cell centre, used to let the game pick the next
   *   direction. A returned `none` direction leaves the current choice
   *   unchanged.
   * @returns Nothing; the actor's position and direction are updated in
   *   place.
   */
  move(
    deltaSeconds: number,
    chooseDirectionAtCenter?: (actor: Actor) => DirectionName,
  ): void {
    // Consume travel in tile-sized chunks so large frames remain deterministic
    // and actors cannot skip collision checks at intermediate tiles.
    let travel = this.speedTilesPerSecond * deltaSeconds

    while (travel > 0) {
      if (this.progress === 0) {
        if (chooseDirectionAtCenter) {
          const selectedDirection = chooseDirectionAtCenter(this)

          if (selectedDirection !== NONE) this.nextDir = selectedDirection
        }

        if (this.canMoveTo(this.nextDir)) this.dir = this.nextDir
        else if (!this.canMoveTo(this.dir)) this.dir = NONE
      }

      if (this.dir === NONE) return

      if (!this.canMoveTo(this.dir)) {
        this.progress = 0
        this.dir = NONE

        return
      }

      const remainingToNextTile = 1 - this.progress
      const step = min(remainingToNextTile, travel)

      this.progress += step
      travel -= step

      if (this.progress >= 1) {
        this.position = this.nextCell(this.dir)
        this.progress = 0
      }
    }
  }

  /**
   * Returns the cell adjacent to the actor's current cell in the given
   * direction.
   *
   * @param direction - The direction to step in.
   * @returns A new vector holding the neighbouring cell, in maze tiles.
   */
  nextCell(direction: DirectionName): Vector3d {
    return Actor.nextCell(this.position, direction)
  }

  // Game installs the maze-specific wall test once; movement helpers remain
  // independent of the Game instance and can be shared by every actor.
  /**
   * Tells whether a cell is a wall.
   *
   * The wall test is installed once through
   * {@link Actor.configureWallCheck}, so the movement helpers stay independent
   * of the game instance and can be shared by every actor.
   *
   * @param _position - The cell to test, in maze tiles.
   * @returns `true` when the cell is a wall. Until a wall check has been
   *   configured, every cell is reported as a wall.
   */
  static isWall(_position: Vector3d): boolean {
    return true
  }

  /**
   * Installs the wall test used by every actor.
   *
   * @param check - A predicate that tells whether a cell is a wall.
   * @returns Nothing; the predicate is stored in the class and used by
   *   {@link Actor.canMoveTo} and {@link Actor.nextCell}.
   */
  static configureWallCheck(check: (position: Vector3d) => boolean): void {
    Actor.isWall = check
  }

  /**
   * Wraps a column index around the horizontal tunnel.
   *
   * @param col - The column index to wrap.
   * @returns The column index after wrapping, always within the maze.
   */
  static wrapCol(col: number): number {
    // Pacman's tunnel connects the first and last columns of the maze.
    if (col < 0) return COLUMN_COUNT - 1
    if (col > COLUMN_COUNT - 1) return 0

    return col
  }

  /**
   * Returns the cell adjacent to a given cell in the given direction.
   *
   * Only horizontal movement can wrap around the maze through the tunnel.
   *
   * @param position - The cell to step from, in maze tiles.
   * @param direction - The direction to step in.
   * @returns A new vector holding the neighbouring cell, in maze tiles.
   */
  static nextCell(position: Vector3d, direction: DirectionName): Vector3d {
    // Movement is grid-based; only horizontal movement can wrap through the
    // tunnel, while the vertical coordinate remains inside the maze.
    const directionVector = DIRECTIONS[direction]

    return position
      .clone()
      .add(directionVector)
      .setX(Actor.wrapCol(position.x + directionVector.x))
  }

  /**
   * Draws the actor on the canvas.
   *
   * @param args - Zero or more callbacks exposing the live game state the
   *   sprite needs, such as the remaining round delay or the current power
   *   mode.
   * @returns Nothing; the actor is drawn onto the canvas.
   */
  abstract render(...args: (() => number)[]): void
}
