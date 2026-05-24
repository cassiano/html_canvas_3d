import { timesForEach, timesMap, timesReduce, togglePause } from './utils.ts'
import { animation, addDragRotation, resetDragRotation } from './primitives.ts'

///////////////////////
// AI-generated code //
///////////////////////

const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

const DEMO_COUNT = 9
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
  } else if (+event.key >= 1 && +event.key <= DEMO_COUNT) {
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

  const deltaX = event.clientX - lastPointerX
  const deltaY = event.clientY - lastPointerY

  lastPointerX = event.clientX
  lastPointerY = event.clientY

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
})

// Load demo1 by default
loadDemo(demoPaths[DEFAULT_DEMO - 1])
setActiveButton(demoPaths[DEFAULT_DEMO - 1])
