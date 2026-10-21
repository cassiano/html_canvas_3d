import { createToggle, createSlider } from '../utils.ts'

/**
 * The shape of the demo's control panel state.
 *
 * The sliders and the toggle are only present once the demo's control panel
 * has been created.
 */
type Demo17FormType = {
  sliders?: Record<
    'minParticles' | 'maxParticles' | 'launchesPer100Frames',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<'renderIn3d', ReturnType<typeof createToggle>>
}

/**
 * The demo's control panel state.
 *
 * The demo's `main` module fills this object with the controls it creates, so
 * that the rest of the demo can read the user's choices.
 */
export const demo17Form: Demo17FormType = {}

/**
 * Returns the minimum number of particles an explosion may have.
 *
 * @returns The value of the "Particles (min)" slider.
 * @throws {Error} With the message `demo17Form.sliders should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
export const minParticles = () => sliders().minParticles.getValue()

/**
 * Returns the maximum number of particles an explosion may have.
 *
 * @returns The value of the "Particles (max)" slider.
 * @throws {Error} With the message `demo17Form.sliders should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
export const maxParticles = () => sliders().maxParticles.getValue()

/**
 * Returns how many fireworks are launched every 100 frames.
 *
 * @returns The value of the "Launches per 100 frames" slider.
 * @throws {Error} With the message `demo17Form.sliders should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
export const launchesPer100Frames = () =>
  sliders().launchesPer100Frames.getValue()

/**
 * Tells whether the demo should render the fireworks in 3D.
 *
 * @returns The value of the "3D version?" toggle.
 * @throws {Error} With the message `demo17Form.toggles should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
export const renderIn3d = () => toggles().renderIn3d.getValue()

/**
 * Returns the demo's sliders.
 *
 * @returns The sliders held by the demo's control panel state.
 * @throws {Error} With the message `demo17Form.sliders should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
const sliders = () => {
  if (!demo17Form.sliders)
    throw new Error('demo17Form.sliders should contain a value')

  return demo17Form.sliders
}

/**
 * Returns the demo's toggles.
 *
 * @returns The toggles held by the demo's control panel state.
 * @throws {Error} With the message `demo17Form.toggles should contain a
 *   value`, when the demo's control panel has not been created yet.
 */
const toggles = () => {
  if (!demo17Form.toggles)
    throw new Error('demo17Form.toggles should contain a value')

  return demo17Form.toggles
}
