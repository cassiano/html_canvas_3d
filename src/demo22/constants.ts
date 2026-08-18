import { $v, Vector3d } from '../vector_3d.ts'

export type DirectionName = 'up' | 'down' | 'left' | 'right' | 'none'

// Centralized tuning values keep difficulty and audiovisual timing changes out
// of the game-state and rendering algorithms.
export const TILE_SIZE = 24
export const PACMAN_RADIUS_RATIO = 0.5
export const GHOST_RADIUS_RATIO = 0.44
export const BASE_PACMAN_SPEED = 4
export const BASE_GHOST_SPEED = 3
export const GHOST_SPEED_INCREASE_PER_PHASE = 0.12
export const POWER_MODE_GHOST_SPEED_FACTOR = 0.72
export const POWER_MODE_MS = 7000
export const POWER_MODE_MS_DECREASE_PER_PHASE = 350
export const MIN_POWER_MODE_MS = 2800
export const POWER_WARNING_FLASH_MS = 1800
export const POWER_WARNING_FLASH_INTERVAL_MS = 140
export const CHERRY_SCORE = 200
export const CHERRY_EXTRA_SCORE = 150
export const CHERRY_VISIBLE_MS = 7000
export const CHERRY_RESPAWN_MIN_MS = 9000
export const CHERRY_RESPAWN_MAX_MS = 18000
export const CHERRY_RESPAWN_DECREASE_PER_PHASE = 450
export const MIN_CHERRY_RESPAWN_MIN_MS = 2500
export const MIN_CHERRY_RESPAWN_MAX_MS = 5000
export const GHOST_EATEN_BASE_SCORE = 200
export const COLLISION_DISTANCE_TILES = 0.5
export const ROUND_START_DELAY_MS = 900
export const HIGH_SCORE_STORAGE_KEY = 'demo22_pacman_high_score'

export const WALL_MARKER = '◻'
export const EMPTY_MARKER = ' '
export const PELLET_MARKER = '·'
export const POWER_PELLET_MARKER = '⏺'
export const CHERRY_MARKER = '🍒'
export const PACMAN_MARKER = '🟡'
export const BLINKY_MARKER = 'B'
export const PINKY_MARKER = 'P'
export const INKY_MARKER = 'I'
export const CLYDE_MARKER = 'C'

export const BLINKY_NAME = 'Blinky'
export const PINKY_NAME = 'Pinky'
export const INKY_NAME = 'Inky'
export const CLYDE_NAME = 'Clyde'

export type GhostMarker =
  | typeof BLINKY_MARKER
  | typeof PINKY_MARKER
  | typeof INKY_MARKER
  | typeof CLYDE_MARKER
export type GhostName =
  | typeof BLINKY_NAME
  | typeof PINKY_NAME
  | typeof INKY_NAME
  | typeof CLYDE_NAME

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

export const PINKY_LOOKAHEAD_TILES = 4
export const INKY_LOOKAHEAD_TILES = 2
export const CLYDE_SHY_DISTANCE_TILES = 8

export const DIRECTIONS: Record<DirectionName, Vector3d> = {
  up: $v(0, -1),
  down: $v(0, 1),
  left: $v(-1, 0),
  right: $v(1, 0),
  none: $v(0, 0),
}

export const OPPOSITE_DIRECTIONS: Record<DirectionName, DirectionName> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

export const MAZE_TEMPLATE = [
  // Walls, collectibles, and spawn markers are encoded in one rectangular grid.
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

export const ROW_COUNT = MAZE_TEMPLATE.length
export const COLUMN_COUNT = MAZE_TEMPLATE[0].length

MAZE_TEMPLATE.forEach((row, index) => {
  // Keep the runtime grid rectangular; movement indexes every row by column.
  if ([...row].length !== COLUMN_COUNT)
    throw new Error(
      `Invalid maze width at row ${index}. Expected ${COLUMN_COUNT} but got ${[...row].length}.`,
    )
})
