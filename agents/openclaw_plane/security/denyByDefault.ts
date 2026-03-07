export function isCapabilityAllowed(
  capability: string,
  allowlist: Record<string, boolean>
): boolean {
  return allowlist[capability] === true;
}
