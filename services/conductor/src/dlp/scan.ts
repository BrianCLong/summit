const PAN = /\b(?:\d[ -]*?){13,16}\b/;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/;
export function scan(buf: Buffer) {
  const s = buf.toString('utf8');
  const findings: any[] = [];
  if (PAN.test(s)) findings.push({ kind: 'PAN', severity: 'high' });
  if (SSN.test(s)) findings.push({ kind: 'SSN', severity: 'high' });
  return findings;
}
