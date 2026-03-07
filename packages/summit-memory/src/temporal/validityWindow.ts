export interface ValidityWindow {
  validityStart?: string;
  validityEnd?: string | null;
}

export function isWithinValidityWindow(
  t: string,
  window: ValidityWindow
): boolean {
  const ts = Date.parse(t);
  const startOk = window.validityStart
    ? ts >= Date.parse(window.validityStart)
    : true;
  const endOk = window.validityEnd ? ts <= Date.parse(window.validityEnd) : true;
  return startOk && endOk;
}
