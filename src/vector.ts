import { sqrt } from './util'
import { transformationMatrix4x4Type } from './primitives'

export class Vector {
  coords: [x: number, y: number, z: number]

  constructor(x: number, y: number, z = 0) {
    this.coords = [x, y, z]
  }

  isAllZeros() {
    return this.x === 0 && this.y === 0 && this.z === 0
  }

  isAllOnes() {
    return this.x === 1 && this.y === 1 && this.z === 1
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
    return this.x ** 2 + this.y ** 2 + this.z ** 2
  }

  mag() {
    return sqrt(this.magSq())
  }

  normalize() {
    return this.div(this.mag())
  }

  setMag(magnitude: number) {
    return this.normalize().mult(magnitude)
  }

  add(anotherVector: Vector) {
    this.x += anotherVector.x
    this.y += anotherVector.y
    this.z += anotherVector.z ?? 0

    return this
  }

  sub(anotherVector: Vector) {
    return this.add(anotherVector.clone().mult(-1))
  }

  mult(scalarValue: number) {
    this.x *= scalarValue
    this.y *= scalarValue
    this.z *= scalarValue

    return this
  }

  div(scalarValue: number) {
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
    return [[this.x], [this.y], [this.z], [1]] // 4x1 matrix.
  }

  static create(x: number, y: number, z?: number) {
    return new Vector(x, y, z)
  }

  static from4dMatrix(matrix: transformationMatrix4x4Type) {
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
