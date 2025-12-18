/**
 * Utility to handle floating promises by catching and logging errors.
 *
 * This prevents "UnhandledPromiseRejectionWarning" when a promise is triggered
 * but not awaited (fire-and-forget).
 *
 * @param p - The promise to void.
 */
export function voided(p: Promise<unknown>) {
  p.catch((e) => console.error('[voided]', e));
}
