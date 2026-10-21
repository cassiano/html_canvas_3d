/**
 * Demo 21 — an n-body simulation of the solar system.
 *
 * The demo integrates the gravitational attraction between a set of
 * celestial bodies and then draws them, their orbits and Saturn's rings on
 * the canvas. The mass of the Sun can be adjusted through the control panel
 * created by {@link start}.
 *
 * The simulation runs on its own time scale: for every real second,
 * {@link SIMULATION_SECONDS_PER_REAL_SECOND} simulated seconds elapse, so the
 * Earth completes one orbit in {@link EARTH_ORBIT_DURATION_IN_SECONDS} real
 * seconds.
 */
import { FPS, FPS_LOGGING_FRAME_PERIOD } from '../constants.ts'
import {
  createDemoControlPanel,
  createFrameLoop,
  createSlider,
  createToggle,
  fps,
  frameCount,
  millis,
  timesForEachN,
} from '../utils.ts'
import {
  background,
  render3dScene,
  render3dAxes,
  resetTransformationMatrix,
  text2d,
} from '../primitives.ts'
import { $v } from '../vector_3d.ts'
import { PI } from '../math_utils.ts'
import {
  autoRotationEnabled,
  rotateY,
  rotateX,
  scale,
  isolateTransformations,
  saturnRing,
} from '../primitives.ts'
import { AstronomicalBody } from './astronomical_body.ts'
import { assertIsNotUndefined } from '../utils.ts'
import { rotateZ } from '../primitives.ts'

// -------------------------------------------------------------------------------------------------

/**
 * The universal gravitational constant, used to compute the attraction
 * between two bodies.
 */
export const G = 6.6743e-11 // Universal gravitational constant, in m³ / (kg x s²).
/**
 * One Astronomical Unit: the mean distance between the Earth and the Sun.
 */
export const AU = 149597870.7 // Astronomical Unit (in km).
/**
 * The number of metres in a kilometre.
 */
export const KM_TO_M = 1000 // Conversion factor from km to m.
/**
 * The mass of the Sun, in kilograms.
 */
export const SUN_MASS_IN_KG = 1.9891e30 // Mass of the Sun in kg.
/**
 * The duration of a sidereal Earth year, in days.
 */
export const EARTH_YEAR_IN_DAYS = 365.256363004 // Sidereal year.
/**
 * The duration of a day, in seconds.
 */
export const EARTH_DAY_IN_SECONDS = 24 * 3600
/**
 * The duration of a sidereal Earth year, in seconds.
 */
export const EARTH_YEAR_IN_SECONDS = EARTH_YEAR_IN_DAYS * EARTH_DAY_IN_SECONDS
/**
 * The mean distance between the centres of the Earth and the Moon, in
 * kilometres.
 */
export const EARTH_MOON_DISTANCE_IN_KM = 384399 // Mean Earth-Moon distance in km.
/**
 * The mean radius of the Moon, in kilometres.
 */
export const MOON_RADIUS_IN_KM = 1737.4 // Mean Moon radius in km.
/**
 * The sidereal orbital period of the Moon, in days.
 */
export const MOON_ORBITAL_PERIOD_IN_DAYS = 27.321582 // Sidereal orbital period of the Moon in days.
/**
 * The sidereal orbital period of the Moon, in seconds.
 */
export const MOON_ORBITAL_PERIOD_IN_SECONDS =
  MOON_ORBITAL_PERIOD_IN_DAYS * EARTH_DAY_IN_SECONDS
/**
 * The mean radius of the Earth, in kilometres.
 */
export const EARTH_RADIUS_IN_KM = 6371 // Mean Earth radius in km.
/**
 * How long the Earth takes to complete one orbit in the simulation, in
 * seconds.
 */
export const EARTH_ORBIT_DURATION_IN_SECONDS = 120
/**
 * The distance between the centres of the Earth and the Moon, in metres.
 */
export const EARTH_MOON_CENTERS_DISTANCE_IN_M =
  (EARTH_RADIUS_IN_KM + EARTH_MOON_DISTANCE_IN_KM + MOON_RADIUS_IN_KM) * KM_TO_M // The distance from the Earth's center to the Moon's center in m.

/**
 * The factor applied to the real radius of a body when drawing it.
 */
export const DEFAULT_RADIUS_SCALE = 1 / 5e5
/**
 * The factor applied to the real distance of a body when drawing it.
 */
export const DEFAULT_DISTANCE_SCALE = 3e-1 / AU // Scale down distances to fit the canvas.
/**
 * The factor applied to the Earth-Moon distance when drawing the Moon and
 * its orbit.
 */
export const EARTH_MOON_DISTANCE_SCALE = 25 // Scale up the Earth-Moon distance arbitrarily, so the moon orbits around the Earth in a visually appealing way.

// Simulation seconds advanced per real second so Earth completes one orbit in the target duration.
/**
 * How many simulated seconds elapse for every real second of wall-clock
 * time.
 */
export const SIMULATION_SECONDS_PER_REAL_SECOND =
  EARTH_YEAR_IN_SECONDS / EARTH_ORBIT_DURATION_IN_SECONDS

// -------------------------------------------------------------------------------------------------

/**
 * The distance from Saturn's surface to the innermost ring, in kilometres.
 */
const RINGS_DISTANCE_FROM_SATURN_SURFACE_IN_KM = 6632 // In km. The distance from Saturn's surface to the innermost ring (D ring).

/**
 * The width and the color of each of Saturn's rings.
 */
const SATURN_RINGS_DATA: Record<string, { width: number; color: string }> = {
  // Width in km.
  a: { width: 14585, color: 'lightPink' },
  cassiniDivision: { width: 4800, color: 'black' },
  b: { width: 25554, color: 'magenta' },
  c: { width: 17357, color: 'lightGreen' },
  d: { width: 7594, color: 'purple' },
}

/**
 * Draws the rings around Saturn.
 *
 * @param radius - Saturn's real radius, in metres.
 * @returns Nothing; the rings are drawn on the canvas.
 */
const drawSaturnRings = (radius: number) => {
  let startingRadius =
    (radius + RINGS_DISTANCE_FROM_SATURN_SURFACE_IN_KM * KM_TO_M) *
    DEFAULT_RADIUS_SCALE

  isolateTransformations(() => {
    rotateX(PI / 4)
    rotateZ(millis() / 1500)

    let ringWidth = SATURN_RINGS_DATA.d.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // D ring.
    saturnRing(startingRadius, startingRadius + ringWidth, {
      color: SATURN_RINGS_DATA.d.color,
      opacity: 0.5,
    })

    startingRadius += ringWidth

    ringWidth = SATURN_RINGS_DATA.c.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // C ring.
    saturnRing(startingRadius, startingRadius + ringWidth, {
      color: SATURN_RINGS_DATA.c.color,
      opacity: 0.5,
    })

    startingRadius += ringWidth

    ringWidth = SATURN_RINGS_DATA.b.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // B ring.
    saturnRing(startingRadius, startingRadius + ringWidth, {
      color: SATURN_RINGS_DATA.b.color,
      opacity: 0.5,
    })

    startingRadius += ringWidth

    ringWidth =
      SATURN_RINGS_DATA.cassiniDivision.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // Cassini Division.
    saturnRing(startingRadius, startingRadius + ringWidth, {
      color: SATURN_RINGS_DATA.cassiniDivision.color,
      opacity: 0.5,
    })

    startingRadius += ringWidth

    ringWidth = SATURN_RINGS_DATA.a.width * KM_TO_M * DEFAULT_RADIUS_SCALE

    // A ring.
    saturnRing(startingRadius, startingRadius + ringWidth, {
      color: SATURN_RINGS_DATA.a.color,
      opacity: 0.5,
    })
  })
}

// -------------------------------------------------------------------------------------------------

/**
 * The physical and orbital data describing one body of the solar system.
 */
type SolarSystemBodyType = {
  /** The body's mean radius, in kilometres. */
  radius: number // Mean radius in km.
  /** The factor applied to the body's radius when drawing it. */
  radiusCustomScale?: number
  /** The body's mean distance from the Sun, in Astronomical Units. */
  distanceFromSun: number // In AU.
  /** The body's mass, in kilograms. */
  mass: number // In kg
  /** The CSS color used to draw the body. */
  color: string
  /** The body's sidereal orbital period, in Earth days. */
  orbitalPeriod: number // Aka sidereal orbital period, in (Earth) days.
  /** An optional callback that draws the rings around the body. */
  renderRings?: (radius: number) => void
}

/**
 * The physical and orbital data of every body of the simulated solar
 * system, keyed by the body's name.
 */
const SOLAR_SYSTEM_DATA: Record<string, SolarSystemBodyType> = {
  sun: {
    radius: 695700,
    radiusCustomScale: DEFAULT_RADIUS_SCALE / 15, // Scale down the sun's radius to fit the canvas.
    distanceFromSun: 0,
    mass: SUN_MASS_IN_KG,
    color: 'yellow',
    orbitalPeriod: 0,
  },
  mercury: {
    radius: 2439.4,
    distanceFromSun: 0.387098,
    mass: 0.330103e24,
    color: 'tomato',
    orbitalPeriod: 87.9691,
  },
  venus: {
    radius: 6051.8,
    distanceFromSun: 0.723332,
    mass: 4.86731e24,
    color: 'gold',
    orbitalPeriod: 224.701,
  },
  earth: {
    radius: EARTH_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 5.97217e24,
    color: 'dodgerBlue',
    orbitalPeriod: EARTH_YEAR_IN_DAYS,
  },
  mars: {
    radius: 3389.5,
    distanceFromSun: 1.523679,
    mass: 0.641691e24,
    color: 'red',
    orbitalPeriod: 686.98,
  },
  jupiter: {
    radius: 69911,
    distanceFromSun: 5.2044,
    mass: 1898.125e24,
    color: 'mediumSeaGreen',
    orbitalPeriod: 4332.59,
  },
  saturn: {
    radius: 58232,
    distanceFromSun: 9.5826,
    mass: 568.317e24,
    color: 'orange',
    orbitalPeriod: 10759.22,
    renderRings: drawSaturnRings,
  },
  uranus: {
    radius: 25362,
    distanceFromSun: 19.2184,
    mass: 86.8099e24,
    color: 'purple',
    orbitalPeriod: 30688.5,
  },
  neptune: {
    radius: 24622,
    distanceFromSun: 30.11,
    mass: 102.4092e24,
    color: 'slateBlue',
    orbitalPeriod: 60182,
  },
  moon: {
    radius: MOON_RADIUS_IN_KM,
    distanceFromSun: 1,
    mass: 7.348e22,
    color: 'gray',
    orbitalPeriod: EARTH_YEAR_IN_DAYS, // Around the Sun (same as Earth).
  },
}

// -------------------------------------------------------------------------------------------------

/**
 * The bodies of the simulated solar system, in the order they were
 * declared.
 */
const bodies = Object.entries(SOLAR_SYSTEM_DATA).map(([name, data]) => {
  const {
    radius,
    distanceFromSun,
    mass,
    color,
    orbitalPeriod,
    radiusCustomScale,
    renderRings,
  } = data

  return new AstronomicalBody(
    name,
    radius * KM_TO_M, // Convert radius from km to m.
    distanceFromSun * AU * KM_TO_M, // Convert from AU to m.
    mass,
    color,
    orbitalPeriod * EARTH_DAY_IN_SECONDS, // Convert from days to seconds.
    radiusCustomScale,
    renderRings,
  )
})

/**
 * The Earth, as part of the simulated solar system.
 *
 * It is the reference body used to place the Moon and to draw the Moon's
 * orbit.
 */
export const earth = bodies.find(body => body.name === 'earth')
assertIsNotUndefined(earth)

/**
 * The Sun, as part of the simulated solar system.
 *
 * Its mass can be changed at runtime through the demo's control panel.
 */
export const sun = bodies.find(body => body.name === 'sun')
assertIsNotUndefined(sun)

/**
 * The timestamp of the previous frame, used to measure the time elapsed
 * between two frames. It is `null` until the first frame is drawn.
 */
let lastTickMillis: number | null = null

// -------------------------------------------------------------------------------------------------

// Get the canvas container
/**
 * The DOM element that hosts the canvas and the demo's control panel.
 */
const canvasContainer = document.getElementById('canvas-container')
if (!canvasContainer) throw new Error('canvasContainer not found')

/**
 * The demo's control panel, while it is mounted in the DOM.
 */
let demoControlPanel: HTMLDivElement | null

/**
 * The demo's controls, grouped by the kind of control they are.
 */
type FormType = {
  /** The demo's sliders, keyed by their purpose. */
  sliders?: Record<'spacing', ReturnType<typeof createSlider>>
  /** The demo's toggles, keyed by their purpose. */
  toggles?: Record<'rotateAroundYAxis', ReturnType<typeof createToggle>>
}

/**
 * The controls exposed by the demo.
 *
 * The object is populated when the demo starts and holds references to the
 * controls that have been created.
 */
export const demoForm: FormType = {}

/**
 * Creates the demo's control panel and its controls.
 *
 * The panel is appended to the canvas container and the created controls
 * are registered in {@link demoForm}.
 *
 * @returns Nothing; the control panel is added to the DOM.
 */
const createDemoControls = () => {
  demoControlPanel = createDemoControlPanel(canvasContainer)

  demoForm.sliders = {
    spacing: createSlider({
      label: `Sun's mass in % of original value (${(SUN_MASS_IN_KG / 1e30).toFixed(4)} 𝒙 10³⁰ kg)`,
      min: 0.01,
      max: 5,
      value: 1,
      step: 0.01,
      container: demoControlPanel,
      valueFormatter: v => (v * 100).toFixed(0) + '%',
      onChange: value => {
        sun.mass = value * SUN_MASS_IN_KG
      },
    }),
  }
}

// -------------------------------------------------------------------------------------------------

/**
 * Advances the simulation by one frame and draws the scene.
 *
 * Every body attracts every other body, then every body is moved forward
 * and drawn.
 *
 * @returns Nothing; the simulation state and the canvas are updated in
 *   place.
 * @throws {Error} When two bodies occupy the same position, or when a body
 *   has a mass of `0`, while the gravitational attractions are computed.
 */
const draw = () => {
  if (frameCount() % FPS_LOGGING_FRAME_PERIOD === 0) console.log({ fps: fps() })

  const now = millis()
  const deltaSeconds =
    lastTickMillis === null ? 1 / FPS : (now - lastTickMillis) / 1000

  lastTickMillis = now

  const simulationDeltaSeconds =
    deltaSeconds * SIMULATION_SECONDS_PER_REAL_SECOND

  background('black')

  scale(1.3)
  rotateX(PI / 20)

  if (autoRotationEnabled) rotateY(-millis() / 5000)
  else rotateY(PI / 6)

  render3dAxes()

  timesForEachN([bodies.length, bodies.length], (i, j) => {
    if (i !== j) bodies[i].attract(bodies[j])
  })

  bodies.forEach(body => {
    body.update(simulationDeltaSeconds)
    body.render()
  })
}

/**
 * Draws the indicator shown while the animation loop is paused.
 *
 * @returns Nothing; the indicator is drawn on the canvas.
 */
const onPaused = () => {
  text2d('PAUSED', $v(0, 300))
}

/**
 * The animation loop that drives the demo, along with the callback used to
 * display the pause indicator.
 */
const { start: startFrameLoop, stop: stopFrameLoop } = createFrameLoop(
  () => {
    resetTransformationMatrix()
    draw()
    render3dScene()
  },
  onPaused,
  FPS,
)

/**
 * Starts the demo.
 *
 * Creates the demo's control panel and begins the animation loop.
 *
 * @returns Nothing; the animation loop is started.
 */
const start = () => {
  createDemoControls()
  startFrameLoop()
}

/**
 * Stops the demo.
 *
 * Removes the demo's control panel from the DOM and ends the animation
 * loop.
 *
 * @returns Nothing; the animation loop is stopped.
 */
const stop = () => {
  demoControlPanel?.remove()
  demoControlPanel = null

  stopFrameLoop()
}

export { start, stop }
