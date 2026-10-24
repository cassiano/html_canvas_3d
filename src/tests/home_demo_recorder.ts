/// <reference lib="deno.ns" />

/**
 * Records the lifecycle calls made by the demo modules injected into a
 * transformed copy of {@link ../home.ts}.
 *
 * `home.ts` loads each demo through Vite's `import.meta.glob`, which is not
 * available under Deno. The test suite replaces the glob with an inline map of
 * fake demo modules; those modules report their `start()` and `stop()` calls
 * here so that the tests can observe which demo the shell activated.
 */

/** A lifecycle call made by a demo module. */
export interface DemoCall {
  /** The hook that was invoked. */
  action: 'start' | 'stop'
  /** The module path of the demo. */
  path: string
}

/** Every lifecycle call recorded so far, in order. */
export const demoCalls: DemoCall[] = []

/**
 * Records a demo lifecycle call.
 *
 * @param action - The hook that was invoked.
 * @param path - The module path of the demo.
 * @returns Nothing; the call is appended to {@link demoCalls}.
 */
export const recordDemoCall = (action: DemoCall['action'], path: string) => {
  demoCalls.push({ action, path })
}

/**
 * Forgets every recorded lifecycle call.
 *
 * @returns Nothing; {@link demoCalls} is emptied in place.
 */
export const resetDemoCalls = () => {
  demoCalls.length = 0
}
