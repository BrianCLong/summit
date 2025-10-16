export function mapToOKR(files: string[]): string[] {
  const rules = [
    { pat: /server\/api\//, okr: 'OKR-Q3-LATENCY' },
    { pat: /tests\//, okr: 'OKR-QA-ROBUST' },
  ];
  return rules
    .filter((r) => files.some((f) => r.pat.test(f)))
    .map((r) => r.okr);
}
