/**
 * Handles a promise by attaching a catch handler that logs any errors.
 * Useful for fire-and-forget operations where we don't want unhandled rejections.
 *
 * @param {Promise<unknown>} p - The promise to handle.
 */
export function voided(p: Promise<unknown>) {

  p.catch((e) => console.error('[voided]', e));
}
