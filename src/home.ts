import { timesForEach, timesMap, timesReduce, togglePause } from './utils.ts'
import { resetZoom, setRenderNormals } from './primitives.ts'
import {
  animation,
  addDragRotation,
  resetDragRotation,
  addZoom,
} from './primitives.ts'
import { min } from './math_utils.ts'

///////////////////////
// AI-generated code //
///////////////////////

const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

const DEMO_COUNT = 10
const DEFAULT_DEMO = 1 // Starting with 1.

const demoPaths = timesMap(DEMO_COUNT, i => `./demo${i + 1}/main.js`)

const demoButtons: HTMLButtonElement[] = timesMap(
  DEMO_COUNT,
  i => document.getElementById(`demo${i + 1}`) as HTMLButtonElement,
)

let currentDemo: { start: () => void; stop: () => void } | null = null
let currentButton: HTMLButtonElement | null = null
let currentDemoPath = demoPaths[DEFAULT_DEMO - 1]

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
    const module = await import(/* @vite-ignore */ demoPath)

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

// Enable drag rotation on the canvas.
const ROTATION_SENSITIVITY = 0.005
let isDragging = false
let activePointerId: number | null = null
let lastPointerX = 0
let lastPointerY = 0

animation.style.touchAction = 'none'

animation.addEventListener('pointerdown', event => {
  if (event.button !== 0) return

  event.preventDefault()
  animation.setPointerCapture(event.pointerId)

  isDragging = true
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

  addDragRotation(deltaY * ROTATION_SENSITIVITY, deltaX * ROTATION_SENSITIVITY)
})

const endPointerDrag = (event: PointerEvent) => {
  if (!isDragging || event.pointerId !== activePointerId) return

  isDragging = false
  activePointerId = null
  animation.releasePointerCapture(event.pointerId)
}

animation.addEventListener('pointerup', endPointerDrag)
animation.addEventListener('pointercancel', endPointerDrag)

animation.addEventListener('dblclick', event => {
  event.preventDefault()

  resetDragRotation()
  resetZoom()
})

// Enable pinch zoom via trackpad (Ctrl/Cmd + wheel).
const ZOOM_SENSITIVITY = 0.0025

animation.addEventListener('wheel', event => {
  if (!(event.ctrlKey || event.metaKey)) return

  event.preventDefault()

  const zoomDelta = -event.deltaY * ZOOM_SENSITIVITY
  addZoom(zoomDelta)
})

// Load demo1 by default
loadDemo(demoPaths[DEFAULT_DEMO - 1])
setActiveButton(demoPaths[DEFAULT_DEMO - 1])
