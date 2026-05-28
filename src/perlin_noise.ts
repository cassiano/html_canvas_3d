// https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%2218t809aNXjHuIUIhCMnwVifnrjyrgw_se%22%5D,%22action%22:%22open%22,%22userId%22:%22113757018662815530084%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing

///////////////////////
// AI-generated code //
///////////////////////

class Perlin {
  private p: Uint8Array

  constructor() {
    this.p = new Uint8Array(512)
    this.seed(Math.random())
  }

  /**
   * Seeds the noise generator.
   * Similar to p5.js noiseSeed()
   */
  seed(seed: number) {
    // Standard permutation table
    const permutation = new Uint8Array(256).map((_, i) => i)

    // Shuffle using the seed (Fisher-Yates)
    let m = seed
    const random = () => {
      m = (m * 1664525 + 1013904223) % 4294967296
      return m / 4294967296
    }

    for (let i = 255; i > 0; i--) {
      const r = Math.floor(random() * (i + 1))
      ;[permutation[i], permutation[r]] = [permutation[r], permutation[i]]
    }

    // Duplicate to avoid overflow lookups
    for (let i = 0; i < 512; i++) {
      this.p[i] = permutation[i & 255]
    }
  }

  /**
   * Main noise function
   * Supports 1, 2, or 3 arguments
   */
  noise(x: number, y: number = 0, z: number = 0): number {
    // Determine unit cube that contains point
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    // Relative x, y, z of point in cube
    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    // Fade curves
    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    // Hash coordinates of the 8 cube corners
    const p = this.p
    const A = p[X] + Y,
      AA = p[A] + Z,
      AB = p[A + 1] + Z
    const B = p[X + 1] + Y,
      BA = p[B] + Z,
      BB = p[B + 1] + Z

    // Add blended results from 8 corners of cube
    const res = this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z)),
        this.lerp(
          u,
          this.grad(p[AB], x, y - 1, z),
          this.grad(p[BB], x - 1, y - 1, z),
        ),
      ),
      this.lerp(
        v,
        this.lerp(
          u,
          this.grad(p[AA + 1], x, y, z - 1),
          this.grad(p[BA + 1], x - 1, y, z - 1),
        ),
        this.lerp(
          u,
          this.grad(p[AB + 1], x, y - 1, z - 1),
          this.grad(p[BB + 1], x - 1, y - 1, z - 1),
        ),
      ),
    )

    // Map result from [-1, 1] to [0, 1] for p5 compatibility
    return (res + 1) / 2
  }

  private fade(t: number): number {
    // 6t^5 - 15t^4 + 10t^3
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    // Convert low 4 bits of hash code into 12 gradient directions
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }
}

// Export a singleton instance similar to how p5 provides it globally
export const perlin = new Perlin()
