export interface FallbackResult {
  strategy: string;
  notes: string[];
}

export function regexFallback(): FallbackResult {
  return {
    strategy: 'regex-parser',
    notes: [
      'Using deterministic regex parser for SARIF and JUnit extraction',
      'LLM path bypassed due to safety or cost constraint',
    ],
  };
}

export function cannedPlaybookFallback(playbook: string): FallbackResult {
  return {
    strategy: 'canned-playbook',
    notes: [
      `Applied playbook ${playbook}`,
      'Provenance maintained via signed runbook entry',
    ],
  };
}
