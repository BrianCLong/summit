export function generateEvidenceID(
  domain: string,
  scopeId: string,
  artifact: string,
  version: string
): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `EVID::${domain}::${date}::${scopeId}::${artifact}::v${version}`;
}
