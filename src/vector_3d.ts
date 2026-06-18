import { acos, sqrt } from './math_utils.ts'
import { Tuple } from './utility_types.ts'

export type transformationMatrix4x1Type = Tuple<Tuple<number, 1>, 4>

export const FOURTH_DIMENSION_COORD = 1

export class Vector3d {
  private coords: [x: number, y: number, z: number]

  constructor(x: number, y: number, z = 0) {
    this.coords = [x, y, z]
  }

  // Getters and setters for `x`.
  get x() {
    return this.coords[0]
  }
  set x(newX) {
    this.coords[0] = newX
  }
  setX(newX: number): Vector3d {
    this.coords[0] = newX

    return this
  }

  // Getters and setters for `y`.
  get y() {
    return this.coords[1]
  }
  set y(newY) {
    this.coords[1] = newY
  }
  setY(newY: number): Vector3d {
    this.coords[1] = newY

    return this
  }

  // Getters and setters for `z`.
  get z() {
    return this.coords[2]
  }
  set z(newZ) {
    this.coords[2] = newZ
  }
  setZ(newZ: number): Vector3d {
    this.coords[2] = newZ

    return this
  }

  clone(): Vector3d {
    return Vector3d.create(...this.coords)
  }

  magSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  mag() {
    return sqrt(this.magSq())
  }

  normalize(): Vector3d {
    return this.div(this.mag())
  }

  setMag(newMagnitude: number) {
    return this.normalize().mult(newMagnitude)
  }

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

  mult(scalarValue: number) {
    if (scalarValue !== 1) {
      this.x *= scalarValue
      this.y *= scalarValue
      this.z *= scalarValue
    }

    return this
  }

  div(scalarValue: number): Vector3d {
    if (scalarValue === 0)
      throw new Error('Sorry, but division by 0 is not supported')

    if (scalarValue === 1) return this

    return this.mult(1 / scalarValue)
  }

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

  isAllZeros() {
    return this.equals(Vector3d.create(0, 0, 0))
  }

  isAllOnes() {
    return this.equals(Vector3d.create(1, 1, 1))
  }

  // Use the "Law of Cosines" to calculate the angle between the 2 vectors.
  // https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221gYM9JH1RKYt1t5jEUHob3QixN68SKmZd%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
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

    return $v(
      this.x + actualInterpolationAmount * (anotherVector.x - this.x),
      this.y + actualInterpolationAmount * (anotherVector.y - this.y),
      this.z + actualInterpolationAmount * (anotherVector.z - this.z),
    )
  }

  toArray() {
    return this.coords
  }

  toString() {
    return JSON.stringify(this.toArray())
  }

  to4dMatrix() {
    // 4x1 matrix.
    return [[this.x], [this.y], [this.z], [FOURTH_DIMENSION_COORD]]
  }

  static create(x: number, y: number, z?: number) {
    return new Vector3d(x, y, z)
  }

  static from4dMatrix(matrix: transformationMatrix4x1Type) {
    return Vector3d.create(matrix[0][0], matrix[1][0], matrix[2][0])
  }

  // p5.js calls it `random2D()` instead.
  static random2d() {
    return Vector3d.create(Math.random(), Math.random()).normalize()
  }

  // p5.js calls it `random3D()` instead.
  static random3d() {
    return Vector3d.create(
      Math.random(),
      Math.random(),
      Math.random(),
    ).normalize()
  }

  *[Symbol.iterator](): Generator<number, void, unknown> {
    yield this.x
    yield this.y
    yield this.z
  }

  /////////////////////
  // Private methods //
  /////////////////////

  private inferAnotherVectorFromParams = (
    xOrAnotherVector: number | Vector3d,
    y?: number,
    z?: number,
  ) => {
    return typeof xOrAnotherVector === 'number'
      ? $v(xOrAnotherVector, y!, z ?? 0) // 1st signature: (x, y, z?)
      : xOrAnotherVector // 2nd signature: (anotherVector)
  }
}

export const $v = Vector3d.create
export const createVector = $v // Synonym for `$v`, as used by p5.js.
