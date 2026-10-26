/**
 * Builds a tuple type with a fixed length.
 *
 * `Tuple<number, 3>` resolves to `[number, number, number]`, while
 * `Tuple<number, number>` resolves to `number[]`.
 *
 * @typeParam T - The type of every element of the tuple.
 * @typeParam N - The number of elements of the tuple.
 * @example
 * ```ts
 * import type { Tuple } from './utility_types.ts'
 * type Vec3 = Tuple<number, 3>
 * const v: Vec3 = [1, 2, 3]
 * ```
 */
export type Tuple<T, N extends number> = N extends number // Triggers distribution (alternative: `N extends N`)
  ? number extends N // Is N the `number` type?
    ? T[]
    : _TupleOf<T, N>
  : never // Unreachable code

type _TupleOf<
  T,
  N extends number,
  Acc extends T[] = [],
> = Acc['length'] extends N // Has the R tuple type exactly N items? (alternative: `R extends { length: N }`)
  ? Acc
  : _TupleOf<T, N, [T, ...Acc]>
