import { createToggle, createSlider } from '../utils.ts'

type Demo17FormType = {
  sliders?: Record<
    'minParticles' | 'maxParticles' | 'launchesPer100Frames',
    ReturnType<typeof createSlider>
  >
  toggles?: Record<'renderIn3d', ReturnType<typeof createToggle>>
}

export const demo17Form: Demo17FormType = {}

export const minParticles = () => sliders().minParticles.getValue()

export const maxParticles = () => sliders().maxParticles.getValue()

export const launchesPer100Frames = () =>
  sliders().launchesPer100Frames.getValue()

export const renderIn3d = () => toggles().renderIn3d.getValue()

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
