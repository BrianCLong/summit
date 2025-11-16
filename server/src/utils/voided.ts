export function voided(p: Promise<unknown>) {

  p.catch((e) => console.error('[voided]', e));
}
