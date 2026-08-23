import { floor, random } from '../math_utils.ts'
import { millis } from '../utils.ts'

export const WAKA_INTERVAL_MS = 95
export const POWER_SIREN_LOOP_MS = 900

export type AudioToneOptions = {
  type?: OscillatorType
  gain?: number
}

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let lastWakaMillis = -Infinity
let wakaHighTone = false
let powerSirenTimer: number | null = null

export function ensureAudio() {
  // Browsers often create audio contexts only after user interaction. Keep a
  // lazy singleton and reuse its master gain for every synthesized effect.
  if (audioContext && masterGain) return true

  const AudioContextClass = self.AudioContext

  if (!AudioContextClass) return false

  audioContext = new AudioContextClass()
  masterGain = audioContext.createGain()
  masterGain.gain.value = 0.2
  masterGain.connect(audioContext.destination)

  const sampleRate = audioContext.sampleRate
  const bufferSize = sampleRate
  noiseBuffer = audioContext.createBuffer(1, bufferSize, sampleRate)
  const data = noiseBuffer.getChannelData(0)

  for (let i = 0; i < bufferSize; i++) data[i] = random() * 2 - 1

  return true
}

export function resumeAudio() {
  if (!ensureAudio() || !audioContext) return
  if (audioContext.state === 'suspended') audioContext.resume()
}

export function playTone(
  frequency: number,
  duration = 0.08,
  { type = 'square', gain = 0.25 }: AudioToneOptions = {},
) {
  // Each tone gets its own oscillator and gain envelope, allowing overlapping
  // effects without mutating the shared audio state.
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const envelope = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(envelope)
  envelope.connect(masterGain)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export function playSweep(
  startFrequency: number,
  endFrequency: number,
  duration: number,
  { type = 'triangle', gain = 0.2 }: AudioToneOptions = {},
) {
  // Frequency ramps create directional effects while the gain envelope avoids
  // abrupt clicks at the start and end.
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const envelope = audioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(
    endFrequency,
    now + duration,
  )
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.015)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(envelope)
  envelope.connect(masterGain)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.03)
}

export function playNoiseBurst(duration = 0.12, gain = 0.08) {
  // Reuse the pre-generated noise buffer for short arcade-style impact sounds.
  if (!ensureAudio() || !audioContext || !masterGain || !noiseBuffer) return

  const now = audioContext.currentTime
  const source = audioContext.createBufferSource()
  const filter = audioContext.createBiquadFilter()
  const envelope = audioContext.createGain()

  source.buffer = noiseBuffer
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1200, now)
  filter.Q.value = 6
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(gain, now + 0.01)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  source.connect(filter)
  filter.connect(envelope)
  envelope.connect(masterGain)
  source.start(now)
  source.stop(now + duration + 0.02)
}

export function playWaka() {
  // Throttle pellet sounds so fast movement does not create an unpleasant
  // burst of overlapping effects; alternating pitch supplies the rhythm.
  const nowMillis = millis()

  if (nowMillis - lastWakaMillis < WAKA_INTERVAL_MS) return

  lastWakaMillis = nowMillis
  wakaHighTone = !wakaHighTone
  playTone(wakaHighTone ? 780 : 620, 0.055, {
    type: 'square',
    gain: 0.18,
  })
}

export function playPowerPellet() {
  // Layer oscillators, filters, and modulation sources into one evolving
  // effect instead of using a flat beep.
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const duration = 1.08
  const stepDuration = 0.056
  const stepCount = floor(duration / stepDuration)
  const carrier = audioContext.createOscillator()
  const carrierDetuned = audioContext.createOscillator()
  const harmonic = audioContext.createOscillator()
  const subCarrier = audioContext.createOscillator()
  const tremolo = audioContext.createOscillator()
  const tremoloGain = audioContext.createGain()
  const vibrato = audioContext.createOscillator()
  const vibratoGain = audioContext.createGain()
  const postDrive = audioContext.createGain()
  const bandpass = audioContext.createBiquadFilter()
  const lowpass = audioContext.createBiquadFilter()
  const envelope = audioContext.createGain()

  carrier.type = 'sawtooth'
  carrierDetuned.type = 'sawtooth'
  harmonic.type = 'square'
  subCarrier.type = 'triangle'
  carrierDetuned.detune.setValueAtTime(-12, now)

  for (let i = 0; i <= stepCount; i++) {
    const t = now + i * stepDuration
    const risingBias = i * 22
    const tone = i % 2 === 0 ? 660 + risingBias : 1040 + risingBias
    carrier.frequency.setValueAtTime(tone, t)
    carrierDetuned.frequency.setValueAtTime(tone * 0.995, t)
    harmonic.frequency.setValueAtTime(tone * 1.98, t)
    subCarrier.frequency.setValueAtTime(tone * 0.46, t)
  }

  tremolo.type = 'square'
  tremolo.frequency.setValueAtTime(15.5, now)
  tremoloGain.gain.setValueAtTime(0.07, now)
  vibrato.type = 'sine'
  vibrato.frequency.setValueAtTime(9.8, now)
  vibratoGain.gain.setValueAtTime(34, now)
  bandpass.type = 'bandpass'
  bandpass.frequency.setValueAtTime(1600, now)
  bandpass.frequency.linearRampToValueAtTime(2300, now + duration)
  bandpass.Q.value = 5.5
  lowpass.type = 'lowpass'
  lowpass.frequency.setValueAtTime(3200, now)
  lowpass.frequency.linearRampToValueAtTime(1850, now + duration)
  lowpass.Q.value = 1.1
  postDrive.gain.setValueAtTime(1.15, now)
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(0.23, now + 0.012)
  envelope.gain.linearRampToValueAtTime(0.16, now + duration * 0.7)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  tremolo.connect(tremoloGain)
  tremoloGain.connect(envelope.gain)
  vibrato.connect(vibratoGain)
  vibratoGain.connect(carrier.frequency)
  vibratoGain.connect(carrierDetuned.frequency)
  carrier.connect(bandpass)
  carrierDetuned.connect(bandpass)
  harmonic.connect(bandpass)
  subCarrier.connect(bandpass)
  bandpass.connect(lowpass)
  lowpass.connect(postDrive)
  postDrive.connect(envelope)
  envelope.connect(masterGain)

  const oscillators = [
    carrier,
    carrierDetuned,
    harmonic,
    subCarrier,
    tremolo,
    vibrato,
  ]
  oscillators.forEach(oscillator => {
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  })

  playNoiseBurst(0.06, 0.032)
  playNoiseBurst(0.1, 0.024)
  playNoiseBurst(0.14, 0.018)
}

export function playCherryPickup() {
  // Combine a melodic lead with filtered delayed feedback for a brighter
  // reward sound.
  if (!ensureAudio() || !audioContext || !masterGain) return

  const now = audioContext.currentTime
  const duration = 0.34
  const lead = audioContext.createOscillator()
  const body = audioContext.createOscillator()
  const sparkle = audioContext.createOscillator()
  const shimmer = audioContext.createOscillator()
  const preGain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  const wetFilter = audioContext.createBiquadFilter()
  const delay = audioContext.createDelay(0.5)
  const feedback = audioContext.createGain()
  const wetGain = audioContext.createGain()
  const envelope = audioContext.createGain()

  lead.type = 'triangle'
  body.type = 'sawtooth'
  sparkle.type = 'sine'
  shimmer.type = 'square'
  body.detune.setValueAtTime(-7, now)
  shimmer.detune.setValueAtTime(4, now)
  lead.frequency.setValueAtTime(720, now)
  lead.frequency.exponentialRampToValueAtTime(1080, now + 0.09)
  lead.frequency.exponentialRampToValueAtTime(1640, now + 0.19)
  lead.frequency.exponentialRampToValueAtTime(1320, now + duration)
  body.frequency.setValueAtTime(360, now)
  body.frequency.exponentialRampToValueAtTime(660, now + 0.11)
  body.frequency.exponentialRampToValueAtTime(520, now + duration)
  sparkle.frequency.setValueAtTime(1440, now)
  sparkle.frequency.exponentialRampToValueAtTime(2280, now + 0.12)
  sparkle.frequency.exponentialRampToValueAtTime(1860, now + duration)
  shimmer.frequency.setValueAtTime(1780, now)
  shimmer.frequency.exponentialRampToValueAtTime(2560, now + 0.13)
  shimmer.frequency.exponentialRampToValueAtTime(1920, now + duration)
  preGain.gain.setValueAtTime(0.8, now)
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(1750, now)
  filter.frequency.linearRampToValueAtTime(2100, now + duration)
  filter.Q.value = 3.9
  wetFilter.type = 'lowpass'
  wetFilter.frequency.setValueAtTime(2200, now)
  delay.delayTime.setValueAtTime(0.085, now)
  feedback.gain.setValueAtTime(0.28, now)
  wetGain.gain.setValueAtTime(0.26, now)
  envelope.gain.setValueAtTime(0.0001, now)
  envelope.gain.linearRampToValueAtTime(0.2, now + 0.012)
  envelope.gain.linearRampToValueAtTime(0.14, now + 0.16)
  envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  lead.connect(preGain)
  body.connect(preGain)
  sparkle.connect(preGain)
  shimmer.connect(preGain)
  preGain.connect(filter)
  filter.connect(envelope)
  filter.connect(wetFilter)
  wetFilter.connect(delay)
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(wetGain)
  wetGain.connect(envelope)
  envelope.connect(masterGain)
  ;[lead, body, sparkle, shimmer].forEach(oscillator => {
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
  })
  playNoiseBurst(0.05, 0.014)
}

export function playGhostEaten() {
  playSweep(920, 310, 0.16, { type: 'sawtooth', gain: 0.15 })
  playNoiseBurst(0.1, 0.07)
}

export function playDeath() {
  playSweep(620, 90, 0.55, { type: 'sawtooth', gain: 0.2 })
  playNoiseBurst(0.24, 0.09)
}

export function stopPowerSirenLoop() {
  // Clear the interval before dropping its handle so repeated resets are safe.
  if (powerSirenTimer === null) return
  self.clearInterval(powerSirenTimer)
  powerSirenTimer = null
}

export function startPowerSirenLoop(
  getPowerModeRemainingMs: () => number,
  isPlaying: () => boolean,
) {
  // Only one siren interval may exist. Each tick checks the supplied state so
  // the sound stops when power mode expires or gameplay pauses.
  if (powerSirenTimer !== null) return
  playPowerPellet()
  powerSirenTimer = self.setInterval(() => {
    if (getPowerModeRemainingMs() > 0 && isPlaying()) playPowerPellet()
    else stopPowerSirenLoop()
  }, POWER_SIREN_LOOP_MS)
}
