//////////////////////
// AI-assisted code //
//////////////////////

import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import { abs, floor, max, min, random } from '../math_utils.ts'
import { animation, background, text2d } from '../primitives.ts'
import {
  fps,
  frameCount,
  millis,
  timesForEach,
  timesForEachN,
} from '../utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { Actor } from './actor.ts'
import {
  playCherryPickup,
  playDeath,
  playGhostEaten,
  playWaka,
  resumeAudio,
  startPowerSirenLoop,
  stopPowerSirenLoop,
} from './audio.ts'
import {
  ATTRACT_POWER_MODE_MS,
  BASE_GHOST_SPEED,
  BASE_PACMAN_SPEED,
  BLINKY_MARKER,
  BLINKY_NAME,
  CHERRY_MARKER,
  CHERRY_RESPAWN_DECREASE_PER_PHASE,
  CHERRY_RESPAWN_MAX_MS,
  CHERRY_RESPAWN_MIN_MS,
  CHERRY_VISIBLE_MS,
  CLYDE_MARKER,
  CLYDE_NAME,
  COLLECTIBLE_SCORES,
  COLLISION_DISTANCE_TILES,
  COLUMN_COUNT,
  DIRECTION_NAMES,
  DirectionName,
  DIRECTIONS,
  DOWN,
  EMPTY_MARKER,
  EXTRA_LIFE_SCORE_THRESHOLD,
  GHOST_EATEN_BASE_SCORE,
  GHOST_MARKER_SPECS,
  GHOST_SPEED_INCREASE_PER_PHASE,
  HIGH_SCORE_INITIALS_LENGTH,
  HIGH_SCORE_STORAGE_KEY,
  INKY_MARKER,
  INKY_NAME,
  LEFT,
  MAZE_TEMPLATE,
  MIN_CHERRY_RESPAWN_MAX_MS,
  MIN_CHERRY_RESPAWN_MIN_MS,
  MIN_POWER_MODE_MS,
  NONE,
  OPPOSITE_DIRECTIONS,
  PACMAN_MARKER,
  PACMAN_STARTING_LIVES,
  PELLET_MARKER,
  PINKY_MARKER,
  PINKY_NAME,
  POWER_MODE_GHOST_SPEED_FACTOR,
  POWER_MODE_MS,
  POWER_MODE_MS_DECREASE_PER_PHASE,
  POWER_PELLET_MARKER,
  RIGHT,
  ROUND_START_DELAY_MS,
  ROW_COUNT,
  UP,
  WALL_MARKER,
} from './constants.ts'
import { Ghost } from './ghost.ts'
import { Pacman } from './pacman.ts'
import { assertIsNotUndefined } from '../utils.ts'
import {
  renderCherry,
  renderFilledRectPixel,
  renderPellet,
  renderPowerPellet,
  renderWall,
  tileToPixel,
  toWorldPoint,
} from './render_utils.ts'

/**
 * The two states the game can be in.
 *
 * `playing` means a player is in control; `gameOver` means the demo is
 * showing its attract mode, the insertion prompt, or the name entry screen.
 */
type GameState = 'playing' | 'gameOver'

/**
 * The maze characters that may mark a ghost's starting cell.
 */
type GhostMarker =
  | typeof CLYDE_MARKER
  | typeof INKY_MARKER
  | typeof PINKY_MARKER
  | typeof BLINKY_MARKER
/**
 * The display names of the four ghosts.
 */
type GhostName =
  | typeof BLINKY_NAME
  | typeof PINKY_NAME
  | typeof INKY_NAME
  | typeof CLYDE_NAME

// [/doc_img/game.ts/2026-08-08-12-04-06.png]
/**
 * A character that may occupy a cell of the maze.
 */
type Tile =
  | typeof WALL_MARKER
  | typeof EMPTY_MARKER
  | typeof PELLET_MARKER
  | typeof POWER_PELLET_MARKER
  | typeof CHERRY_MARKER
  | typeof PACMAN_MARKER
  | GhostMarker

/**
 * Where a ghost starts, and how it is identified.
 */
type GhostStart = {
  /** The cell the ghost starts on, in maze tiles. */
  position: Vector3d
  /** The maze character that marked the ghost's starting cell. */
  marker: GhostMarker
  /** The ghost's display name. */
  name: GhostName
  /** The CSS color of the ghost's body. */
  color: string
}

/**
 * The persisted high score record.
 */
type HighScoreRecord = {
  /** The score of the record, in points. */
  score: number
  /** The difficulty phase the record was set in. */
  phase: number
  /** The three-character tag of the record holder, when it is known. */
  initials?: string
}

/**
 * The Pac-Man game: it owns the maze, the actors, the score, and the
 * rendering of the whole scene.
 */
export class Game {
  /** The maze tiles of the current round. */
  private readonly maze: Tile[][]
  /** The cell where Pac-Man is placed when a round starts. */
  private readonly pacmanStart: Vector3d
  /** The starting cell of each ghost. */
  private readonly ghostStarts: GhostStart[]
  /** The cell where the bonus cherry appears. */
  private readonly cherrySpawnPosition: Vector3d
  /** The player character. */
  private readonly pacman: Pacman
  /** The four ghosts that chase the player. */
  private readonly ghosts: Ghost[]

  /** The timestamp of the last processed tick, used to compute the elapsed time. */
  private lastTickMillis: number | null = null
  /** The score accumulated during the current run. */
  private score = 0
  /** The best score recorded on this machine. */
  private highScore = 0
  /** The phase of the high-score entry sequence the game is currently in. */
  private highScorePhase = 1

  // highScoreInitials is the three-character arcade tag saved alongside the
  // record; it defaults to dashes until a record holder signs their score.
  private highScoreInitials = '---'

  /**
   * Snapshots the stored record when a run begins, so the game-over
   * transition can tell whether THIS run earned name entry even though
   * `addScore()` promotes `score` into `highScore` while playing.
   */
  private highScoreAtRunStart = 0
  /** Whether the game is currently waiting for the player to type their initials. */
  private isEnteringInitials = false
  /** The characters typed so far during the high-score entry sequence. */
  private initialsChars: string[] = []

  /** The number of Pac-Man lives left in the current round. */
  private lives = PACMAN_STARTING_LIVES
  /** The current state of the game session. */
  private gameState: GameState = 'gameOver'
  /** The number of pellets still to be collected in the current round. */
  private pelletsRemaining = 0
  /** How much longer the power mode lasts, in milliseconds. */
  private powerModeRemainingMs = 0
  /** How many ghosts have been eaten during the current power mode. */
  private ghostCombo = 0

  /**
   * The countdown (in milliseconds) for the "READY!" pause shown at the start
   * of each round.
   *
   * It is set to `ROUND_START_DELAY_MS` in `resetRound()` and counted down in
   * `update()`; while it is above zero, actor movement and pellet/collision
   * logic are skipped so the maze freezes briefly before play resumes.
   */
  private roundDelayRemainingMs = 0

  /** The identifier of the power mode currently in progress. */
  private currentPowerModeId = 0
  /** Whether the player has already started the current game session. */
  private hasStartedGame = false
  /** The number of the level currently being played. */
  private phase = 1
  /** How much longer the bonus cherry stays on the maze, in milliseconds. */
  private cherryVisibleRemainingMs = 0
  /** How long until the bonus cherry appears again, in milliseconds. */
  private cherryRespawnRemainingMs = 0

  /**
   * Creates the game.
   *
   * The maze is copied from the immutable template, so gameplay can consume
   * pellets and replace markers without affecting the source maze shared by
   * future rounds. The stored high score record is loaded from
   * `localStorage`.
   *
   * @returns Nothing; the game's initial state is prepared in place.
   * @throws {Error} When the maze template does not contain one of the
   *   expected spawn markers. The message reads `Marker not found: <marker>`.
   */
  constructor() {
    // Copy the immutable template so gameplay can consume pellets and replace
    // markers without mutating the source maze shared by future rounds.
    this.maze = MAZE_TEMPLATE.map(line => Array.from(line) as Tile[])

    this.pacmanStart = this.findAndClearMarker(PACMAN_MARKER)
    this.ghostStarts = this.findAndClearGhostMarkers()
    this.cherrySpawnPosition = this.findAndClearMarker(CHERRY_MARKER)

    Actor.configureWallCheck(position => this.isWall(position))

    this.pacman = new Pacman(this.pacmanStart, BASE_PACMAN_SPEED)

    this.ghosts = this.ghostStarts.map(
      (start, index) =>
        new Ghost(
          start.position,
          BASE_GHOST_SPEED,
          index % 2 === 0 ? LEFT : RIGHT,
          index,
          start.name,
          start.marker,
          start.color,
        ),
    )

    this.pelletsRemaining = this.countRemainingPellets()
    this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
    const highScoreRecord = this.loadHighScore()
    this.highScore = highScoreRecord.score
    this.highScorePhase = highScoreRecord.phase
    this.highScoreInitials =
      highScoreRecord.initials ?? '-'.repeat(HIGH_SCORE_INITIALS_LENGTH)
  }

  /**
   * Advances the simulation by one frame and draws the resulting scene.
   *
   * @returns Nothing; the game state is updated and the canvas is redrawn.
   * @throws {Error} When the tile Pac-Man stands on is not a known maze
   *   character. The message reads `Unhandled tile type: <tile>`.
   * @throws {TypeError} When the maze layout does not contain Pinky the
   *   ghost, whose starting cell is used as the ghost house centre.
   */
  drawFrame() {
    if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0)
      console.log({ fps: fps() })

    background('black')

    // Clamp elapsed time so a paused tab or dropped frame cannot teleport
    // actors through walls or make timed effects expire in one update.
    const now = millis()
    const deltaSeconds =
      this.lastTickMillis === null
        ? 1 / FPS
        : min((now - this.lastTickMillis) / 1000, 0.05)

    this.lastTickMillis = now

    this.update(deltaSeconds)
    this.render()
  }

  /**
   * Draws the indicator shown while the demo is paused.
   *
   * @returns Nothing; the indicator is drawn onto the canvas.
   */
  renderPaused() {
    text2d(
      'PAUSED',
      toWorldPoint(animation.width / 2, animation.height / 2 - 330),
      'red',
      { fontSize: 45, fontFamily: '"Press Start 2P"' },
    )
  }

  /**
   * Handles a key press.
   *
   * While a game is being played the arrow keys and the WASD keys steer
   * Pac-Man; otherwise Enter starts a new game. During the high score name
   * entry the keyboard belongs to the name entry screen, and the event is
   * swallowed so the global shortcuts do not react to the typed characters.
   *
   * @param event - The keyboard event to handle.
   * @returns Nothing; the game state is updated in place.
   * @throws {Error} When a new game is started and the maze template does not
   *   contain one of the expected spawn markers. The message reads
   *   `Marker not found: <marker>`.
   */
  handleKeydown = (event: KeyboardEvent) => {
    resumeAudio()

    // High-score entry owns the keyboard. The handler runs in the capture
    // phase so swallowing the event here also keeps the global shortcuts in
    // home.ts (digit demo switching, pause, shift+arrow navigation) from
    // reacting to characters meant as initials.
    if (this.isEnteringInitials) {
      this.handleInitialsKeydown(event)

      return
    }

    const key = event.key.toLowerCase()

    if (this.gameState === 'playing') {
      if (key === 'w' || key === 'arrowup') this.pacman.nextDir = UP
      else if (key === 's' || key === 'arrowdown') this.pacman.nextDir = DOWN
      else if (key === 'a' || key === 'arrowleft') this.pacman.nextDir = LEFT
      else if (key === 'd' || key === 'arrowright') this.pacman.nextDir = RIGHT
    } else if (key === 'enter') {
      this.startGame()
    }

    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
      ].includes(key)
    ) {
      event.preventDefault()
    }
  }

  /**
   * Stops the sounds the game may be playing.
   *
   * @returns Nothing; the repeating power mode siren is stopped.
   */
  stop() {
    stopPowerSirenLoop()
  }

  /**
   * Handles a key press during the high score name entry.
   *
   * The event is always swallowed, so the global shortcuts of the host page
   * stay out of the way while the initials are being typed.
   *
   * @param event - The keyboard event to handle.
   * @returns Nothing; the initials being typed are updated in place.
   */
  private handleInitialsKeydown(event: KeyboardEvent) {
    event.preventDefault()
    event.stopImmediatePropagation()

    if (event.key === 'Enter') {
      this.confirmInitials()

      return
    }

    if (event.key === 'Backspace') {
      this.initialsChars.pop()

      return
    }

    // Accept any printable Unicode character, emoji included. Spreading the
    // key counts code points, so surrogate-pair characters still count as a
    // single typed character while named keys (Shift, Dead, ...) are ignored.
    const characters = Array.from(event.key)

    if (characters.length !== 1) return

    if (this.initialsChars.length < HIGH_SCORE_INITIALS_LENGTH)
      this.initialsChars.push(characters[0])
  }

  /**
   * Confirms the high score name entry and stores the result.
   *
   * Unfilled slots are saved as dashes.
   *
   * @returns Nothing; the high score record is updated and persisted.
   */
  private confirmInitials() {
    while (this.initialsChars.length < HIGH_SCORE_INITIALS_LENGTH)
      this.initialsChars.push('-')

    this.highScoreInitials = this.initialsChars.join('')
    this.isEnteringInitials = false
    this.initialsChars = []

    this.saveHighScore({
      score: this.highScore,
      phase: this.highScorePhase,
      initials: this.highScoreInitials,
    })
  }

  /**
   * Tells whether the power mode is currently active.
   *
   * @returns `true` while the power mode timer is running.
   */
  private inPowerMode() {
    return this.powerModeRemainingMs > 0
  }

  /**
   * Tells whether a ghost is currently edible.
   *
   * A ghost already eaten during the current power mode cycle stays a normal
   * chaser until it is revived and re-frightened by a future power pellet.
   *
   * @param ghost - The ghost to test.
   * @returns `true` when the ghost is frightened and can be eaten.
   */
  private isGhostFrightened(ghost: Ghost): boolean {
    // A ghost already eaten during this power-mode cycle stays a normal
    // chaser until revived and re-frightened by a future power pellet.
    return (
      this.inPowerMode() &&
      !ghost.isEaten &&
      ghost.lastEatenPowerModeId !== this.currentPowerModeId
    )
  }

  /**
   * Starts a new game.
   *
   * The score and the lives are reset, while the high score intentionally
   * survives through `localStorage` and is not cleared here.
   *
   * @returns Nothing; the game state is updated in place.
   * @throws {Error} When the maze template does not contain one of the
   *   expected spawn markers. The message reads `Marker not found: <marker>`.
   */
  private startGame() {
    // A new game resets score and lives, while the high score intentionally
    // survives through localStorage and is not cleared here.
    this.hasStartedGame = true
    this.score = 0
    this.lives = PACMAN_STARTING_LIVES
    this.phase = 1
    this.gameState = 'playing'
    this.powerModeRemainingMs = 0
    stopPowerSirenLoop()
    this.ghostCombo = 0

    // Remember the record to beat so game over can tell whether this run set
    // a new high score worthy of the name-entry screen.
    this.highScoreAtRunStart = this.highScore
    this.isEnteringInitials = false
    this.initialsChars = []

    this.resetMazeFromTemplate()
    this.resetRound()
  }

  /**
   * Returns the maze character occupying a cell.
   *
   * @param actor - The actor whose cell should be read.
   * @param position - The cell to read, in maze tiles. Used instead of
   *   `actor`.
   * @param col - The column of the cell to read. Used instead of `actor` and
   *   `position`.
   * @param row - The row of the cell to read. Used only together with `col`.
   * @returns The character occupying the cell, or the wall marker when the
   *   cell lies outside the maze.
   */
  private getTile(actor: Actor): Tile
  private getTile(position: Vector3d): Tile
  private getTile(col: number, row: number): Tile
  private getTile(
    actorOrPositionOrCol: Actor | Vector3d | number,
    row?: number,
  ): Tile {
    const position =
      typeof actorOrPositionOrCol === 'number'
        ? $v(actorOrPositionOrCol, row!)
        : actorOrPositionOrCol instanceof Actor
          ? actorOrPositionOrCol.position
          : actorOrPositionOrCol

    return this.maze[position.y][position.x] ?? WALL_MARKER
  }

  /**
   * Writes a maze character into a cell.
   *
   * @param actor - The actor whose cell should be written.
   * @param value - The character to write.
   * @param position - The cell to write, in maze tiles. Used instead of
   *   `actor`.
   * @returns Nothing; the maze is updated in place.
   */
  private setTile(actor: Actor, value: Tile): void
  private setTile(position: Vector3d, value: Tile): void
  private setTile(actorOrPosition: Actor | Vector3d, value: Tile): void {
    const position =
      actorOrPosition instanceof Actor
        ? actorOrPosition.position
        : actorOrPosition

    this.maze[position.y][position.x] = value
  }

  /**
   * Finds the cell holding a spawn marker and replaces it with an empty cell.
   *
   * @param marker - The maze character to look for.
   * @returns A new vector holding the position of the marker, in maze tiles.
   * @throws {Error} When the maze holds no such marker. The message reads
   *   `Marker not found: <marker>`.
   */
  private findAndClearMarker(marker: Tile): Vector3d {
    for (let row = 0; row < ROW_COUNT; row++) {
      for (let col = 0; col < COLUMN_COUNT; col++) {
        if (this.maze[row][col] === marker) {
          this.maze[row][col] = EMPTY_MARKER

          return $v(col, row)
        }
      }
    }

    throw new Error(`Marker not found: ${marker}`)
  }

  /**
   * Finds and clears the starting cells of all the ghosts.
   *
   * @returns The starting position and identity of every ghost, in the order
   *   the ghosts are declared in the ghost specifications.
   * @throws {Error} When the maze holds no marker for one of the ghosts. The
   *   message reads `Marker not found: <marker>`.
   */
  private findAndClearGhostMarkers(): GhostStart[] {
    return GHOST_MARKER_SPECS.map(spec => {
      const position = this.findAndClearMarker(spec.marker)

      return {
        ...spec,
        position,
      }
    })
  }

  /**
   * Returns the cell the eaten ghosts head back to.
   *
   * @returns A new vector holding the centre of the ghost house, in maze
   *   tiles.
   * @throws {TypeError} When the maze layout does not contain Pinky the
   *   ghost, whose starting cell marks the ghost house.
   */
  private getGhostHouseCenterTarget(): Vector3d {
    const pinkyStart = this.ghostStarts.find(start => start.name === PINKY_NAME)
    assertIsNotUndefined(pinkyStart)

    return pinkyStart.position.clone()
  }

  /**
   * Restores the maze to the layout of the template.
   *
   * Every tile is restored and the spawn markers are removed again, because
   * the actors keep their starting positions separately from the visible maze
   * contents.
   *
   * @returns Nothing; the maze is updated in place.
   * @throws {Error} When the maze template does not contain one of the
   *   expected spawn markers. The message reads `Marker not found: <marker>`.
   */
  private resetMazeFromTemplate() {
    // Restore every tile, then remove spawn markers again because actors keep
    // their start positions separately from the visible maze contents.
    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      this.maze[row][col] = Array.from(MAZE_TEMPLATE[row])[col] as Tile
    })

    this.findAndClearMarker(PACMAN_MARKER)
    this.findAndClearGhostMarkers()
    this.findAndClearMarker(CHERRY_MARKER)
    this.resetCherryCycle()

    this.pelletsRemaining = this.countRemainingPellets()
  }

  /**
   * Returns how long the game waits before the cherry reappears.
   *
   * @returns The delay, in milliseconds, within the current phase's respawn
   *   bounds.
   */
  private randomCherryRespawnDelayMs() {
    const bounds = this.getCherryRespawnBounds()

    return bounds.min + random() * (bounds.max - bounds.min)
  }

  /**
   * Removes the cherry from the maze.
   *
   * @returns Nothing; the maze is updated in place.
   */
  private hideCherry() {
    if (this.getTile(this.cherrySpawnPosition) === CHERRY_MARKER)
      this.setTile(this.cherrySpawnPosition, EMPTY_MARKER)
  }

  /**
   * Puts the cherry back into the maze.
   *
   * @returns Nothing; the maze is updated in place.
   */
  private showCherry() {
    this.setTile(this.cherrySpawnPosition, CHERRY_MARKER)
  }

  /**
   * Restarts the cherry cycle, so the cherry is hidden and a new respawn
   * delay is picked.
   *
   * @returns Nothing; the cherry timers are updated in place.
   */
  private resetCherryCycle() {
    this.hideCherry()

    this.cherryVisibleRemainingMs = 0
    this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
  }

  /**
   * Advances the cherry cycle.
   *
   * The cycle alternates between a hidden respawn countdown and a visible
   * lifetime; only one of the two timers is active at a time.
   *
   * @param deltaSeconds - The elapsed wall-clock time since the previous
   *   update, in seconds.
   * @returns Nothing; the cherry timers and the maze are updated in place.
   */
  private updateCherryCycle(deltaSeconds: number) {
    // Cherry timing alternates between a hidden respawn countdown and a
    // visible lifetime; only one timer is active in either state.
    const deltaMs = deltaSeconds * 1000

    if (this.cherryVisibleRemainingMs > 0) {
      this.cherryVisibleRemainingMs = max(
        0,
        this.cherryVisibleRemainingMs - deltaMs,
      )

      if (this.cherryVisibleRemainingMs <= 0) {
        this.hideCherry()
        this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()
      }

      return
    }

    this.cherryRespawnRemainingMs = max(
      0,
      this.cherryRespawnRemainingMs - deltaMs,
    )

    if (this.cherryRespawnRemainingMs <= 0) {
      this.showCherry()
      this.cherryVisibleRemainingMs = CHERRY_VISIBLE_MS
    }
  }

  /**
   * Counts the pellets still lying on the maze.
   *
   * @returns The number of regular and power pellets left.
   */
  private countRemainingPellets(): number {
    let count = 0

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile(col, row)

      if (tile === PELLET_MARKER || tile === POWER_PELLET_MARKER) count++
    })

    return count
  }

  /**
   * Returns the speed the ghosts should travel at in the current phase.
   *
   * @returns The ghost speed, in tiles per second.
   */
  private getGhostSpeed() {
    return BASE_GHOST_SPEED + (this.phase - 1) * GHOST_SPEED_INCREASE_PER_PHASE
  }

  /**
   * Returns how long the current power mode lasts.
   *
   * The attract mode extends power mode so attract-mode viewers see
   * frightened-ghost gameplay for longer than a player would.
   *
   * @returns The power mode duration, in milliseconds.
   */
  private getPowerModeDurationMs() {
    // The attract loop extends power mode so attract-mode viewers see
    // frightened-ghost gameplay for longer than a player would.
    if (this.gameState !== 'playing') return ATTRACT_POWER_MODE_MS

    return max(
      MIN_POWER_MODE_MS,
      POWER_MODE_MS - (this.phase - 1) * POWER_MODE_MS_DECREASE_PER_PHASE,
    )
  }

  /**
   * Returns the bounds of the cherry respawn delay in the current phase.
   *
   * @returns The lowest and highest respawn delays, in milliseconds.
   */
  private getCherryRespawnBounds() {
    return {
      min: max(
        MIN_CHERRY_RESPAWN_MIN_MS,
        CHERRY_RESPAWN_MIN_MS -
          (this.phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
      ),
      max: max(
        MIN_CHERRY_RESPAWN_MAX_MS,
        CHERRY_RESPAWN_MAX_MS -
          (this.phase - 1) * CHERRY_RESPAWN_DECREASE_PER_PHASE,
      ),
    }
  }

  /**
   * Applies the current power mode state to the speed of every ghost.
   *
   * Frightened ghosts slow down, while eaten ghosts retain their return-home
   * speed until they are revived.
   *
   * @returns Nothing; the ghosts' speeds are updated in place.
   */
  private syncGhostSpeedsForPowerMode() {
    // Frightened ghosts slow down, while eaten ghosts retain their return-home
    // speed until they are revived.
    const baseGhostSpeed = this.getGhostSpeed()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      ghost.speedTilesPerSecond = this.isGhostFrightened(ghost)
        ? baseGhostSpeed * POWER_MODE_GHOST_SPEED_FACTOR
        : baseGhostSpeed
    })
  }

  // Initials are optional so legacy saves keep loading; stored strings are
  // clamped to the slot count and dropped when empty.
  /**
   * Normalises a stored high score tag.
   *
   * Initials are optional so legacy saves keep loading; stored strings are
   * clamped to the slot count and dropped when empty.
   *
   * @param value - The raw value read from storage.
   * @returns The tag, or `undefined` when the value is not a usable string.
   */
  private parseInitials(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined

    const characters = Array.from(value.trim())

    return characters.length > 0
      ? characters.slice(0, HIGH_SCORE_INITIALS_LENGTH).join('')
      : undefined
  }

  /**
   * Loads the persisted high score record.
   *
   * Old numeric saves are accepted as phase-one records, while new object
   * saves are validated so corrupt storage cannot produce invalid HUD state.
   *
   * @returns The stored record, or an empty phase-one record when no usable
   *   record is stored.
   */
  private loadHighScore(): HighScoreRecord {
    // Accept old numeric saves as phase-one records, but validate new object
    // saves so corrupt localStorage cannot produce invalid HUD state.
    try {
      const stored = self.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)

      if (stored === null) return { score: 0, phase: 1 }

      const parsed = JSON.parse(stored) as unknown

      if (typeof parsed === 'number') {
        return Number.isFinite(parsed) && parsed >= 0
          ? { score: floor(parsed), phase: 1 }
          : { score: 0, phase: 1 }
      }

      if (typeof parsed !== 'object' || parsed === null)
        return { score: 0, phase: 1 }

      const record = parsed as Record<string, unknown>
      const score = record.score
      const phase = record.phase

      if (
        typeof score !== 'number' ||
        !Number.isFinite(score) ||
        score < 0 ||
        typeof phase !== 'number' ||
        !Number.isFinite(phase) ||
        phase < 1
      )
        return { score: 0, phase: 1 }

      return {
        score: floor(score),
        phase: floor(phase),
        initials: this.parseInitials(record.initials),
      }
    } catch {
      return { score: 0, phase: 1 }
    }
  }

  /**
   * Persists the high score record.
   *
   * Storage write failures are ignored, to keep gameplay uninterrupted.
   *
   * @param record - The record to store.
   * @returns Nothing; the record is written to `localStorage`.
   */
  private saveHighScore(record: HighScoreRecord) {
    try {
      self.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(record))
    } catch {
      // Ignore storage write failures to keep gameplay uninterrupted.
    }
  }

  /**
   * Adds points to the score.
   *
   * An extra life is awarded for every threshold the score crosses, so
   * multiple crossings within one pickup still grant one life per full
   * threshold.
   *
   * @param points - The number of points to add.
   * @returns Nothing; the score, the high score, and the lives are updated
   *   in place.
   */
  private addScore(points: number) {
    // Award an extra life for every threshold the score crosses, so multiple
    // crossings within one pickup still grant one life per full threshold.
    const previousThresholdIndex = floor(
      this.score / EXTRA_LIFE_SCORE_THRESHOLD,
    )

    this.score += points

    if (this.score > this.highScore) {
      this.highScore = this.score
      this.highScorePhase = this.phase
      this.saveHighScore({
        score: this.highScore,
        phase: this.highScorePhase,
        initials: this.highScoreInitials,
      })
    }

    if (floor(this.score / EXTRA_LIFE_SCORE_THRESHOLD) > previousThresholdIndex)
      this.lives++
  }

  /**
   * Restarts the round.
   *
   * A life loss or a maze clear restarts the positions and the timers without
   * resetting the score, the lives, or the current difficulty phase.
   *
   * @returns Nothing; the actors and the timers are updated in place.
   */
  private resetRound() {
    // A life loss or maze clear restarts positions and timers without resetting
    // score, lives, or the current difficulty phase.
    this.pacman.reset(LEFT)

    this.ghosts.forEach((ghost, index) => {
      ghost.reset(index % 2 === 0 ? LEFT : RIGHT)
      ghost.speedTilesPerSecond = this.getGhostSpeed()
      ghost.isEaten = false
    })

    this.powerModeRemainingMs = 0
    stopPowerSirenLoop()
    this.ghostCombo = 0
    this.roundDelayRemainingMs = ROUND_START_DELAY_MS
    this.syncGhostSpeedsForPowerMode()
    this.resetCherryCycle()
  }

  /**
   * Returns the direction Pac-Man is facing.
   *
   * @returns Pac-Man's current direction, or the direction it is about to
   *   take when it is not moving.
   */
  private getPacmanFacing(): DirectionName {
    return this.pacman.dir !== NONE ? this.pacman.dir : this.pacman.nextDir
  }

  /**
   * Chooses the direction a ghost takes when it reaches a cell centre.
   *
   * Eaten ghosts head back to the ghost house, frightened ghosts try to
   * maximize their distance from Pac-Man, and normal ghosts minimize their
   * chase distance while avoiding crowding.
   *
   * @param ghost - The ghost that needs a new direction.
   * @returns The direction the ghost should take, or `none` when the ghost
   *   cannot move anywhere.
   * @throws {TypeError} When the maze layout does not contain Pinky the
   *   ghost, whose starting cell is used as the ghost house centre.
   */
  private chooseGhostDirection(ghost: Ghost): DirectionName {
    // Ghosts choose at tile centers. Eaten ghosts path home; frightened ghosts
    // maximize separation; normal ghosts minimize chase distance plus crowding.
    if (ghost.isEaten) {
      const target = this.getGhostHouseCenterTarget()

      if (ghost.tryReviveAt(target, LEFT, this.getGhostSpeed())) return NONE

      return ghost.nextDirectionToTarget(target)
    }

    const candidates = DIRECTION_NAMES.filter(direction => {
      if (direction === NONE) return false
      if (!ghost.canMoveTo(direction)) return false

      return direction !== OPPOSITE_DIRECTIONS[ghost.dir]
    })

    const directions =
      candidates.length > 0
        ? candidates
        : DIRECTION_NAMES.filter(
            direction => direction !== NONE && ghost.canMoveTo(direction),
          )

    if (directions.length === 0) return NONE
    if (directions.length === 1) return directions[0]

    if (this.isGhostFrightened(ghost)) {
      const powerRatio = max(
        0,
        min(1, this.powerModeRemainingMs / this.getPowerModeDurationMs()),
      )
      const fleeWeight = 0.55 + powerRatio * 1.25
      const spacingWeight = 0.05 + powerRatio * 0.17
      const uncertaintyWeight = (1 - powerRatio) * 1.1
      const pacmanPos = this.pacman.positionInTiles()
      let fleeDirection = directions[0]
      let bestFleeScore = Number.NEGATIVE_INFINITY

      directions.forEach(direction => {
        const target = ghost.nextCell(direction)
        const deltaToPacman = target.clone().sub(pacmanPos)
        const fleeDistance = abs(deltaToPacman.y) + abs(deltaToPacman.x)

        const spacingBonus = this.ghosts
          .filter(other => other.id !== ghost.id)
          .reduce((bonus, other) => {
            const otherPos = other.positionInTiles()
            const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)

            return bonus + dist
          }, 0)

        const tieBreaker = ((ghost.id + direction.charCodeAt(0)) % 7) * 0.0001
        const decayJitter =
          (((ghost.id + floor(millis() / 120) + direction.charCodeAt(0)) % 11) /
            10) *
          uncertaintyWeight
        const fleeScore =
          fleeDistance * fleeWeight +
          spacingBonus * spacingWeight -
          decayJitter +
          tieBreaker

        if (fleeScore > bestFleeScore) {
          bestFleeScore = fleeScore
          fleeDirection = direction
        }
      })

      return fleeDirection
    }

    const overlappingGhosts = this.ghosts.filter(
      other =>
        other.id !== ghost.id &&
        other.progress === 0 &&
        ghost.progress === 0 &&
        other.position.equals(ghost.position),
    )

    if (overlappingGhosts.length > 0) {
      const occupiedDirections = new Set(
        overlappingGhosts.map(other =>
          other.nextDir !== NONE ? other.nextDir : other.dir,
        ),
      )

      const freeDirections = directions.filter(direction => {
        return !occupiedDirections.has(direction)
      })

      if (freeDirections.length > 0) {
        const rotateIndex =
          (ghost.id + floor(millis() / 120)) % freeDirections.length

        return freeDirections[rotateIndex]
      }

      const rotateIndex = (ghost.id + floor(millis() / 120)) % directions.length

      return directions[rotateIndex]
    }

    const pacmanPos = this.pacman.positionInTiles()
    const chaseTarget = ghost.getChaseTarget(
      pacmanPos,
      DIRECTIONS[this.getPacmanFacing()],
      this.ghosts,
    )

    let bestDirection = directions[0]
    let bestScore = Number.POSITIVE_INFINITY

    directions.forEach(direction => {
      const target = ghost.nextCell(direction)
      const deltaToChaseTarget = target.clone().sub(chaseTarget)
      const chaseDistance =
        abs(deltaToChaseTarget.y) + abs(deltaToChaseTarget.x)

      const crowdPenalty = this.ghosts
        .filter(other => other.id !== ghost.id)
        .reduce((penalty, other) => {
          const otherPos = other.positionInTiles()
          const dist = abs(target.y - otherPos.y) + abs(target.x - otherPos.x)
          const sameTilePenalty = dist < 0.35 ? 7 : 0

          return penalty + 1 / (dist + 0.45) + sameTilePenalty
        }, 0)

      const tieBreaker = ((ghost.id + direction.charCodeAt(0)) % 7) * 0.0001
      const score = chaseDistance + crowdPenalty * 0.9 + tieBreaker

      if (score < bestScore) {
        bestScore = score
        bestDirection = direction
      }
    })

    return bestDirection
  }

  /**
   * Returns the distance to the closest collectible item still on the maze.
   *
   * The distance is a Manhattan distance: the method is a cheap local
   * heuristic for the attract-mode driver, not a full pathfinding query.
   *
   * @param position - The position to measure from, in maze tiles.
   * @returns The distance to the closest collectible, or
   *   `Number.POSITIVE_INFINITY` when the maze holds no collectible.
   */
  private getClosestCollectibleDistance(position: Vector3d): number {
    // This intentionally uses Manhattan distance: the method is a cheap local
    // heuristic for the attract-mode driver, not a full pathfinding query.
    let shortestDistance = Number.POSITIVE_INFINITY

    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile(col, row)

      if (
        tile === PELLET_MARKER ||
        tile === POWER_PELLET_MARKER ||
        tile === CHERRY_MARKER
      ) {
        const distance = position.manhattanDist(col, row)

        if (distance < shortestDistance) shortestDistance = distance
      }
    })

    return shortestDistance
  }

  // https://drive.google.com/file/d/1EjJiVstVLq4C_HHFdc6ZI01UdJZ6dQ3D/view?usp=sharing, https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221QxqF4E22VIbEok8RgHujB2gdbe-Nesmc%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  /**
   * Chooses the direction the automatically driven Pac-Man takes when it
   * reaches a cell centre.
   *
   * Pac-Man keeps moving forward when possible; reversing is only a fallback
   * when the current corridor has no other legal exit.
   *
   * @returns The direction Pac-Man should take, or `none` when Pac-Man
   *   cannot move anywhere.
   */
  private chooseAttractModePacmanDirection(): DirectionName {
    // Keep Pacman moving forward when possible; reversing is only a fallback
    // when the current corridor has no other legal exit.
    const candidates = DIRECTION_NAMES.filter(direction => {
      if ([NONE, OPPOSITE_DIRECTIONS[this.pacman.dir]].includes(direction))
        return false

      return this.pacman.canMoveTo(direction)
    })

    const directions =
      candidates.length > 0
        ? candidates
        : // Fallback to reversing if Pacman is trapped in a dead end. This is rare but
          // possible in the attract-mode maze, and it prevents Pacman from getting stuck.
          DIRECTION_NAMES.filter(
            direction => direction !== NONE && this.pacman.canMoveTo(direction),
          )

    if (directions.length === 0) return NONE
    if (directions.length === 1) return directions[0]

    const frightenedGhosts = this.ghosts.filter(ghost =>
      this.isGhostFrightened(ghost),
    )
    const isHuntingGhosts = frightenedGhosts.length > 0

    // Score each exit: in normal mode, prioritize pellets/cherries and avoid
    // lethal ghosts; in power mode with frightened ghosts present, aggressively
    // hunt down and close distance on the nearest edible ghost.
    const scoredDirections = directions
      .map(direction => {
        const next = this.pacman.nextCell(direction)
        const nextTile = this.getTile(next)

        // Base food distance heuristic.
        const collectibleDistance = this.getClosestCollectibleDistance(next)

        // Pellet / power pellet bonuses.
        const collectibleBonus =
          nextTile === POWER_PELLET_MARKER && !this.inPowerMode()
            ? -50
            : nextTile === PELLET_MARKER
              ? -25
              : 0

        // In normal mode, ghosts are dangerous threats. In power mode, dangerous
        // non-frightened ghosts (if any) are avoided while frightened ghosts become targets.
        const nonFrightenedGhosts = this.ghosts.filter(
          ghost => !ghost.isEaten && !this.isGhostFrightened(ghost),
        )

        const ghostThreat = nonFrightenedGhosts.reduce((threat, ghost) => {
          const ghostPos = ghost.positionInTiles()
          const distance = next.manhattanDist(ghostPos)

          return threat + 1 / (distance + 0.4)
        }, 0)

        // Chase metric: calculate distance to closest frightened ghost.
        let ghostChaseScore = 0
        if (isHuntingGhosts) {
          const closestFrightenedDist = min(
            ...frightenedGhosts.map(ghost =>
              next.manhattanDist(ghost.positionInTiles()),
            ),
          )

          // Strongly minimize distance to closest frightened ghost.
          ghostChaseScore = closestFrightenedDist * 18
        }

        // Deterministic variation to break ties cleanly.
        const tieBreaker =
          ((direction.charCodeAt(0) + floor(millis() / 220)) % 7) * 0.001

        const randomJitter = isHuntingGhosts ? 0 : random() * 0.6

        const score = isHuntingGhosts
          ? ghostChaseScore +
            collectibleDistance * 0.2 +
            ghostThreat * 15 +
            tieBreaker
          : collectibleDistance +
            ghostThreat * 7 +
            collectibleBonus +
            tieBreaker +
            randomJitter

        return { dir: direction, score }
      })
      .sort((a, b) => a.score - b.score)

    // In normal mode, occasionally explore alternate paths. When hunting ghosts
    // in power mode, stay strictly focused on the optimal pursuit course.
    const alternateRouteChance = isHuntingGhosts ? 0 : 0.18

    if (scoredDirections.length > 1 && random() < alternateRouteChance) {
      const alternateIndex = 1 + floor(random() * (scoredDirections.length - 1))

      return scoredDirections[alternateIndex].dir
    }

    return scoredDirections[0].dir
  }

  /**
   * Applies the effect of the collectible item Pac-Man is standing on.
   *
   * Attract mode mutates the maze and advances the phases, but suppresses the
   * player-only scoring and audio, allowing the attract loop to run
   * indefinitely.
   *
   * @param isAttractMode - Whether the game is running in attract mode.
   *   Defaults to `false`.
   * @returns Nothing; the maze, the score, and the timers are updated in
   *   place.
   * @throws {Error} When the tile Pac-Man stands on is not a known maze
   *   character. The message reads `Unhandled tile type: <tile>`.
   */
  private consumePacmanTile(isAttractMode = false) {
    // Attract mode mutates the maze and advances phases but suppresses player-only
    // scoring and audio, allowing the attract loop to run indefinitely.
    const tile = this.getTile(this.pacman)

    switch (tile) {
      case PELLET_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isAttractMode) {
          this.addScore(COLLECTIBLE_SCORES.pellet)
          playWaka()
        }
        break

      case POWER_PELLET_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.pelletsRemaining--

        if (!isAttractMode) this.addScore(COLLECTIBLE_SCORES.powerPellet)

        this.currentPowerModeId++
        this.powerModeRemainingMs = this.getPowerModeDurationMs()
        this.ghostCombo = 0
        this.syncGhostSpeedsForPowerMode()

        if (!isAttractMode)
          startPowerSirenLoop(
            () => this.powerModeRemainingMs,
            () => this.gameState === 'playing',
          )
        break

      case CHERRY_MARKER:
        this.setTile(this.pacman, EMPTY_MARKER)
        this.hideCherry()
        this.cherryVisibleRemainingMs = 0
        this.cherryRespawnRemainingMs = this.randomCherryRespawnDelayMs()

        if (!isAttractMode) {
          this.addScore(COLLECTIBLE_SCORES.cherry)

          playCherryPickup()
        }
        break

      case EMPTY_MARKER:
        break

      default:
        throw new Error(`Unhandled tile type: ${tile}`)
    }

    if (this.pelletsRemaining <= 0) {
      this.phase++

      if (!isAttractMode) stopPowerSirenLoop()

      this.resetMazeFromTemplate()
      this.resetRound()
    }
  }

  /**
   * Resolves the collisions between Pac-Man and the ghosts.
   *
   * The collision handling is ordered from edible ghosts to lethal ghosts.
   * In attract mode the round is reset instead of consuming a player life.
   *
   * @param isAttractMode - Whether the game is running in attract mode.
   *   Defaults to `false`.
   * @returns Nothing; the game state is updated in place.
   */
  private checkGhostCollisions(isAttractMode = false) {
    // Collision handling is ordered from edible ghosts to lethal ghosts, with
    // attract mode resetting the round instead of consuming a player life.
    const pacmanPos = this.pacman.positionInTiles()

    this.ghosts.forEach(ghost => {
      if (ghost.isEaten) return

      const ghostPos = ghost.positionInTiles()
      const distance = ghostPos.dist(pacmanPos)

      if (distance > COLLISION_DISTANCE_TILES) return

      if (this.isGhostFrightened(ghost)) {
        ghost.lastEatenPowerModeId = this.currentPowerModeId
        ghost.markEaten(this.getGhostSpeed())

        if (!isAttractMode)
          this.addScore(GHOST_EATEN_BASE_SCORE * 2 ** this.ghostCombo)

        this.ghostCombo++

        if (!isAttractMode) playGhostEaten()

        return
      }

      if (isAttractMode) {
        this.resetRound()

        return
      }

      this.lives--

      if (this.lives <= 0) {
        this.gameState = 'gameOver'

        // Beating the record captured at run start earns the classic
        // three-character name entry before the game-over screen returns.
        this.isEnteringInitials =
          this.score > this.highScoreAtRunStart && this.score > 0

        if (this.isEnteringInitials) this.initialsChars = []

        stopPowerSirenLoop()
        playDeath()

        return
      }

      this.resetRound()
    })
  }

  /**
   * Advances the simulation by one step.
   *
   * Before Enter is pressed, the game runs an attract mode. It uses the same
   * actors and the same maze rules as a played game, but supplies an
   * automatic Pac-Man direction and no player-facing score or sound effects.
   *
   * @param deltaSeconds - The elapsed wall-clock time since the previous
   *   update, in seconds.
   * @returns Nothing; the game state is updated in place.
   * @throws {Error} When the tile Pac-Man stands on is not a known maze
   *   character. The message reads `Unhandled tile type: <tile>`.
   * @throws {TypeError} When the maze layout does not contain Pinky the
   *   ghost, whose starting cell is used as the ghost house centre.
   */
  private update(deltaSeconds: number) {
    // Before Enter, the game runs an attract mode. It uses the same actors and
    // maze rules as play, but supplies an automatic Pacman direction and no
    // player-facing score or sound effects.
    if (this.gameState === 'gameOver') {
      if (this.roundDelayRemainingMs > 0) {
        this.roundDelayRemainingMs -= deltaSeconds * 1000

        return
      }

      const hadPowerMode = this.inPowerMode()

      this.powerModeRemainingMs = max(
        0,
        this.powerModeRemainingMs - deltaSeconds * 1000,
      )

      if (hadPowerMode && !this.inPowerMode()) {
        stopPowerSirenLoop()
        this.syncGhostSpeedsForPowerMode()
      }

      this.pacman.move(deltaSeconds, () =>
        this.chooseAttractModePacmanDirection(),
      )

      this.consumePacmanTile(true)

      this.ghosts.forEach(ghost =>
        ghost.move(deltaSeconds, actor =>
          this.chooseGhostDirection(actor as Ghost),
        ),
      )

      this.checkGhostCollisions(true)

      return
    }

    // Player mode keeps input-driven direction changes and cherry timing while
    // sharing movement, pellet consumption, and collision behavior with attract mode.
    if (this.roundDelayRemainingMs > 0) {
      this.roundDelayRemainingMs -= deltaSeconds * 1000

      return
    }

    const hadPowerMode = this.inPowerMode()

    this.powerModeRemainingMs = max(
      0,
      this.powerModeRemainingMs - deltaSeconds * 1000,
    )

    if (hadPowerMode && !this.inPowerMode()) {
      stopPowerSirenLoop()
      this.syncGhostSpeedsForPowerMode()
    }

    this.updateCherryCycle(deltaSeconds)

    if (
      this.pacman.canMoveTo(this.pacman.nextDir) &&
      this.pacman.progress === 0
    )
      this.pacman.dir = this.pacman.nextDir

    this.pacman.move(deltaSeconds)

    this.consumePacmanTile()

    this.ghosts.forEach(ghost => {
      ghost.move(deltaSeconds, actor =>
        this.chooseGhostDirection(actor as Ghost),
      )
    })

    this.checkGhostCollisions()
  }

  /**
   * Draws the static content of the maze.
   *
   * The actors are drawn separately, so their fractional positions can
   * animate; this pass only renders the static maze tile content.
   *
   * @returns Nothing; the maze is drawn onto the canvas.
   */
  private renderMaze() {
    // Actors are drawn separately so their fractional positions can animate;
    // this pass only renders static maze tile content.
    timesForEachN([COLUMN_COUNT, ROW_COUNT], (col, row) => {
      const tile = this.getTile(col, row)
      const pixel = tileToPixel(col, row)

      switch (tile) {
        case WALL_MARKER:
          renderWall(pixel)
          break
        case PELLET_MARKER:
          renderPellet(pixel)
          break
        case POWER_PELLET_MARKER:
          renderPowerPellet(pixel)
          break
        case CHERRY_MARKER:
          renderCherry(pixel)
          break
      }
    })
  }

  /**
   * Draws the heads-up display.
   *
   * @returns Nothing; the HUD is drawn onto the canvas.
   */
  private renderHud() {
    text2d(`Score: ${this.score}`, toWorldPoint(20, 60), '#f4f4f4', {
      fontSize: 16,
      fontFamily: '"Press Start 2P"',
      textAlign: 'left',
    })
    text2d(`Lives: ${this.lives}`, toWorldPoint(20, 84), '#f4f4f4', {
      fontSize: 16,
      fontFamily: '"Press Start 2P"',
      textAlign: 'left',
    })
    text2d(`Phase: ${this.phase}`, toWorldPoint(20, 108), '#f4f4f4', {
      fontSize: 16,
      fontFamily: '"Press Start 2P"',
      textAlign: 'left',
    })
    text2d(
      `HIGH SCORE: ${this.highScore} (PHASE ${this.highScorePhase}) [${this.highScoreInitials}]`,
      toWorldPoint(animation.width / 2, 60),
      '#f4f4f4',
      {
        fontSize: 16,
        fontFamily: '"Press Start 2P"',
        textAlign: 'center',
      },
    )
    text2d(
      'Move: Arrow Keys / WASD',
      toWorldPoint(20, animation.height - 24),
      '#f4f4f4',
      {
        fontSize: 15,
        fontFamily: '"Press Start 2P"',
        textAlign: 'left',
      },
    )
  }

  // Toggles a boolean (on/off) value every `periodInMs` milliseconds, useful for example
  // for blinking text.
  /**
   * Tells whether the current time falls in the first half of a blinking
   * period.
   *
   * @param periodInMs - The length of a full blink cycle, in milliseconds.
   * @returns `true` during the first half of the cycle and `false` during the
   *   second half.
   */
  private static toggleEvery(periodInMs: number): boolean {
    return floor(millis() / periodInMs) % 2 === 0
  }

  /**
   * Draws the overlay shown on top of the maze.
   *
   * The overlay shows the insertion prompt before the first game, the
   * "READY!" notice at the start of a round, and the game-over screen or the
   * high score name entry afterwards.
   *
   * @returns Nothing; the overlay is drawn onto the canvas.
   */
  private renderStateOverlay() {
    if (!this.hasStartedGame) {
      renderFilledRectPixel(
        0,
        0,
        animation.width,
        animation.height,
        'rgba(0, 0, 0, 0.55)',
        0.75,
      )

      // Classic arcade blink: toggles the "INSERT COIN" prompt on/off every half second.
      if (Game.toggleEvery(500))
        text2d(
          'INSERT COIN',
          toWorldPoint(animation.width / 2, 140),
          'yellow',
          {
            fontSize: 28,
            fontFamily: '"Press Start 2P"',
          },
        )
      text2d(
        'Press Enter to play',
        toWorldPoint(animation.width / 2, 95),
        '#ffffff',
        {
          fontSize: 18,
          fontFamily: '"Press Start 2P"',
        },
      )

      return
    }

    if (this.roundDelayRemainingMs > 0 && this.gameState === 'playing') {
      renderFilledRectPixel(
        0,
        0,
        animation.width,
        animation.height,
        'rgba(0, 0, 0, 0.45)',
      )
      text2d('READY!', toWorldPoint(animation.width / 2, 125), '#ffde59', {
        fontSize: 24,
        fontFamily: '"Press Start 2P"',
      })

      return
    }

    if (this.gameState === 'playing') return

    // Name entry after a new high score keeps the maze at full brightness;
    // the dimming veil only covers the plain game-over/attract screens.
    if (!this.isEnteringInitials)
      renderFilledRectPixel(
        0,
        0,
        animation.width,
        animation.height,
        'rgba(0, 0, 0, 0.6)',
      )

    if (this.isEnteringInitials) {
      this.renderInitialsEntry()

      return
    }

    // Classic arcade blink: toggles the "INSERT COIN" prompt on/off every half second.
    if (Game.toggleEvery(500))
      text2d('INSERT COIN', toWorldPoint(animation.width / 2, 140), 'yellow', {
        fontSize: 28,
        fontFamily: '"Press Start 2P"',
      })
    text2d(
      'GAME OVER - Press Enter to play again',
      toWorldPoint(animation.width / 2, 95),
      '#ffffff',
      {
        fontSize: 18,
        fontFamily: '"Press Start 2P"',
      },
    )
  }

  /**
   * Draws the high score name entry screen.
   *
   * @returns Nothing; the name entry screen is drawn onto the canvas.
   */
  private renderInitialsEntry() {
    if (Game.toggleEvery(500))
      text2d(
        'NEW HIGH SCORE!',
        toWorldPoint(animation.width / 2, 145),
        'orange',
        {
          fontSize: 32,
          fontFamily: '"Press Start 2P"',
        },
      )
    text2d(
      `${this.score} POINTS - PHASE ${this.phase}`,
      toWorldPoint(animation.width / 2, 110),
      '#ffffff',
      {
        fontSize: 20,
        fontFamily: '"Press Start 2P"',
      },
    )

    text2d(
      `Type in your initials (up to ${HIGH_SCORE_INITIALS_LENGTH} characters) and hit Enter`,
      toWorldPoint(animation.width / 2, 775),
      'orange',
      {
        fontSize: 18,
        fontFamily: '"Press Start 2P"',
      },
    )

    // Three evenly spaced slots; the next empty slot blinks as the cursor.
    const slotWidth = 64
    const slotCenterX = animation.width / 2

    timesForEach(HIGH_SCORE_INITIALS_LENGTH, index => {
      const x =
        slotCenterX + (index - (HIGH_SCORE_INITIALS_LENGTH - 1) / 2) * slotWidth
      const character = this.initialsChars[index]

      if (character !== undefined || Game.toggleEvery(500))
        text2d(character ?? '_', toWorldPoint(x, 820), 'orange', {
          fontSize: 40,
          fontFamily: '"Press Start 2P"',
        })
    })
  }

  /**
   * Draws the whole scene.
   *
   * The render order places the maze behind the actors, and the HUD and the
   * overlay above both.
   *
   * @returns Nothing; the scene is drawn onto the canvas.
   */
  private render() {
    // Render order places the maze behind actors and the HUD/overlay above both.
    this.renderMaze()

    this.pacman.render(() => this.roundDelayRemainingMs)

    this.ghosts.forEach(ghost => {
      ghost.render(
        () => this.powerModeRemainingMs,
        () => this.currentPowerModeId,
      )
    })

    this.renderHud()

    this.renderStateOverlay()
  }

  /**
   * Tells whether a cell is a wall.
   *
   * @param position - The cell to test, in maze tiles.
   * @returns `true` when the cell holds a wall, or lies outside the maze.
   */
  private isWall(position: Vector3d): boolean {
    return (this.maze[position.y]?.[position.x] ?? WALL_MARKER) === WALL_MARKER
  }
}
