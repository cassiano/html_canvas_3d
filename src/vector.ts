import { sqrt } from './util'
import { transformationMatrix4x4Type } from './primitives'

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
    return this.mult(1 / scalarValue)
  }

  toArray() {
    return [this.x, this.y, this.z]
  }

  toString() {
    return JSON.stringify(this.toArray())
  }

  to4dMatrix() {
    return [[this.x], [this.y], [this.z], [1]]
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

export const $v = Vector.create // Shorter synonym for `createVector()`.
export const createVector = $v
