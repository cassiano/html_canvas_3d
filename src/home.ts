const canvasContainer = document.getElementById(
  'canvas-container',
) as HTMLDivElement

const demo1Button = document.getElementById('demo1') as HTMLButtonElement
const demo2Button = document.getElementById('demo2') as HTMLButtonElement
const demo3Button = document.getElementById('demo3') as HTMLButtonElement
const demo4Button = document.getElementById('demo4') as HTMLButtonElement

let currentDemo: { start: () => void; stop: () => void } | null = null
let currentButton: HTMLButtonElement | null = null
let currentDemoPath = './demo1/main.js'

const DEMO_PATHS = [
  './demo1/main.js',
  './demo2/main.js',
  './demo3/main.js',
  './demo4/main.js',
]

const demoButtonMap = {
  [DEMO_PATHS[0]]: demo1Button,
  [DEMO_PATHS[1]]: demo2Button,
  [DEMO_PATHS[2]]: demo3Button,
  [DEMO_PATHS[3]]: demo4Button,
}

function showDemo() {
  canvasContainer.style.display = 'flex'
}

function navigateDemo(delta: number) {
  const currentIndex = DEMO_PATHS.indexOf(currentDemoPath)
  if (currentIndex === -1) return

  const nextIndex =
    (currentIndex + delta + DEMO_PATHS.length) % DEMO_PATHS.length
  const nextPath = DEMO_PATHS[nextIndex]
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

  currentButton = demoButtonMap[demoPath as keyof typeof demoButtonMap]
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

demo1Button.addEventListener('click', () => switchDemo('./demo1/main.js'))
demo2Button.addEventListener('click', () => switchDemo('./demo2/main.js'))
demo3Button.addEventListener('click', () => switchDemo('./demo3/main.js'))
demo4Button.addEventListener('click', () => switchDemo('./demo4/main.js'))

// Load demo1 by default
loadDemo('./demo1/main.js')
setActiveButton('./demo1/main.js')
