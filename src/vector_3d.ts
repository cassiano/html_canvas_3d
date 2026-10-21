import {
  acos,
  sqrt,
  random,
  abs,
  atan2,
  polarToCartesian2d,
} from './math_utils.ts'

/**
 * A mutable 3-dimensional vector.
 *
 * The class is a thin, chainable wrapper around three numeric coordinates.
 * Most mutating operations return `this` so calls can be chained, while
 * operations that produce a genuinely new value (for example `clone()`,
 * `cross()` or `hadamardProduct()`) leave the receiver untouched.
 *
 * @example
 * ```ts
 * const v = $v(1, 2, 3).mult(2).add(0, -4, 0) // -> (2, 0, 6)
 * ```
 */
export class Vector3d {
  /** The Cartesian coordinates of the vector, in the `[x, y, z]` order. */
  private coords: [x: number, y: number, z: number]

  /**
   * Creates a vector from its Cartesian coordinates.
   *
   * @param x - The coordinate on the X-axis.
   * @param y - The coordinate on the Y-axis.
   * @param z - The coordinate on the Z-axis. Defaults to `0`, which makes the
   *   vector usable as a 2D vector.
   */
  constructor(x: number, y: number, z = 0) {
    this.coords = [x, y, z]
  }

  // Getters and setters for `x`.
  /**
   * The coordinate on the X-axis.
   */
  get x() {
    return this.coords[0]
  }
  /**
   * Replaces the coordinate on the X-axis.
   */
  set x(newX) {
    this.coords[0] = newX
  }
  /**
   * Replaces the coordinate on the X-axis.
   *
   * @param newX - The new X coordinate.
   * @returns This same vector, to allow chaining.
   */
  setX(newX: number): Vector3d {
    this.coords[0] = newX

    return this
  }

  // Getters and setters for `y`.
  /**
   * The coordinate on the Y-axis.
   */
  get y() {
    return this.coords[1]
  }
  /**
   * Replaces the coordinate on the Y-axis.
   */
  set y(newY) {
    this.coords[1] = newY
  }
  /**
   * Replaces the coordinate on the Y-axis.
   *
   * @param newY - The new Y coordinate.
   * @returns This same vector, to allow chaining.
   */
  setY(newY: number): Vector3d {
    this.coords[1] = newY

    return this
  }

  // Getters and setters for `z`.
  /**
   * The coordinate on the Z-axis.
   */
  get z() {
    return this.coords[2]
  }
  /**
   * Replaces the coordinate on the Z-axis.
   */
  set z(newZ) {
    this.coords[2] = newZ
  }
  /**
   * Replaces the coordinate on the Z-axis.
   *
   * @param newZ - The new Z coordinate.
   * @returns This same vector, to allow chaining.
   */
  setZ(newZ: number): Vector3d {
    this.coords[2] = newZ

    return this
  }

  /**
   * Creates an independent copy of this vector.
   *
   * @returns A new vector holding the same coordinates as this one.
   */
  clone(): Vector3d {
    return Vector3d.create(...this.coords)
  }

  /**
   * Returns the squared magnitude (length) of the vector.
   *
   * Prefer this over {@link Vector3d.mag} when only comparing magnitudes,
   * because it avoids a square root.
   *
   * @returns The squared length of the vector.
   */
  magSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /**
   * Returns the magnitude (length) of the vector.
   *
   * @returns The length of the vector.
   */
  mag() {
    return sqrt(this.magSq())
  }

  /**
   * Returns the angle of the vector measured from the positive X-axis, in
   * radians, within the range `[-PI, PI]`.
   *
   * @returns The heading of the vector.
   * @throws {Error} When the vector has a non-zero Z coordinate, because a
   *   heading is only defined for 2D vectors.
   */
  heading() {
    if (this.z !== 0) {
      throw new Error('`heading()` can only be called on 2d vectors')
    }

    return atan2(this.y, this.x)
  }

  /**
   * Rotates the vector to the given heading, preserving its magnitude.
   *
   * @param newHeading - The new heading in radians.
   * @returns This same vector, to allow chaining.
   * @throws {Error} When the vector has a non-zero Z coordinate, because a
   *   heading is only defined for 2D vectors.
   */
  setHeading(newHeading: number) {
    if (this.z !== 0) {
      throw new Error('`setHeading()` can only be called on 2d vectors')
    }

    ;[this.x, this.y] = polarToCartesian2d(this.mag(), newHeading)

    return this
  }

  /**
   * Rescales the vector to a magnitude of `1`, keeping its direction.
   *
   * @returns This same vector, to allow chaining.
   * @throws {Error} When the vector has a magnitude of `0`, since it has no
   *   direction to preserve.
   */
  normalize(): Vector3d {
    return this.div(this.mag())
  }

  /**
   * Rescales the vector to the given magnitude, keeping its direction.
   *
   * @param newMagnitude - The magnitude the vector should have afterwards.
   * @returns This same vector, to allow chaining.
   * @throws {Error} When the vector has a magnitude of `0`, since it has no
   *   direction to preserve.
   */
  setMag(newMagnitude: number) {
    return this.normalize().mult(newMagnitude)
  }

  /**
   * Adds another vector, or a set of coordinates, to this vector.
   *
   * @param x - The X coordinate to add, when using the coordinate overload.
   * @param y - The Y coordinate to add, when using the coordinate overload.
   * @param z - The Z coordinate to add, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The vector to add, when using the vector overload.
   * @returns This same vector, to allow chaining.
   */
  add(x: number, y: number, z?: number): Vector3d
  add(anotherVector: Vector3d): Vector3d
  add(xOrAnotherVector: number | Vector3d, y?: number, z?: number): Vector3d {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    this.x += anotherVector.x
    this.y += anotherVector.y
    this.z += anotherVector.z

    return this
  }

  /**
   * Subtracts another vector, or a set of coordinates, from this vector.
   *
   * @param x - The X coordinate to subtract, when using the coordinate overload.
   * @param y - The Y coordinate to subtract, when using the coordinate overload.
   * @param z - The Z coordinate to subtract, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The vector to subtract, when using the vector overload.
   * @returns This same vector, to allow chaining.
   */
  sub(x: number, y: number, z?: number): Vector3d
  sub(anotherVector: Vector3d): Vector3d
  sub(xOrAnotherVector: number | Vector3d, y?: number, z?: number): Vector3d {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return this.add(anotherVector.clone().mult(-1))
  }

  /**
   * Multiplies every coordinate of the vector by a scalar.
   *
   * @param scalarValue - The factor to multiply by.
   * @returns This same vector, to allow chaining.
   */
  mult(scalarValue: number) {
    if (scalarValue !== 1) {
      this.x *= scalarValue
      this.y *= scalarValue
      this.z *= scalarValue
    }

    return this
  }

  /**
   * Divides every coordinate of the vector by a scalar.
   *
   * @param scalarValue - The divisor.
   * @returns This same vector, to allow chaining.
   * @throws {Error} When `scalarValue` is `0`.
   */
  div(scalarValue: number): Vector3d {
    if (scalarValue === 0)
      throw new Error('Sorry, but division by 0 is not supported')

    if (scalarValue === 1) return this

    return this.mult(1 / scalarValue)
  }

  /**
   * Returns the dot product with another vector, or a set of coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns The dot product of the two vectors.
   */
  dot(x: number, y: number, z?: number): number
  dot(anotherVector: Vector3d): number
  dot(xOrAnotherVector: number | Vector3d, y?: number, z?: number): number {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return (
      this.x * anotherVector.x +
      this.y * anotherVector.y +
      this.z * anotherVector.z
    )
  }

  /**
   * Returns the cross product with another vector, or a set of coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns A new vector perpendicular to both operands.
   */
  cross(x: number, y: number, z?: number): Vector3d
  cross(anotherVector: Vector3d): Vector3d
  cross(xOrAnotherVector: number | Vector3d, y?: number, z?: number): Vector3d {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return Vector3d.create(
      this.y * anotherVector.z - this.z * anotherVector.y,
      -(this.x * anotherVector.z - this.z * anotherVector.x),
      this.x * anotherVector.y - this.y * anotherVector.x,
    )
  }

  // Element-wise multiplication.
  /**
   * Returns the element-wise (Hadamard) product with another vector, or a set
   * of coordinates.
   *
   * @param x - The X factor, when using the coordinate overload.
   * @param y - The Y factor, when using the coordinate overload.
   * @param z - The Z factor, when using the coordinate overload. Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns A new vector holding the product of each pair of coordinates.
   */
  hadamardProduct(x: number, y: number, z?: number): Vector3d
  hadamardProduct(anotherVector: Vector3d): Vector3d
  hadamardProduct(
    xOrAnotherVector: number | Vector3d,
    y?: number,
    z?: number,
  ): Vector3d {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return Vector3d.create(
      this.x * anotherVector.x,
      this.y * anotherVector.y,
      this.z * anotherVector.z,
    )
  }

  /**
   * Returns the Euclidean distance to another vector, or to a set of
   * coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns The distance between the two vectors.
   */
  dist(x: number, y: number, z?: number): number
  dist(anotherVector: Vector3d): number
  dist(xOrAnotherVector: number | Vector3d, y?: number, z?: number): number {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return sqrt(this.distSq(anotherVector))
  }

  /**
   * Returns the squared Euclidean distance to another vector, or to a set of
   * coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns The squared distance between the two vectors.
   */
  distSq(x: number, y: number, z?: number): number
  distSq(anotherVector: Vector3d): number
  distSq(xOrAnotherVector: number | Vector3d, y?: number, z?: number): number {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    const diff = {
      x: this.x - anotherVector.x,
      y: this.y - anotherVector.y,
      z: this.z - anotherVector.z,
    }

    return diff.x * diff.x + diff.y * diff.y + diff.z * diff.z
  }

  /**
   * Returns the Manhattan (city-block) distance to another vector, or to a set
   * of coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns The sum of the absolute differences of each pair of coordinates.
   */
  manhattanDist(x: number, y: number, z?: number): number
  manhattanDist(anotherVector: Vector3d): number
  manhattanDist(
    anotherVectorOrX: Vector3d | number,
    y?: number,
    z?: number,
  ): number {
    const anotherVector =
      typeof anotherVectorOrX === 'number'
        ? Vector3d.create(anotherVectorOrX, y!, z ?? 0) // 1st signature: (x, y, z?)
        : anotherVectorOrX // 2nd signature: (anotherVector)

    return (
      abs(this.x - anotherVector.x) +
      abs(this.y - anotherVector.y) +
      abs(this.z - anotherVector.z)
    )
  }

  /**
   * Tells whether this vector has the same coordinates as another vector, or as
   * a set of coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns `true` when every coordinate matches exactly.
   */
  equals(x: number, y: number, z?: number): boolean
  equals(anotherVector: Vector3d): boolean
  equals(xOrAnotherVector: number | Vector3d, y?: number, z?: number): boolean {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return (
      this.x === anotherVector.x &&
      this.y === anotherVector.y &&
      this.z === anotherVector.z
    )
  }

  /**
   * Tells whether this vector differs from another vector, or from a set of
   * coordinates.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns `true` when at least one coordinate differs.
   */
  notEquals(x: number, y: number, z?: number): boolean
  notEquals(anotherVector: Vector3d): boolean
  notEquals(
    xOrAnotherVector: number | Vector3d,
    y?: number,
    z?: number,
  ): boolean {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return !this.equals(anotherVector)
  }

  /**
   * Tells whether every coordinate of the vector is `0`.
   *
   * @returns `true` when the vector is the zero vector.
   */
  isAllZeros() {
    return this.equals(Vector3d.create(0, 0, 0))
  }

  /**
   * Tells whether every coordinate of the vector is `1`.
   *
   * @returns `true` when the vector is the identity vector.
   */
  isAllOnes() {
    return this.equals(Vector3d.create(1, 1, 1))
  }

  // Use the "Law of Cosines" to calculate the angle between the 2 vectors.
  // https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221gYM9JH1RKYt1t5jEUHob3QixN68SKmZd%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  /**
   * Returns the angle between this vector and another vector, or a set of
   * coordinates, in radians.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   *   Defaults to `0`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns The angle between the two vectors, in radians.
   */
  angleBetween(x: number, y: number, z?: number): number
  angleBetween(anotherVector: Vector3d): number
  angleBetween(
    xOrAnotherVector: number | Vector3d,
    y?: number,
    z?: number,
  ): number {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    const a = this.mag()
    const b = anotherVector.mag()
    const c = this.dist(anotherVector)

    // const cosA = (b * b + c * c - a * a) / (2 * b * c)
    // const cosB = (a * a + c * c - b * b) / (2 * a * c)
    const cosC = (a * a + b * b - c * c) / (2 * a * b)

    return acos(cosC)
  }

  // https://p5js.org/reference/p5.Vector/lerp/
  /**
   * Returns a vector interpolated between this vector and another one.
   *
   * @param x - The X coordinate, when using the coordinate overload.
   * @param y - The Y coordinate, when using the coordinate overload.
   * @param z - The Z coordinate, when using the coordinate overload.
   * @param interpolationAmount - How far towards the other vector to
   *   interpolate, within the range `[0, 1]`. Defaults to `0.5`.
   * @param anotherVector - The other vector, when using the vector overload.
   * @returns A new vector holding the interpolated coordinates.
   */
  lerp(x: number, y: number, z?: number, interpolationAmount?: number): Vector3d
  lerp(anotherVector: Vector3d, interpolationAmount?: number): Vector3d
  lerp(
    xOrAnotherVector: number | Vector3d,
    yOrInterpolationAmount?: number,
    z?: number,
    interpolationAmount?: number,
  ): Vector3d {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      yOrInterpolationAmount,
      z,
    )
    const actualInterpolationAmount =
      (typeof xOrAnotherVector === 'number'
        ? interpolationAmount
        : yOrInterpolationAmount) ?? 0.5 // 0.5 = Default interpolation amount.

    return anotherVector
      .clone()
      .sub(this)
      .mult(actualInterpolationAmount)
      .add(this)
  }

  /**
   * Returns the coordinates of the vector as an array.
   *
   * @returns The `[x, y, z]` coordinates.
   */
  toArray() {
    return this.coords
  }

  /**
   * Returns a JSON representation of the vector's coordinates.
   *
   * @returns The coordinates serialized as a JSON array.
   */
  toString() {
    return JSON.stringify(this.toArray())
  }

  /**
   * Creates a vector from its Cartesian coordinates.
   *
   * @param x - The coordinate on the X-axis.
   * @param y - The coordinate on the Y-axis.
   * @param z - The coordinate on the Z-axis. Defaults to `0`.
   * @returns A new vector holding the given coordinates.
   */
  static create(x: number, y: number, z?: number) {
    return new Vector3d(x, y, z)
  }

  // p5.js calls it `random2D()` instead.
  /**
   * Creates a vector pointing in a random 2D direction, with a magnitude of
   * `1`.
   *
   * @returns A new normalized random vector on the XY-plane.
   */
  static random2d() {
    return Vector3d.create(random(-1, 1), random(-1, 1)).normalize()
  }

  // p5.js calls it `random3D()` instead.
  /**
   * Creates a vector pointing in a random 3D direction, with a magnitude of
   * `1`.
   *
   * @returns A new normalized random vector.
   */
  static random3d() {
    return Vector3d.create(
      random(-1, 1),
      random(-1, 1),
      random(-1, 1),
    ).normalize()
  }

  /**
   * Makes the vector iterable, yielding its coordinates in `x`, `y`, `z`
   * order.
   *
   * @returns A generator over the three coordinates.
   */
  *[Symbol.iterator](): Generator<number, void, unknown> {
    yield this.x
    yield this.y
    yield this.z
  }

  /////////////////////
  // Private methods //
  /////////////////////

  /**
   * Normalizes the two supported call styles into a single vector.
   *
   * @param xOrAnotherVector - Either the X coordinate or the other vector.
   * @param y - The Y coordinate, when the coordinate overload is used.
   * @param z - The Z coordinate, when the coordinate overload is used.
   *   Defaults to `0`.
   * @returns The vector described by the given arguments.
   */
  private inferAnotherVectorFromParams(
    xOrAnotherVector: number | Vector3d,
    y?: number,
    z?: number,
  ) {
    return typeof xOrAnotherVector === 'number'
      ? $v(xOrAnotherVector, y!, z ?? 0) // 1st signature: (x, y, z?)
      : xOrAnotherVector // 2nd signature: (anotherVector)
  }
}

/**
 * Shorthand factory for {@link Vector3d}.
 *
 * @param x - The coordinate on the X-axis.
 * @param y - The coordinate on the Y-axis.
 * @param z - The coordinate on the Z-axis. Defaults to `0`.
 * @returns A new vector holding the given coordinates.
 */
export const $v = Vector3d.create

/**
 * Synonym for {@link $v}, matching the name used by p5.js.
 */
export const createVector = $v
