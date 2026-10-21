import { min } from './math_utils.ts'
import {
  addDragRotation,
  addPanOffset,
  addZoom,
  animation,
  resetDragRotation,
  resetPanOffset,
  resetZoom,
  setAutoRotationCheckboxEnabled,
  setRender3dAxesEnabled,
  setshowNormals,
} from './primitives.ts'
import { timesForEach, timesMap, timesReduce, togglePause } from './utils.ts'

///////////////////////
// AI-generated code //
///////////////////////

/**
 * The DOM element that hosts the animation canvas.
 *
 * The canvas is always resized to match the size of this container.
 */
const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

// Function to resize canvas to fit its container
/**
 * Resizes the animation canvas so that it matches the size of its container.
 *
 * Called once during bootstrap and again on every window resize event.
 *
 * @returns Nothing; the canvas element dimensions are updated in place.
 * @throws {Error} Never.
 */
function resizeCanvas() {
  const rect = canvasContainer.getBoundingClientRect()

  animation.width = rect.width
  animation.height = rect.height
}

// Resize canvas on load and window resize
resizeCanvas()
self.addEventListener('resize', resizeCanvas)

/** Total number of demos shipped with the application. */
const DEMO_COUNT = 22

/** The demo shown when the URL does not request a specific one. */
const DEFAULT_DEMO = 1 // Starting with 1.

// Enable drag rotation and pan on the canvas.
/** Radians of rotation applied per pixel of pointer movement. */
const ROTATION_SENSITIVITY = 0.005

/** World-space units panned per pixel of pointer movement. */
const PAN_SENSITIVITY = 0.5

// Enable pinch zoom via trackpad (Ctrl/Cmd + wheel).
/** Zoom factor applied per unit of wheel delta. */
const ZOOM_SENSITIVITY = 0.005

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2216ycxo8haHnk1SCg2AMhUQFdqJVPgdLF7%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
const demoModules = import.meta.glob('./demo*/main.ts') // Using Vite's glob.

/** The module path of each demo, indexed by demo number minus one. */
const demoPaths = timesMap(DEMO_COUNT, i => `./demo${i + 1}/main.ts`)

/** The module path of the Pac-Man demo, which uses the arrow keys for gameplay. */
const PACMAN_DEMO_PATH = './demo22/main.ts'

/** The menu button that activates each demo, indexed by demo number minus one. */
const demoButtons: HTMLButtonElement[] = timesMap(
  DEMO_COUNT,
  i => document.getElementById(`demo${i + 1}`) as HTMLButtonElement,
)

/** The currently running demo module, or `null` before the first demo loads. */
let currentDemo: { start: () => void; stop: () => void } | null = null

/** The menu button currently highlighted as active. */
let currentButton: HTMLButtonElement | null = null

/** The module path of the demo that is currently selected. */
let currentDemoPath = demoPaths[DEFAULT_DEMO - 1]

/**
 * Reads the requested demo number from the page URL.
 *
 * @returns The demo number requested via the `demo_id` query parameter, or
 *   `null` when the parameter is missing, is not an integer, or is outside the
 *   range of available demos.
 * @throws {Error} Never.
 */
function getDemoIdFromUrl(): number | null {
  // deno-lint-ignore no-window
  const params = new URLSearchParams(window.location.search)
  const demoId = Number(params.get('demo_id'))

  if (!Number.isInteger(demoId)) return null
  if (demoId < 1 || demoId > DEMO_COUNT) return null

  return demoId
}

/** The demo selected on startup, either from the URL or the default one. */
const initialDemoId = getDemoIdFromUrl() ?? DEFAULT_DEMO
currentDemoPath = demoPaths[initialDemoId - 1]

/** Maps a demo module path to the menu button that activates it. */
const demoButtonMap = timesReduce(
  DEMO_COUNT,
  (acc: Record<string, HTMLButtonElement>, i) => {
    acc[demoPaths[i]] = demoButtons[i]

    return acc
  },
  {},
)

/**
 * Makes the canvas container visible.
 *
 * Called after a demo has been loaded successfully.
 *
 * @returns Nothing; the container's inline style is updated.
 * @throws {Error} Never.
 */
function showDemo() {
  canvasContainer.style.display = 'flex'
}

/**
 * Moves the selection to the previous or next demo, wrapping around the ends.
 *
 * @param delta - Number of positions to move. Use `-1` to go to the previous
 *   demo and `1` to go to the next one.
 * @returns Nothing; the selected demo is switched as a side effect.
 * @throws {Error} Never.
 */
function navigateDemo(delta: number) {
  const currentIndex = demoPaths.indexOf(currentDemoPath)

  if (currentIndex === -1) return

  const nextIndex = (currentIndex + delta + demoPaths.length) % demoPaths.length
  const nextPath = demoPaths[nextIndex]

  switchDemo(nextPath)
}

/**
 * Handles global keyboard shortcuts for navigating between demos.
 *
 * `ArrowUp`/`ArrowLeft` and `ArrowDown`/`ArrowRight` move between demos,
 * `Shift` + `ArrowUp`/`ArrowDown` do the same in the Pac-Man demo (where the
 * unshifted arrow keys drive gameplay), digits `1` to `9` jump straight to a
 * demo, and `p` toggles pause.
 *
 * @param event - The keyboard event that triggered the handler.
 * @returns Nothing; the selected demo or the pause state may change as a
 *   side effect.
 * @throws {Error} Never.
 */
function handleKeydown(event: KeyboardEvent) {
  // Shift + Up/Down navigates demos in every demo, including the Pac-Man one,
  // where the unshifted arrow keys are reserved for gameplay movement.
  if (event.shiftKey && event.key === 'ArrowUp') {
    event.preventDefault()

    navigateDemo(-1)

    return
  }

  if (event.shiftKey && event.key === 'ArrowDown') {
    event.preventDefault()

    navigateDemo(1)

    return
  }

  if (
    currentDemoPath === PACMAN_DEMO_PATH &&
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    return
  }

  if (['ArrowUp', 'ArrowLeft'].includes(event.key)) {
    event.preventDefault()

    navigateDemo(-1)
  } else if (['ArrowDown', 'ArrowRight'].includes(event.key)) {
    event.preventDefault()

    navigateDemo(1)
  } else if (+event.key >= 1 && +event.key <= min(DEMO_COUNT, 9)) {
    event.preventDefault()

    switchDemo(demoPaths[+event.key - 1])
  } else if (event.key.toLowerCase() === 'p') {
    event.preventDefault()

    togglePause()
  }
}

document.addEventListener('keydown', handleKeydown)

/**
 * Highlights the menu button that corresponds to the given demo.
 *
 * @param demoPath - Module path of the demo whose button should be activated.
 * @returns Nothing; the previously active button is deactivated and the new
 *   one is activated.
 * @throws {Error} Never.
 */
function setActiveButton(demoPath: string) {
  currentButton?.classList.remove('active')

  currentButton = demoButtonMap[demoPath]
  currentButton.classList.add('active')
}

/**
 * Selects a different demo, stopping the one that is currently running.
 *
 * @param demoPath - Module path of the demo to activate.
 * @returns Nothing; the demo is loaded asynchronously as a side effect.
 * @throws {Error} Never. Failures while loading are reported to the console.
 */
function switchDemo(demoPath: string) {
  currentDemo?.stop()
  currentDemoPath = demoPath

  loadDemo(demoPath)
  setActiveButton(demoPath)
}

/**
 * Lazily imports a demo module and starts it.
 *
 * @param demoPath - Module path of the demo to load, as produced by
 *   {@link demoPaths}.
 * @returns A promise that resolves once the demo has been started, or that
 *   resolves without starting anything when loading fails.
 * @throws {Error} Never. Load failures are caught and logged to the console
 *   instead of being propagated.
 */
async function loadDemo(demoPath: string) {
  try {
    if (!demoModules[demoPath]) throw new Error(`Demo not found: ${demoPath}`)

    // Notice the glob returns a function which in turn returns a Promise.
    const module = (await demoModules[demoPath]()) as {
      start: () => void
      stop: () => void
    }

    currentDemo = { start: module.start, stop: module.stop }
    currentDemo.start()

    showDemo()
  } catch (error) {
    console.error('Failed to load demo:', error)
  }
}

timesForEach(DEMO_COUNT, i => {
  demoButtons[i].addEventListener('click', () => switchDemo(demoPaths[i]))
})

/**
 * The checkbox that toggles the display of surface normals.
 */
const showNormalsCheckbox = document.getElementById(
  'show-normals-checkbox',
) as HTMLInputElement

/**
 * The checkbox that toggles the display of the 3D axis indicators.
 */
const show3dAxesCheckbox = document.getElementById(
  'show-3d-axes-checkbox',
) as HTMLInputElement

show3dAxesCheckbox.checked = true

/**
 * The checkbox that toggles the automatic rotation of the scene.
 */
const enableAutoRotationCheckbox = document.getElementById(
  'enable-auto-rotation-checkbox',
) as HTMLInputElement

enableAutoRotationCheckbox.checked = true

showNormalsCheckbox.addEventListener('change', () => {
  setshowNormals(showNormalsCheckbox.checked)
})

show3dAxesCheckbox.addEventListener('change', () => {
  setRender3dAxesEnabled(show3dAxesCheckbox.checked)
})

enableAutoRotationCheckbox.addEventListener('change', () => {
  setAutoRotationCheckboxEnabled(enableAutoRotationCheckbox.checked)
})

/** Whether a pointer drag is currently in progress. */
let isDragging = false

/** Whether the active drag rotates the scene or pans it. */
let dragMode: 'rotate' | 'pan' | null = null

/** The pointer identifier of the drag that is currently in progress. */
let activePointerId: number | null = null

/** The last horizontal pointer position observed during a drag. */
let lastPointerX = 0

/** The last vertical pointer position observed during a drag. */
let lastPointerY = 0

animation.style.touchAction = 'none'
animation.addEventListener('contextmenu', event => event.preventDefault())

animation.addEventListener('pointerdown', event => {
  const isLeftButton = event.button === 0
  const isSecondaryButton = event.button === 1 || event.button === 2

  if (!isLeftButton && !isSecondaryButton) return

  event.preventDefault()
  animation.setPointerCapture(event.pointerId)

  isDragging = true
  dragMode = isLeftButton && !event.shiftKey ? 'rotate' : 'pan'
  activePointerId = event.pointerId
  lastPointerX = event.clientX
  lastPointerY = event.clientY
})

animation.addEventListener('pointermove', event => {
  if (!isDragging || event.pointerId !== activePointerId) return

  event.preventDefault()

  const { clientX, clientY } = event
  const deltaX = clientX - lastPointerX
  const deltaY = clientY - lastPointerY

  lastPointerX = clientX
  lastPointerY = clientY

  if (dragMode === 'pan') {
    addPanOffset(deltaX, deltaY)
  } else {
    addDragRotation(
      deltaY * ROTATION_SENSITIVITY,
      deltaX * ROTATION_SENSITIVITY,
    )
  }
})

/**
 * Ends the active pointer drag and releases the captured pointer.
 *
 * @param event - The pointer event that ended the drag.
 * @returns Nothing; the drag state is reset as a side effect.
 * @throws {Error} Never.
 */
const endPointerDrag = (event: PointerEvent) => {
  if (!isDragging || event.pointerId !== activePointerId) return

  isDragging = false
  dragMode = null
  activePointerId = null
  animation.releasePointerCapture(event.pointerId)
}

animation.addEventListener('pointerup', endPointerDrag)
animation.addEventListener('pointercancel', endPointerDrag)

animation.addEventListener('dblclick', event => {
  event.preventDefault()

  resetDragRotation()
  resetZoom()
  resetPanOffset()
})

animation.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()

    const zoomDelta = -event.deltaY * ZOOM_SENSITIVITY
    addZoom(zoomDelta)
    return
  }

  if (event.deltaX === 0 && event.deltaY === 0) return

  event.preventDefault()
  addPanOffset(event.deltaX * PAN_SENSITIVITY, event.deltaY * PAN_SENSITIVITY)
})

// Load the selected demo from the URL (or fallback to the default)
loadDemo(currentDemoPath)
setActiveButton(currentDemoPath)
