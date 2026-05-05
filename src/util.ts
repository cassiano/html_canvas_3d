export const { PI, sin, cos, tan, min, max, sqrt } = Math

export const timesForEach = (count: number, fn: (i: number) => void) => {
  for (let i = 0; i < count; i++) fn(i)
}
