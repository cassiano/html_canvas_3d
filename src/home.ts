import { timesForEach, timesMap, timesReduce, togglePause } from './utils.ts'
import { resetZoom, resetPanOffset, setRenderNormals } from './primitives.ts'
import {
  animation,
  addDragRotation,
  resetDragRotation,
  addPanOffset,
  addZoom,
} from './primitives.ts'
import { min } from './math_utils.ts'

///////////////////////
// AI-generated code //
///////////////////////

const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

const DEMO_COUNT = 16
const DEFAULT_DEMO = 1 // Starting with 1.

// Enable drag rotation and pan on the canvas.
const ROTATION_SENSITIVITY = 0.005
const PAN_SENSITIVITY = 0.5

// Enable pinch zoom via trackpad (Ctrl/Cmd + wheel).
const ZOOM_SENSITIVITY = 0.005

// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2216ycxo8haHnk1SCg2AMhUQFdqJVPgdLF7%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
const demoModules = import.meta.glob('./demo*/main.ts') // Using Vite's glob.
const demoPaths = timesMap(DEMO_COUNT, i => `./demo${i + 1}/main.ts`)

const demoButtons: HTMLButtonElement[] = timesMap(
  DEMO_COUNT,
  i => document.getElementById(`demo${i + 1}`) as HTMLButtonElement,
)

let currentDemo: { start: () => void; stop: () => void } | null = null
let currentButton: HTMLButtonElement | null = null
let currentDemoPath = demoPaths[DEFAULT_DEMO - 1]

function getDemoIdFromUrl(): number | null {
  // deno-lint-ignore no-window
  const params = new URLSearchParams(window.location.search)
  const demoId = Number(params.get('demo_id'))

  if (!Number.isInteger(demoId)) return null
  if (demoId < 1 || demoId > DEMO_COUNT) return null

  return demoId
}

const initialDemoId = getDemoIdFromUrl() ?? DEFAULT_DEMO
currentDemoPath = demoPaths[initialDemoId - 1]

const demoButtonMap = timesReduce(
  DEMO_COUNT,
  (acc: Record<string, HTMLButtonElement>, i) => {
    acc[demoPaths[i]] = demoButtons[i]

    return acc
  },
  {},
)

function showDemo() {
  canvasContainer.style.display = 'flex'
}

function navigateDemo(delta: number) {
  const currentIndex = demoPaths.indexOf(currentDemoPath)

  if (currentIndex === -1) return

  const nextIndex = (currentIndex + delta + demoPaths.length) % demoPaths.length
  const nextPath = demoPaths[nextIndex]

  switchDemo(nextPath)
}

function handleKeydown(event: KeyboardEvent) {
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

function setActiveButton(demoPath: string) {
  currentButton?.classList.remove('active')

  currentButton = demoButtonMap[demoPath]
  currentButton.classList.add('active')
}

function switchDemo(demoPath: string) {
  currentDemo?.stop()
  currentDemoPath = demoPath

  loadDemo(demoPath)
  setActiveButton(demoPath)
}

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

const renderNormalsCheckbox = document.getElementById(
  'render-normals-checkbox',
) as HTMLInputElement

renderNormalsCheckbox.addEventListener('change', () => {
  setRenderNormals(renderNormalsCheckbox.checked)
})

let isDragging = false
let dragMode: 'rotate' | 'pan' | null = null
let activePointerId: number | null = null
let lastPointerX = 0
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
