import { acos, sqrt } from './math_utils'
import { Tuple } from './utility_types'

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

  clone() {
    return Vector.create(...this.coords)
  }

  magSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  mag() {
    return sqrt(this.magSq())
  }

  normalize(inPlace = true) {
    return this.div(this.mag(), inPlace)
  }

  setMag(magnitude: number, inPlace = true) {
    return this.normalize(inPlace).mult(magnitude)
  }

  add(anotherVector: Vector, inPlace = true) {
    const target = inPlace ? this : this.clone()

    target.x += anotherVector.x
    target.y += anotherVector.y
    target.z += anotherVector.z ?? 0

    return target
  }

  sub(anotherVector: Vector, inPlace = true) {
    const target = inPlace ? this : this.clone()

    return target.add(anotherVector.mult(-1, false), inPlace)
  }

  mult(scalarValue: number, inPlace = true) {
    const target = inPlace ? this : this.clone()

    target.x *= scalarValue
    target.y *= scalarValue
    target.z *= scalarValue

    return target
  }

  div(scalarValue: number, inPlace = true) {
    const target = inPlace ? this : this.clone()

    if (scalarValue === 0)
      throw new Error('Sorry, but division by 0 is not supported')

    return target.mult(1 / scalarValue, inPlace)
  }

  toArray() {
    return [...this]
  }

  toString() {
    return JSON.stringify(this.toArray())
  }

  to4dMatrix() {
    return [[this.x], [this.y], [this.z], [FOURTH_DIMENSION_COORD]] // 4x1 matrix.
  }

  dot(anotherVector: Vector) {
    return (
      this.x * anotherVector.x +
      this.y * anotherVector.y +
      this.z * anotherVector.z
    )
  }

  cross(anotherVector: Vector) {
    return Vector.create(
      this.y * anotherVector.z - this.z * anotherVector.y,
      -(this.x * anotherVector.z - this.z * anotherVector.x),
      this.x * anotherVector.y - this.y * anotherVector.x,
    )
  }

  dist(anotherVector: Vector) {
    const diff = {
      x: this.x - anotherVector.x,
      y: this.y - anotherVector.y,
      z: this.z - anotherVector.z,
    }

    return sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z)
  }

  equals(anotherVector: Vector) {
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
  angleBetween(anotherVector: Vector) {
    const a = this.mag()
    const b = anotherVector.mag()
    const c = this.dist(anotherVector)

    // const cosA = (b * b + c * c - a * a) / (2 * b * c)
    // const cosB = (a * a + c * c - b * b) / (2 * a * c)
    const cosC = (a * a + b * b - c * c) / (2 * a * b)

    return acos(cosC)
  }

  inBetween(anotherVector: Vector, distanceRatio = 0.5) {
    return $v(
      this.x + distanceRatio * (anotherVector.x - this.x),
      this.y + distanceRatio * (anotherVector.y - this.y),
      this.z + distanceRatio * (anotherVector.z - this.z),
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
}

export const $v = Vector.create
export const createVector = $v // Synonym for `$v`, as used by p5.js.

export const AXES = { x: $v(1, 0, 0), y: $v(0, 1, 0), z: $v(0, 0, 1) }

export const NEGATIVE_AXES = {
  x: $v(-1, 0, 0),
  y: $v(0, -1, 0),
  z: $v(0, 0, -1),
}
