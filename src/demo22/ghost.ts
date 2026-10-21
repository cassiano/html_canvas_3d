//////////////////////
// AI-assisted code //
//////////////////////

import { ORIGIN } from '../constants.ts'
import { floor } from '../math_utils.ts'
import { assertIsNotUndefined, millis } from '../utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { Actor } from './actor.ts'
import { DIRECTION_NAMES } from './constants.ts'
import {
  BLINKY_NAME,
  CLYDE_NAME,
  CLYDE_SHY_DISTANCE_TILES,
  DirectionName,
  DIRECTIONS,
  GHOST_RADIUS_RATIO,
  GhostMarker,
  GhostName,
  INKY_LOOKAHEAD_TILES,
  INKY_NAME,
  LEFT,
  NONE,
  PINKY_LOOKAHEAD_TILES,
  PINKY_NAME,
  POWER_WARNING_FLASH_INTERVAL_MS,
  POWER_WARNING_FLASH_MS,
  ROW_COUNT,
  TILE_SIZE,
} from './constants.ts'
import {
  renderCirclePixel,
  renderFilledRectPixel,
  tileToPixel,
} from './render_utils.ts'

/**
 * An enemy that chases Pac-Man around the maze.
 *
 * Each ghost has its own chase personality, its own body color, and its own
 * state for the power mode in which it was last eaten.
 */
export class Ghost extends Actor {
  /**
   * The identifier of the power mode in which this ghost was last eaten.
   *
   * A value of `-1` means the ghost has never been eaten.
   */
  lastEatenPowerModeId = -1
  /** Whether the ghost is currently heading back to the ghost house. */
  isEaten = false

  /**
   * The route the ghost follows home, computed by a single breadth-first
   * search when the trip starts.
   */
  private homingRoute: DirectionName[] = []
  /**
   * The tile the homing route was computed from.
   *
   * It anchors the route so repeated direction queries within one tile
   * (blocked moves, multi-tile frames) replay the same step instead of
   * advancing.
   */
  private homingCell: Vector3d | null = null

  /**
   * Creates a ghost.
   *
   * @param position - The cell the ghost starts on, in maze tiles.
   * @param speedTilesPerSecond - The ghost's travelling speed, in tiles per
   *   second.
   * @param initialDirection - The direction the ghost starts travelling in.
   * @param id - The ghost's stable identifier, used to break ties and to
   *   tell the ghosts apart.
   * @param name - The ghost's display name.
   * @param marker - The maze character that marks the ghost's starting cell.
   * @param color - The CSS color of the ghost's body.
   */
  constructor(
    position: Vector3d,
    speedTilesPerSecond: number,
    initialDirection: DirectionName,
    public readonly id: number,
    public readonly name: GhostName,
    public readonly marker: GhostMarker,
    public readonly color: string,
  ) {
    super(position, speedTilesPerSecond, initialDirection)
  }

  /**
   * Marks the ghost as eaten, so it stops chasing and heads back to the ghost
   * house.
   *
   * @param baseSpeed - The ghost's regular speed, in tiles per second.
   * @param speedMultiplier - The factor applied to `baseSpeed` while the
   *   ghost returns home. Defaults to `1.6`.
   * @returns Nothing; the ghost's state is updated in place.
   */
  markEaten(baseSpeed: number, speedMultiplier = 1.6) {
    this.progress = 0
    this.dir = NONE
    this.nextDir = NONE
    this.speedTilesPerSecond = baseSpeed * speedMultiplier
    this.isEaten = true

    this.clearHomingRoute()
  }

  /**
   * Brings the ghost back to life.
   *
   * @param direction - The direction the ghost resumes travelling in.
   *   Defaults to `LEFT`.
   * @param speed - The ghost's speed, in tiles per second.
   * @returns Nothing; the ghost's state is updated in place.
   */
  revive(direction: DirectionName = LEFT, speed: number) {
    this.isEaten = false
    this.speedTilesPerSecond = speed
    this.dir = direction
    this.nextDir = direction

    this.clearHomingRoute()
  }

  /**
   * Returns the ghost to its starting cell and clears any partial progress.
   *
   * @param direction - The direction the ghost should travel in afterwards.
   *   Defaults to `LEFT`.
   * @returns Nothing; the ghost's state is updated in place.
   */
  reset(direction: DirectionName = LEFT) {
    super.reset(direction)

    this.clearHomingRoute()
  }

  /**
   * Discards the cached route back to the ghost house.
   *
   * @returns Nothing; the cached route is cleared in place.
   */
  private clearHomingRoute() {
    this.homingRoute = []
    this.homingCell = null
  }

  /**
   * Revives the ghost if it has reached the given cell.
   *
   * @param target - The cell to compare the ghost's position with, in maze
   *   tiles.
   * @param direction - The direction the ghost resumes travelling in.
   * @param speed - The ghost's speed, in tiles per second.
   * @returns `true` when the ghost was on the target cell and has been
   *   revived; `false` otherwise.
   */
  tryReviveAt(target: Vector3d, direction: DirectionName, speed: number) {
    if (this.position.notEquals(target)) return false

    this.revive(direction, speed)

    return true
  }

  /**
   * Returns the next step of the route that leads the ghost back to the given
   * target cell.
   *
   * The route is computed once per trip and then replayed step by step.
   *
   * @param target - The cell the ghost should head to, in maze tiles.
   * @returns The direction to travel next, or `none` when the route is
   *   exhausted or unreachable.
   * @throws {TypeError} When the route cannot be reconstructed because an
   *   internal step of the search is missing.
   */
  nextDirectionToTarget(target: Vector3d): DirectionName {
    // The maze never changes while a ghost heads home, so the search runs
    // once per eaten trip; later tile-center queries replay the cached steps.
    if (this.homingCell === null) {
      this.homingRoute = this.findHomingRoute(target)
      this.homingCell = this.position

      return this.homingRoute.shift() ?? NONE
    }

    // A new tile center consumes the next step.
    if (this.homingCell.notEquals(this.position)) {
      this.homingCell = this.position

      return this.homingRoute.shift() ?? NONE
    }

    // this.homingCell === this.position. A repeated query from the same
    // cell (e.g. after a blocked move) still returns the pending step.
    return this.homingRoute[0] ?? NONE
  }

  // Breadth-first search finds the shortest walkable route to the target and
  // reconstructs every step of it up front by backtracking through the
  // predecessor map, so callers never need to run the search again mid-trip.
  /**
   * Finds the shortest walkable route from the ghost's current cell to the
   * target cell.
   *
   * @param target - The cell the ghost should head to, in maze tiles.
   * @returns The ordered list of directions to travel to reach the target;
   *   an empty list when the target is unreachable.
   * @throws {TypeError} When the search encounters an internal state that
   *   cannot be resolved to a position or a step.
   */
  private findHomingRoute(target: Vector3d): DirectionName[] {
    const queue = [this.position]
    const visited = new Set([this.position.toString()])
    const previous = new Map<
      string,
      { position: Vector3d; dir: DirectionName }
    >()

    while (queue.length > 0) {
      const current = queue.shift()
      assertIsNotUndefined(current)

      if (current.equals(target)) break

      // Check all four cardinal directions from the current position. If a direction is
      // walkable and hasn't been visited yet, add it to the queue and record the
      // current position as its predecessor.
      DIRECTION_NAMES.forEach(direction => {
        if (direction === NONE) return

        const next = Actor.nextCell(current, direction)
        const nextKey = next.toString()

        if (visited.has(nextKey) || Actor.isWall(next)) return

        visited.add(nextKey)
        previous.set(nextKey, { position: current, dir: direction })
        queue.push(next)
      })
    }

    const route: DirectionName[] = []
    let stepKey = target.toString()

    while (previous.has(stepKey)) {
      const step = previous.get(stepKey)
      assertIsNotUndefined(step)

      route.unshift(step.dir)
      stepKey = step.position.toString()
    }

    return route
  }

  /**
   * Returns the cell this ghost is aiming for while chasing Pac-Man.
   *
   * Each ghost transforms Pac-Man's state differently, creating distinct
   * chase personalities instead of four identical pursuers.
   *
   * @param pacmanPos - Pac-Man's current position, in maze tiles.
   * @param pacmanFacing - The unit vector pointing in the direction Pac-Man
   *   is travelling.
   * @param ghosts - All the ghosts in play, used by the ghosts whose target
   *   depends on another ghost's position.
   * @returns A new vector holding the cell the ghost should head to, in maze
   *   tiles.
   * @throws {TypeError} When the ghosts depend on Blinky the ghost but Blinky
   *   is not part of the `ghosts` list.
   */
  getChaseTarget(
    pacmanPos: Vector3d,
    pacmanFacing: Vector3d,
    ghosts: Ghost[],
  ): Vector3d {
    const clonedPacmanPos = pacmanPos.clone()

    // Each ghost transforms Pacman's state differently, creating distinct
    // chase personalities instead of four identical pursuers.
    switch (this.name) {
      case BLINKY_NAME:
        return clonedPacmanPos

      case PINKY_NAME: {
        // The original arcade code has an integer overflow when Pac-Man faces
        // up: the Y offset is added to both Y and X axes, making Pinky's
        // target drift four tiles to the left. This bug was never fixed and is
        // now part of the authentic game behaviour.
        const target = clonedPacmanPos.add(
          pacmanFacing.clone().mult(PINKY_LOOKAHEAD_TILES),
        )

        if (pacmanFacing.y < 0) target.x -= PINKY_LOOKAHEAD_TILES

        return target
      }

      case INKY_NAME: {
        const pivot = clonedPacmanPos.add(
          pacmanFacing.clone().mult(INKY_LOOKAHEAD_TILES),
        )
        const blinky = ghosts.find(ghost => ghost.name === BLINKY_NAME)
        assertIsNotUndefined(blinky)

        const blinkyPos = blinky.positionInTiles()

        return pivot.mult(2).sub(blinkyPos)
      }

      case CLYDE_NAME: {
        const deltaToPacman = clonedPacmanPos.sub(this.position)

        if (deltaToPacman.manhattanDist(ORIGIN) <= CLYDE_SHY_DISTANCE_TILES)
          return $v(1, ROW_COUNT - 2) // Scatter target.

        return clonedPacmanPos
      }

      default: {
        const exhaustiveCheck: never = this.name
        return exhaustiveCheck
      }
    }
  }

  /**
   * Draws the ghost on the canvas.
   *
   * The ghost is drawn in its normal color, in the frightened color, or as a
   * pair of floating eyes when it has been eaten.
   *
   * @param getPowerModeRemainingMs - Callback returning the remaining power
   *   mode time, in milliseconds. Defaults to a callback returning `0`.
   * @param getCurrentPowerModeId - Callback returning the identifier of the
   *   current power mode. Defaults to a callback returning `-1`.
   * @returns Nothing; the ghost is drawn onto the canvas.
   */
  render(getPowerModeRemainingMs = () => 0, getCurrentPowerModeId = () => -1) {
    const position = this.positionInTiles()
    const pixel = tileToPixel(position.x + 0.5, position.y + 0.5)
    const radius = TILE_SIZE * GHOST_RADIUS_RATIO
    const left = pixel.x - radius
    const top = pixel.y - radius
    const right = pixel.x + radius
    const bottom = pixel.y + radius
    const eyeOffsetX = radius * 0.35
    const eyeOffsetY = radius * 0.2
    const eyeRadius = radius * 0.33
    const pupilRadius = radius * 0.15
    const lookDirection = DIRECTIONS[this.dir]
    const frightened =
      getPowerModeRemainingMs() > 0 &&
      this.lastEatenPowerModeId !== getCurrentPowerModeId()
    const shouldFlashWarning =
      frightened &&
      getPowerModeRemainingMs() <= POWER_WARNING_FLASH_MS &&
      floor(millis() / POWER_WARNING_FLASH_INTERVAL_MS) % 2 === 0
    const bodyColor = frightened
      ? shouldFlashWarning
        ? '#f5f5f5'
        : '#2f6eff'
      : this.color

    if (this.isEaten) {
      renderCirclePixel(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
        color: 'white',
      })
      renderCirclePixel(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
        color: 'white',
      })
      renderCirclePixel(
        pixel.x - eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
        pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
        pupilRadius,
        { color: '#111' },
      )
      renderCirclePixel(
        pixel.x + eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
        pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
        pupilRadius,
        { color: '#111' },
      )
      return
    }

    renderCirclePixel(pixel.x, top + radius, radius, {
      color: bodyColor,
      noStroke: true,
    })
    renderFilledRectPixel(left, pixel.y, radius * 2, radius, bodyColor)
    renderCirclePixel(left + radius * 0.35, bottom, radius * 0.22, {
      color: bodyColor,
    })
    renderCirclePixel(pixel.x, bottom, radius * 0.22, { color: bodyColor })
    renderCirclePixel(right - radius * 0.35, bottom, radius * 0.22, {
      color: bodyColor,
    })
    renderCirclePixel(pixel.x - eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
      color: 'white',
    })
    renderCirclePixel(pixel.x + eyeOffsetX, pixel.y - eyeOffsetY, eyeRadius, {
      color: 'white',
    })
    renderCirclePixel(
      pixel.x - eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
      pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
      pupilRadius,
      { color: '#111' },
    )
    renderCirclePixel(
      pixel.x + eyeOffsetX + lookDirection.x * eyeRadius * 0.45,
      pixel.y - eyeOffsetY + lookDirection.y * eyeRadius * 0.45,
      pupilRadius,
      { color: '#111' },
    )
  }
}
