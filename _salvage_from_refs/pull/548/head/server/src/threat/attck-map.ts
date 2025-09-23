/**
 * Minimal keyword to MITRE ATT&CK technique mapping.
 * Extend with additional techniques as needed.
 */
export const ATTCK_MAP: Record<string, string> = {
  phishing: 'T1566',
  'lateral-movement': 'T1021'
};

export function mapToTechniques(keywords: string[]): string[] {
  return keywords.flatMap((k) => (ATTCK_MAP[k] ? [ATTCK_MAP[k]] : []));
}
