import { createToggle, createSlider } from '../utils.ts'

type Demo17FormType = {
  sliders?: Record<
    'minParticles' | 'maxParticles' | 'launchPeriod',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<'show3dAxes' | 'renderIn3d', ReturnType<typeof createToggle>>
}

export const demo17Form: Demo17FormType = {}

export const minParticles = () => {
  return sliders().minParticles.getValue()
}

export const maxParticles = () => {
  return sliders().maxParticles.getValue()
}

export const launchPeriod = () => {
  return sliders().launchPeriod.getValue()
}

export const show3dAxes = () => {
  return toggles().show3dAxes.getValue()
}

export const renderIn3d = () => {
  return toggles().renderIn3d.getValue()
}

const sliders = () => {
  if (!demo17Form.sliders)
    throw new Error('demo3Form.sliders should contain a value')

  return demo17Form.sliders
}

const toggles = () => {
  if (!demo17Form.toggles)
    throw new Error('demo3Form.toggles should contain a value')

  return demo17Form.toggles
}
