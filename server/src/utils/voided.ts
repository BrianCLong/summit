/**
 * Handles a promise by catching any errors and logging them to the console.
 * Useful for "fire and forget" operations where the result is not needed and errors should not crash the application.
 *
 * @param p - The promise to watch
 */
export function voided(p: Promise<unknown>) {

  p.catch((e) => console.error('[voided]', e));
}
