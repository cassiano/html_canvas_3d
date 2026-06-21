import { Particle } from './particle.ts'
import { randomColor, timesForEach } from '../utils.ts'
import { random } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'

export const PARTICLE_LIFESPAN = 300
const FIREWORKS_PARTICLES_COUNT_RANGE = [100, 500] as const

// https://natureofcode.com/book/chapter-4-particle-systems/
export class Fireworks {
  particles: Particle[] = []
  exploded = false

  constructor(
    public width: number,
    public height: number,
    public color = randomColor(),
  ) {
    this.createParticle(
      $v(random(-width / 4, width / 4), -height / 2),
      $v(random(-2, 2), random(3, 6)),
      Number.MAX_VALUE,
      'gray',
      width,
      height,
    )
  }

  static reset() {
    this.fireworksCollection.splice(0)
  }

  static create(width: number, height: number) {
    this.fireworksCollection.push(new this(width, height))
  }

  static destroy(index: number) {
    this.fireworksCollection.splice(index, 1)
  }

  static forEach(fn: (item: Fireworks, index: number) => void) {
    this.fireworksCollection.forEach(fn)
  }

  static reversedForEach(fn: (item: Fireworks, index: number) => void) {
    for (let i = this.fireworksCollection.length - 1; i >= 0; i--)
      fn(this.fireworksCollection[i], i)
  }

  static addedParticleCount() {
    return this.fireworksCollection.reduce(
      (acc, fireworks) => acc + fireworks.particleCount(),
      0,
    )
  }

  particleCount() {
    return this.particles.length
  }

  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]

      particle.run()

      if (particle.isDead()) {
        this.destroyParticle(i)

        continue
      }
    }

    this.checkExplosion()
  }

  applyForce(force: Vector3d) {
    this.particles.forEach(particle => particle.applyForce(force))
  }

  isDead() {
    return this.particles.every(particle => particle.isDead())
  }

  private createParticle(
    position: Vector3d,
    velocity: Vector3d,
    lifespan: number,
    color: string,
    width: number,
    height: number,
  ) {
    this.particles.push(
      new Particle(position, velocity, lifespan, color, width, height),
    )
  }

  private destroyParticle(index: number) {
    this.particles.splice(index, 1)
  }

  private checkExplosion() {
    if (this.particles.length !== 1) return

    const singleParticle = this.particles[0]

    // Explode fireworks if it hasn't yet exploded and has reached its highest vertical position.
    if (!this.exploded && singleParticle.velocity.y <= 0)
      this.explode(singleParticle.position)
  }

  private explode(position: Vector3d) {
    this.particles = []

    const particleCount = random(...FIREWORKS_PARTICLES_COUNT_RANGE)

    // Emit a single burst of particles.
    timesForEach(particleCount, () => {
      const velocity = Vector3d.random2d().mult(random(1, 5)).sub(2.5, 2.5)

      this.createParticle(
        position.clone(),
        velocity,
        PARTICLE_LIFESPAN,
        this.color,
        this.width,
        this.height,
      )
    })

    this.exploded = true
  }

  private static fireworksCollection: Fireworks[] = []
}
