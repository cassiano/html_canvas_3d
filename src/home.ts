import { timesForEach, timesMap, timesReduce } from './utils.ts'
const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

const DEMO_COUNT = 4
const DEFAULT_DEMO = 0

const demoPaths = timesMap(DEMO_COUNT, i => `./demo${i + 1}/main.js`)

const demoButtons: HTMLButtonElement[] = timesMap(
  DEMO_COUNT,
  i => document.getElementById(`demo${i + 1}`) as HTMLButtonElement,
)

let currentDemo: { start: () => void; stop: () => void } | null = null
let currentButton: HTMLButtonElement | null = null
let currentDemoPath = demoPaths[DEFAULT_DEMO]

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
  if (event.key === 'ArrowUp') {
    event.preventDefault()

    navigateDemo(-1)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()

    navigateDemo(1)
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

// Load demo1 by default
loadDemo(demoPaths[DEFAULT_DEMO])
setActiveButton(demoPaths[DEFAULT_DEMO])
