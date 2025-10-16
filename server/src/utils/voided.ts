export function voided(p: Promise<unknown>) {
  // eslint-disable-next-line no-console
  p.catch((e) => console.error('[voided]', e));
}
