export const { PI, sin, cos, tan, min, max, sqrt, abs } = Math

export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}

export const sample = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)]
