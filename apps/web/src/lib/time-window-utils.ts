import { TimeWindow, Granularity, TimezoneMode } from '../types/time-window'

/**
 * Normalizes a TimeWindow by:
 * 1. Ensuring startMs <= endMs.
 * 2. Rounding to the nearest granularity.
 * 3. Assigning a sequence number if not provided (though seq should be managed by the store).
 */
export const normalizeWindow = (
  startMs: number,
  endMs: number,
  granularity: Granularity,
  tzMode: TimezoneMode,
  seq: number
): TimeWindow => {
  // 1. Ordering
  let safeStart = Math.min(startMs, endMs)
  let safeEnd = Math.max(startMs, endMs)

  // 2. Rounding (simple implementation)
  const roundToGranularity = (ms: number, gran: Granularity): number => {
    const date = new Date(ms)
    if (gran === 'minute') {
      date.setSeconds(0, 0)
    } else if (gran === 'hour') {
      date.setMinutes(0, 0, 0)
    } else if (gran === 'day') {
      date.setHours(0, 0, 0, 0)
    }
    return date.getTime()
  }

  safeStart = roundToGranularity(safeStart, granularity)
  safeEnd = roundToGranularity(safeEnd, granularity)

  // Ensure end is at least one unit of granularity after start if they are equal?
  // Spec says "pick inclusive/exclusive". Let's assume inclusive start, exclusive end for now,
  // or just simple range. If equal, it's a point.
  // The spec says "shared time window model".
  // Let's strictly follow inputs.

  return {
    startMs: safeStart,
    endMs: safeEnd,
    granularity,
    tzMode,
    seq,
  }
}

export const createInitialTimeWindow = (): TimeWindow => {
  const now = Date.now()
  const oneHourAgo = now - 3600 * 1000
  return normalizeWindow(oneHourAgo, now, 'minute', 'UTC', 0)
}
