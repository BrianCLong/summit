export function assertEvidenceId(input: string): void {
  const ok = /^EVID:[a-z0-9-]+:[A-Za-z0-9._:-]+:[a-f0-9]{6,}$/u.test(input);
  if (!ok) throw new Error(`Invalid evidence id: ${input}`);
}

export function buildDeterministicStamp(version: string) {
  return { protocol: "SEP", version };
}
