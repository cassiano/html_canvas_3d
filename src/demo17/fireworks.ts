import { Particle } from './particle.ts'
import { randomColor, reversedForEach, timesForEach } from '../utils.ts'
import { floor, random, sign } from '../math_utils.ts'
import { $v, Vector3d } from '../vector_3d.ts'
import { NULL_VECTOR } from '../constants.ts'
import { maxParticles, minParticles, renderIn3d } from './demo17_form.ts'

/**
 * How many frames a particle spawned by an explosion survives.
 */
export const PARTICLE_LIFESPAN = 250

/**
 * The size of the volume, along the depth axis, in which fireworks are
 * spawned when the 3D version of the demo is enabled.
 */
export const DEPTH = 400

// https://natureofcode.com/book/chapter-4-particle-systems/
/**
 * A firework, which is launched as a single rising projectile and then
 * explodes into a burst of particles.
 *
 * Every live firework is kept in a class-wide collection, so that the whole
 * scene can be updated at once through the static methods.
 */
export class Fireworks {
  /**
   * The particles currently belonging to this firework.
   */
  particles: Particle[] = []

  /**
   * Whether the firework has already exploded.
   */
  exploded = false

  /**
   * The fireworks currently alive in the scene.
   */
  private static fireworksCollection: Fireworks[] = []

  /**
   * Creates and launches a firework.
   *
   * The firework starts as a single projectile, placed at the bottom of the
   * area and moving upwards.
   *
   * @param width - The width of the area the firework is launched in.
   * @param height - The height of the area the firework is launched in.
   * @param color - The color of the particles the firework explodes into.
   *   Defaults to a random color.
   * @throws {Error} With the message `demo3Form.toggles should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the firework's initial depth depends on the "3D version" setting.
   */
  constructor(
    public width: number,
    public height: number,
    public color = randomColor(127, 255),
  ) {
    const initialPosition = $v(
      random(-width / 2, width / 2),
      -height / 2,
      renderIn3d() ? random(-DEPTH / 2, DEPTH / 2) : 0,
    )

    const initialVelocity = $v(
      -sign(initialPosition.x) * random(0, 3),
      random(5, 10),
      renderIn3d() ? -sign(initialPosition.z) * random(0, 3) : 0,
    )

    this.createParticle(
      initialPosition,
      initialVelocity,
      Number.MAX_VALUE,
      'gray',
      width,
      height,
    )
  }

  /**
   * Removes every firework from the scene.
   *
   * @returns Nothing; the scene's collection of fireworks is emptied.
   */
  static reset() {
    this.fireworksCollection.length = 0
  }

  /**
   * Launches a new firework into the scene.
   *
   * @param width - The width of the area the firework is launched in.
   * @param height - The height of the area the firework is launched in.
   * @returns Nothing; the firework is added to the scene's collection.
   * @throws {Error} With the message `demo3Form.toggles should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the firework's initial depth depends on the "3D version" setting.
   */
  static create(width: number, height: number) {
    this.fireworksCollection.push(new this(width, height))
  }

  /**
   * Removes a firework from the scene.
   *
   * @param index - The index of the firework to remove, in the scene's
   *   collection of fireworks.
   * @returns Nothing; the firework is removed from the scene's collection.
   */
  static destroy(index: number) {
    this.fireworksCollection.splice(index, 1)
  }

  /**
   * Runs a callback for every firework in the scene.
   *
   * @param fn - The callback, receiving the firework and its index.
   * @returns Nothing.
   */
  static forEach(fn: (item: Fireworks, index: number) => void) {
    this.fireworksCollection.forEach(fn)
  }

  /**
   * Runs a callback for every firework in the scene, from the last one to the
   * first one.
   *
   * Iterating backwards makes it safe to remove the firework currently being
   * visited from the callback.
   *
   * @param fn - The callback, receiving the firework and its index.
   * @returns Nothing.
   */
  static reversedForEach(fn: (item: Fireworks, index: number) => void) {
    reversedForEach(this.fireworksCollection, fn)
  }

  /**
   * Returns how many particles exist in the whole scene.
   *
   * @returns The total number of particles of every live firework.
   */
  static globalParticleCount() {
    return this.fireworksCollection.reduce(
      (acc, fireworks) => acc + fireworks.particleCount(),
      0,
    )
  }

  /**
   * Returns how many fireworks exist in the scene.
   *
   * @returns The number of live fireworks.
   */
  static count() {
    return this.fireworksCollection.length
  }

  /**
   * Returns how many particles belong to this firework.
   *
   * @returns The number of particles.
   */
  particleCount() {
    return this.particles.length
  }

  /**
   * Advances the firework by one frame.
   *
   * The firework's particles are moved, the ones that died are removed, and
   * the firework explodes once its last remaining projectile starts falling.
   *
   * @returns Nothing; the firework's state is mutated in place.
   * @throws {Error} With the message `demo3Form.sliders should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the number of particles in an explosion is taken from it.
   * @throws {Error} With the message `demo3Form.toggles should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the explosion's shape depends on the "3D version" setting.
   * @throws {Error} With the message `Sorry, but division by 0 is not
   *   supported`, when a randomly generated velocity has no direction to
   *   preserve.
   * @throws {Error} With the message "`setHeading()` can only be called on
   *   2d vectors", when the spiral-shaped explosion is used in the 3D
   *   version of the demo.
   */
  run() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]

      particle.run()

      if (particle.isDead()) this.destroyParticle(i)
    }

    this.checkExplosion()
  }

  /**
   * Applies a force to every particle of the firework.
   *
   * @param force - The force to apply.
   * @returns Nothing; the particles' accelerations are mutated in place.
   */
  applyForce(force: Vector3d) {
    this.particles.forEach(particle => particle.applyForce(force))
  }

  /**
   * Tells whether the firework has nothing left to show.
   *
   * @returns `true` when every one of the firework's particles is dead.
   */
  isDead() {
    return this.particles.every(particle => particle.isDead())
  }

  /**
   * Adds a particle to the firework.
   *
   * @param position - The particle's initial position, in world coordinates.
   * @param velocity - The particle's initial velocity.
   * @param lifespan - How many frames the particle survives before dying.
   * @param color - The color the particle is drawn with.
   * @param width - The width of the area the particle is allowed to move in.
   * @param height - The height of the area the particle is allowed to move in.
   * @returns Nothing; the particle is added to the firework.
   */
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

  /**
   * Removes a particle from the firework.
   *
   * @param index - The index of the particle to remove.
   * @returns Nothing; the particle is removed from the firework.
   */
  private destroyParticle(index: number) {
    this.particles.splice(index, 1)
  }

  /**
   * Checks whether the firework is ready to explode, and explodes it when so.
   *
   * A firework explodes when it is down to its last projectile and that
   * projectile has started falling.
   *
   * @returns Nothing; the firework may be exploded in place.
   * @throws {Error} With the message `demo3Form.sliders should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the number of particles in an explosion is taken from it.
   * @throws {Error} With the message `demo3Form.toggles should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the explosion's shape depends on the "3D version" setting.
   * @throws {Error} With the message `Sorry, but division by 0 is not
   *   supported`, when a randomly generated velocity has no direction to
   *   preserve.
   * @throws {Error} With the message "`setHeading()` can only be called on
   *   2d vectors", when the spiral-shaped explosion is used in the 3D
   *   version of the demo.
   */
  private checkExplosion() {
    if (this.particles.length !== 1) return

    const singleParticle = this.particles[0]

    // Explode fireworks if it hasn't yet exploded and has reached its highest vertical position.
    if (!this.exploded && singleParticle.velocity.y <= 0)
      this.explode(singleParticle.position)
  }

  /**
   * Replaces the firework's particles with a burst of new ones.
   *
   * The shape of the burst is picked at random, and the number of particles
   * is taken from the demo's control panel.
   *
   * @param position - The position the burst is centered on.
   * @returns Nothing; the firework's particles are replaced in place.
   * @throws {Error} With the message `demo3Form.sliders should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the number of particles in the burst is taken from it.
   * @throws {Error} With the message `demo3Form.toggles should contain a
   *   value`, when the demo's control panel has not been created yet, because
   *   the burst's shape depends on the "3D version" setting.
   * @throws {Error} With the message `Sorry, but division by 0 is not
   *   supported`, when a randomly generated velocity has no direction to
   *   preserve.
   * @throws {Error} With the message "`setHeading()` can only be called on
   *   2d vectors", when the spiral-shaped burst is used in the 3D version of
   *   the demo.
   */
  private explode(position: Vector3d) {
    this.particles = []

    const particleCount = random(minParticles(), maxParticles())

    let velocity = NULL_VECTOR.clone()
    let velocityInc = 0
    let angleInc = 0

    const explosionShape = floor(random(0, 4)) // [0, 3]

    // Emit a single burst of particles.
    timesForEach(particleCount, () => {
      switch (explosionShape) {
        case 0:
          // Regular (spherical-shaped) explosion.
          velocity = Vector3d[renderIn3d() ? 'random3d' : 'random2d']().setMag(
            random(0.1, 3),
          )
          break

        case 1:
          // Donut-shaped explosion.
          velocity = Vector3d[renderIn3d() ? 'random3d' : 'random2d']().setMag(
            random(2, 3),
          )
          break

        case 2: {
          // Concentric circles-shaped explosion.
          const radius = floor(random(1, 4))

          velocity = Vector3d[renderIn3d() ? 'random3d' : 'random2d']().setMag(
            random(radius / 2, radius / 2 + 0.25),
          )

          break
        }
        case 3:
          // Spiral-shaped explosion.
          velocityInc += 0.002
          angleInc += 0.06

          velocity = Vector3d[renderIn3d() ? 'random3d' : 'random2d']()
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
