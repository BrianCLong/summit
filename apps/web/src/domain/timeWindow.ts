/**
 * Time Window Domain Model
 *
 * Provides a shared, normalized definition of time windows
 * to be used across all analyst tools (Timeline, Graph, Map).
 *
 * This acts as the "Single Source of Truth" for time representation.
 */

export type Granularity = 'minute' | 'hour' | 'day'

export type TZMode = 'UTC' | 'LOCAL'

/**
 * Normalized TimeWindow structure.
 *
 * Invariant: startMs <= endMs
 * Invariant: startMs and endMs are valid finite numbers
 */
export type TimeWindow = Readonly<{
  startMs: number // inclusive, epoch ms
  endMs: number // inclusive (based on requirement to pick one)
  granularity: Granularity
  tzMode: TZMode
}>

/**
 * Normalizes a time window to ensure invariants.
 * - Clamps start/end
 * - Enforces start <= end
 */
export function normalizeWindow(w: TimeWindow): TimeWindow {
  const start = Math.min(w.startMs, w.endMs)
  const end = Math.max(w.startMs, w.endMs)

  // Potential future place for granularity rounding logic

  return {
    ...w,
    startMs: start,
    endMs: end,
  }
}

/**
 * Asserts that a time window is valid.
 * Useful for dev-time invariants and runtime checks.
 */
export function assertValidWindow(w: TimeWindow) {
  if (!(Number.isFinite(w.startMs) && Number.isFinite(w.endMs))) {
    throw new Error(`Invalid window: start=${w.startMs}, end=${w.endMs}`)
  }
  if (w.endMs < w.startMs) {
    throw new Error(`Window reversed: start=${w.startMs} > end=${w.endMs}`)
  }
}

/**
 * Helper to convert legacy ISO string window to new TimeWindow
 */
export function fromIsoWindow(
  from: string,
  to: string,
  granularity: Granularity = 'minute',
  tzMode: TZMode = 'UTC'
): TimeWindow {
  return normalizeWindow({
    startMs: new Date(from).getTime(),
    endMs: new Date(to).getTime(),
    granularity,
    tzMode,
  })
}

/**
 * Helper to convert TimeWindow to legacy ISO object
 */
export function toIsoWindow(w: TimeWindow): { from: string; to: string } {
  return {
    from: new Date(w.startMs).toISOString(),
    to: new Date(w.endMs).toISOString(),
  }
}
