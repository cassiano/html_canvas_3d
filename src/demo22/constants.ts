//////////////////////
// AI-assisted code //
//////////////////////

import { $v, Vector3d } from '../vector_3d.ts'

// Centralized tuning values keep difficulty and audiovisual timing changes out
// of the game-state and rendering algorithms.
/** The size of a single maze cell, in pixels. */
export const TILE_SIZE = 24
/** The radius of Pac-Man, expressed as a fraction of the tile size. */
export const PACMAN_RADIUS_RATIO = 0.5
/** The radius of a ghost, expressed as a fraction of the tile size. */
export const GHOST_RADIUS_RATIO = 0.44
/** Pac-Man's cruising speed, in tiles per second. */
export const BASE_PACMAN_SPEED = 4
/** A ghost's cruising speed, in tiles per second, during the first phase. */
export const BASE_GHOST_SPEED = 3
/** The speed added to every ghost for each phase completed. */
export const GHOST_SPEED_INCREASE_PER_PHASE = 0.12
/** The factor applied to ghost speed while the ghosts are frightened. */
export const POWER_MODE_GHOST_SPEED_FACTOR = 0.72
/** The duration of power mode during a normal game, in milliseconds. */
export const POWER_MODE_MS = 10_000
/** The amount by which power mode shortens for each phase completed. */
export const POWER_MODE_MS_DECREASE_PER_PHASE = 1000
/** The shortest power mode duration allowed, in milliseconds. */
export const MIN_POWER_MODE_MS = 2_800
/** The power mode duration used by the attract mode, in milliseconds. */
export const ATTRACT_POWER_MODE_MS = 14_000
/** The remaining power mode time below which frightened ghosts start
 * flashing, in milliseconds. */
export const POWER_WARNING_FLASH_MS = 1_800
/** The period of the frightened-ghost warning flash, in milliseconds. */
export const POWER_WARNING_FLASH_INTERVAL_MS = 140
/** How long the cherry stays on the board, in milliseconds. */
export const CHERRY_VISIBLE_MS = 7_000
/** The shortest delay before the cherry reappears, in milliseconds. */
export const CHERRY_RESPAWN_MIN_MS = 9_000
/** The longest delay before the cherry reappears, in milliseconds. */
export const CHERRY_RESPAWN_MAX_MS = 18_000
/** The amount by which the cherry respawn delay shortens for each phase
 * completed. */
export const CHERRY_RESPAWN_DECREASE_PER_PHASE = 450
/** The lower bound of the cherry respawn delay, in milliseconds. */
export const MIN_CHERRY_RESPAWN_MIN_MS = 2_500
/** The upper bound of the cherry respawn delay, in milliseconds. */
export const MIN_CHERRY_RESPAWN_MAX_MS = 5_000
/** The score awarded for eating a ghost, before the combo multiplier. */
export const GHOST_EATEN_BASE_SCORE = 200
/** The distance, in tiles, within which Pac-Man collides with a ghost. */
export const COLLISION_DISTANCE_TILES = 0.5
/** The duration of the "READY!" pause that starts each round, in
 * milliseconds. */
export const ROUND_START_DELAY_MS = 900
/** The `localStorage` key under which the high score record is persisted. */
export const HIGH_SCORE_STORAGE_KEY = 'demo22_pacman_high_score'
/** The number of characters the high score tag may contain. */
export const HIGH_SCORE_INITIALS_LENGTH = 3
/** The number of lives a player starts each game with. */
export const PACMAN_STARTING_LIVES = 3
/** The score interval, in points, between two extra lives. */
export const EXTRA_LIFE_SCORE_THRESHOLD = 10_000

/** The maze character representing a wall. */
export const WALL_MARKER = '◻'
/** The maze character representing an empty, pellet-free cell. */
export const EMPTY_MARKER = ' '
/** The maze character representing a regular pellet. */
export const PELLET_MARKER = '·'
/** The maze character representing a power pellet. */
export const POWER_PELLET_MARKER = '⏺'
/** The maze character representing the cherry bonus item. */
export const CHERRY_MARKER = '🍒'
/** The maze character marking Pac-Man's starting cell. */
export const PACMAN_MARKER = '🟡'
/** The maze character marking Blinky the ghost's starting cell. */
export const BLINKY_MARKER = 'B'
/** The maze character marking Pinky the ghost's starting cell. */
export const PINKY_MARKER = 'P'
/** The maze character marking Inky the ghost's starting cell. */
export const INKY_MARKER = 'I'
/** The maze character marking Clyde the ghost's starting cell. */
export const CLYDE_MARKER = 'C'

/** The score awarded for each kind of collectible item. */
export const COLLECTIBLE_SCORES = {
  pellet: 10,
  powerPellet: 50,
  cherry: 350,
}

/** The display name of the red ghost. */
export const BLINKY_NAME = 'Blinky'
/** The display name of the pink ghost. */
export const PINKY_NAME = 'Pinky'
/** The display name of the cyan ghost. */
export const INKY_NAME = 'Inky'
/** The display name of the orange ghost. */
export const CLYDE_NAME = 'Clyde'

/**
 * The maze characters that may mark a ghost's starting cell.
 */
export type GhostMarker =
  | typeof BLINKY_MARKER
  | typeof PINKY_MARKER
  | typeof INKY_MARKER
  | typeof CLYDE_MARKER
/**
 * The display names of the four ghosts.
 */
export type GhostName =
  | typeof BLINKY_NAME
  | typeof PINKY_NAME
  | typeof INKY_NAME
  | typeof CLYDE_NAME

/**
 * The per-ghost configuration: its maze marker, display name, and body color.
 *
 * The array order also determines the ghosts' stable ids and the alternating
 * direction they start with.
 */
export const GHOST_MARKER_SPECS: {
  marker: GhostMarker
  name: GhostName
  color: string
}[] = [
  // This order also supplies stable ghost ids and alternating start directions.
  { marker: BLINKY_MARKER, name: BLINKY_NAME, color: '#FF0000' },
  { marker: PINKY_MARKER, name: PINKY_NAME, color: '#FFB8DE' },
  { marker: INKY_MARKER, name: INKY_NAME, color: '#46BFEE' },
  { marker: CLYDE_MARKER, name: CLYDE_NAME, color: '#FFB847' },
]

/** How many tiles ahead of Pac-Man Pinky aims its chase target. */
export const PINKY_LOOKAHEAD_TILES = 4
/** How many tiles ahead of Pac-Man Inky places its pivot point. */
export const INKY_LOOKAHEAD_TILES = 2
/** The distance, in tiles, within which Clyde retreats to his scatter
 * target. */
export const CLYDE_SHY_DISTANCE_TILES = 8

/**
 * The mapping between the gameplay direction names and their canonical
 * string values.
 */
export const DIRECTION_MAP = {
  up: 'up',
  left: 'left',
  down: 'down',
  right: 'right',
  none: 'none',
} as const

/**
 * The shape of {@link DIRECTION_MAP}.
 */
type DirectionMap = typeof DIRECTION_MAP

/**
 * The name of a gameplay direction, including the neutral `none` direction.
 */
export type DirectionName = DirectionMap[keyof DirectionMap]

/**
 * Every direction name, including the neutral `none` direction, in the
 * declaration order of {@link DIRECTION_MAP}.
 */
export const DIRECTION_NAMES = Object.keys(DIRECTION_MAP) as DirectionName[]

/**
 * The canonical direction names, exported individually for convenience:
 * `UP`, `DOWN`, `LEFT`, `RIGHT`, and `NONE`.
 */
export const {
  up: UP,
  down: DOWN,
  left: LEFT,
  right: RIGHT,
  none: NONE,
} = DIRECTION_MAP

/**
 * The unit vector pointing in each direction, expressed in maze tiles.
 */
export const DIRECTIONS: Record<DirectionName, Vector3d> = {
  up: $v(0, -1),
  down: $v(0, 1),
  left: $v(-1, 0),
  right: $v(1, 0),
  none: $v(0, 0),
}

/**
 * The direction facing the opposite way of each direction.
 */
export const OPPOSITE_DIRECTIONS: Record<DirectionName, DirectionName> = {
  up: DOWN,
  down: UP,
  left: RIGHT,
  right: LEFT,
  none: NONE,
}

// [/doc_img/constants.ts/2026-08-10-09-50-36.png]
/**
 * The immutable layout of the maze.
 *
 * Walls, collectibles, and the Pac-Man and ghost spawn markers are encoded
 * in one rectangular grid of characters.
 */
export const MAZE_TEMPLATE = [
  // Walls, collectibles, and spawn markers (Pacman and ghosts) are encoded in
  // one rectangular grid.
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
  '◻········◻········◻',
  '◻·◻◻·◻◻◻·◻·◻◻◻·◻◻·◻',
  '◻⏺◻◻·◻◻◻·◻·◻◻◻·◻◻⏺◻',
  '◻·················◻',
  '◻·◻◻·◻·◻◻◻◻◻·◻·◻◻·◻',
  '◻····◻···◻···◻····◻',
  '◻◻◻◻·◻◻◻ ◻ ◻◻◻·◻◻◻◻',
  '   ◻·◻       ◻·◻   ',
  '◻◻◻◻·◻ ◻◻B◻◻ ◻·◻◻◻◻',
  '    ·  ◻IPC◻  ·    ',
  '◻◻◻◻·◻ ◻◻◻◻◻ ◻·◻◻◻◻',
  '   ◻·◻   🍒   ◻·◻   ',
  '◻◻◻◻·◻ ◻◻◻◻◻ ◻·◻◻◻◻',
  '◻········◻········◻',
  '◻·◻◻·◻◻◻·◻·◻◻◻·◻◻·◻',
  '◻⏺·◻·····🟡·····◻·⏺◻',
  '◻◻·◻·◻·◻◻◻◻◻·◻·◻·◻◻',
  '◻····◻···◻···◻····◻',
  '◻·◻◻◻◻◻◻·◻·◻◻◻◻◻◻·◻',
  '◻·················◻',
  '◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻◻',
] as const

/** The number of rows in the maze. */
export const ROW_COUNT = MAZE_TEMPLATE.length
/** The number of columns in the maze. */
export const COLUMN_COUNT = MAZE_TEMPLATE[0].length

/**
 * Validates, at module load time, that every row of the maze template has the
 * expected number of columns.
 *
 * The runtime grid is indexed by column, so a ragged template would produce
 * undefined tiles and broken movement.
 *
 * @throws {Error} When a row's length differs from {@link COLUMN_COUNT}. The
 *   message reads `Invalid maze width at row <index>. Expected <expected> but
 *   got <actual>.`
 */
MAZE_TEMPLATE.forEach((row, index) => {
  // Keep the runtime grid rectangular; movement indexes every row by column.
  if ([...row].length !== COLUMN_COUNT)
    throw new Error(
      `Invalid maze width at row ${index}. Expected ${COLUMN_COUNT} but got ${[...row].length}.`,
    )
})
