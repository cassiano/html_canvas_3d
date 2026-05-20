import { acos, sqrt } from './math_utils.ts'
import { Tuple } from './utility_types.ts'

export type transformationMatrix4x1Type = Tuple<Tuple<number, 1>, 4>

export const FOURTH_DIMENSION_COORD = 1

export class Vector {
  coords: [x: number, y: number, z: number]

  constructor(x: number, y: number, z = 0) {
    this.coords = [x, y, z]
  }

  get x() {
    return this.coords[0]
  }
  get y() {
    return this.coords[1]
  }
  get z() {
    return this.coords[2]
  }

  set x(newX) {
    this.coords[0] = newX
  }
  set y(newY) {
    this.coords[1] = newY
  }
  set z(newZ) {
    this.coords[2] = newZ
  }

  setX(newX: number): Vector {
    this.coords[0] = newX

    return this
  }

  setY(newY: number): Vector {
    this.coords[1] = newY

    return this
  }

  setZ(newZ: number): Vector {
    this.coords[2] = newZ

    return this
  }

  clone(): Vector {
    return Vector.create(...this.coords)
  }

  magSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  mag() {
    return sqrt(this.magSq())
  }

  normalize(): Vector {
    return this.div(this.mag())
  }

  setMag(magnitude: number) {
    return this.normalize().mult(magnitude)
  }

  add(x: number, y: number, z: number): Vector
  add(anotherVector: Vector): Vector
  add(xOrAnotherVector: number | Vector, y?: number, z?: number): Vector {
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

  sub(x: number, y: number, z: number): Vector
  sub(anotherVector: Vector): Vector
  sub(xOrAnotherVector: number | Vector, y?: number, z?: number): Vector {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return this.add(anotherVector.clone().mult(-1))
  }

  mult(scalarValue: number) {
    this.x *= scalarValue
    this.y *= scalarValue
    this.z *= scalarValue

    return this
  }

  div(scalarValue: number): Vector {
    if (scalarValue === 0)
      throw new Error('Sorry, but division by 0 is not supported')

    return this.mult(1 / scalarValue)
  }

  toArray() {
    return [...this]
  }

  toString() {
    return JSON.stringify(this.toArray())
  }

  to4dMatrix() {
    // 4x1 matrix.
    return [[this.x], [this.y], [this.z], [FOURTH_DIMENSION_COORD]]
  }

  dot(x: number, y: number, z: number): number
  dot(anotherVector: Vector): number
  dot(xOrAnotherVector: number | Vector, y?: number, z?: number): number {
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

  cross(x: number, y: number, z: number): Vector
  cross(anotherVector: Vector): Vector
  cross(xOrAnotherVector: number | Vector, y?: number, z?: number): Vector {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return Vector.create(
      this.y * anotherVector.z - this.z * anotherVector.y,
      -(this.x * anotherVector.z - this.z * anotherVector.x),
      this.x * anotherVector.y - this.y * anotherVector.x,
    )
  }

  dist(x: number, y: number, z: number): number
  dist(anotherVector: Vector): number
  dist(xOrAnotherVector: number | Vector, y?: number, z?: number): number {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      y,
      z,
    )

    return sqrt(this.distSq(anotherVector))
  }

  distSq(x: number, y: number, z: number): number
  distSq(anotherVector: Vector): number
  distSq(xOrAnotherVector: number | Vector, y?: number, z?: number): number {
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

  equals(x: number, y: number, z: number): boolean
  equals(anotherVector: Vector): boolean
  equals(xOrAnotherVector: number | Vector, y?: number, z?: number): boolean {
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
    return this.equals(Vector.create(0, 0, 0))
  }

  isAllOnes() {
    return this.equals(Vector.create(1, 1, 1))
  }

  // Use the "Law of Cosines" to calculate the angle between the 2 vectors.
  // https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221gYM9JH1RKYt1t5jEUHob3QixN68SKmZd%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing
  angleBetween(x: number, y: number, z: number): number
  angleBetween(anotherVector: Vector): number
  angleBetween(
    xOrAnotherVector: number | Vector,
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

  inBetween(x: number, y: number, z: number, distanceRatio?: number): Vector
  inBetween(anotherVector: Vector, distanceRatio?: number): Vector
  inBetween(
    xOrAnotherVector: number | Vector,
    yOrDistanceRatio?: number,
    z?: number,
    distanceRatio?: number,
  ): Vector {
    const anotherVector = this.inferAnotherVectorFromParams(
      xOrAnotherVector,
      yOrDistanceRatio,
      z,
    )
    const actualDistanceRatio =
      (typeof xOrAnotherVector === 'number'
        ? distanceRatio
        : yOrDistanceRatio) ?? 0.5

    return $v(
      this.x + actualDistanceRatio * (anotherVector.x - this.x),
      this.y + actualDistanceRatio * (anotherVector.y - this.y),
      this.z + actualDistanceRatio * (anotherVector.z - this.z),
    )
  }

  static create(x: number, y: number, z?: number) {
    return new Vector(x, y, z)
  }

  static from4dMatrix(matrix: transformationMatrix4x1Type) {
    return Vector.create(matrix[0][0], matrix[1][0], matrix[2][0])
  }

  *[Symbol.iterator]() {
    yield this.x
    yield this.y
    yield this.z
  }

  private inferAnotherVectorFromParams = (
    xOrAnotherVector: number | Vector,
    y?: number,
    z?: number,
  ) => {
    return typeof xOrAnotherVector === 'number'
      ? $v(xOrAnotherVector, y!, z!) // 1st signature: (x, y, z)
      : xOrAnotherVector // 2nd signature: (anotherVector)
  }
}

export const $v = Vector.create
export const createVector = $v // Synonym for `$v`, as used by p5.js.

export const AXES = {
  x: $v(1, 0, 0),
  y: $v(0, 1, 0),
  z: $v(0, 0, 1),

  ['-x']: $v(-1, 0, 0),
  ['-y']: $v(0, -1, 0),
  ['-z']: $v(0, 0, -1),
}
