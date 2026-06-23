import { Particle } from './particle.ts'
import { randomColor, timesForEach } from '../utils.ts'
import { floor, random } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { NULL_VECTOR } from '../constants.ts'

export const PARTICLE_LIFESPAN = 250
const FIREWORKS_PARTICLES_COUNT_RANGE = [10, 1500] as const

// https://natureofcode.com/book/chapter-4-particle-systems/
export class Fireworks {
  particles: Particle[] = []
  exploded = false

  private static fireworksCollection: Fireworks[] = []

  constructor(
    public width: number,
    public height: number,
    public color = randomColor(127, 255),
  ) {
    const initialPosition = $v(random(-width / 2, width / 2), -height / 2)

    this.createParticle(
      initialPosition,
      $v(initialPosition.x < 0 ? random(0, 3) : random(-3, 0), random(5, 10)),
      Number.MAX_VALUE,
      'gray',
      width,
      height,
    )
  }

  static reset() {
    this.fireworksCollection.length = 0
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

  static globalParticleCount() {
    return this.fireworksCollection.reduce(
      (acc, fireworks) => acc + fireworks.particleCount(),
      0,
    )
  }

  static count() {
    return this.fireworksCollection.length
  }

  particleCount() {
    return this.particles.length
  }

  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]

      particle.run()

      if (particle.isDead()) this.destroyParticle(i)
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

    let velocity = NULL_VECTOR.clone()
    let velocityInc = 0
    let angleInc = 0

    const explosionShape = floor(random(0, 4)) // [0, 3]

    // Emit a single burst of particles.
    timesForEach(particleCount, () => {
      switch (explosionShape) {
        case 0:
          // Regular (spherical-shaped) explosion.
          velocity = Vector3d.random2d().setMag(random(0.1, 3))
          break

        case 1:
          // Donut-shaped explosion.
          velocity = Vector3d.random2d().setMag(random(2, 3))
          break

        case 2: {
          // Concentric circles-shaped explosion.
          const radius = floor(random(1, 4))

          velocity = Vector3d.random2d().setMag(
            random(radius / 2, radius / 2 + 0.25),
          )

          break
        }
        case 3:
          // Spiral-shaped explosion.
          velocityInc += 0.002
          angleInc += 0.06

          velocity = Vector3d.random2d()
            .setMag(velocityInc)
            .setHeading(angleInc)
          break
      }

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
}
