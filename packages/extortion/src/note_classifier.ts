import { Tactic } from './schema';

export function classifyNote(text: string): { tactics: Tactic[]; confidence: number } {
  const t = text.toLowerCase();
  const tactics = new Set<Tactic>();

  if (t.includes('aware') || t.includes('know you') || t.includes('surveillance') || t.includes('watching')) {
    tactics.add('SURVEILLANCE_CLAIM');
  }

  if (t.includes('24 hour') || t.includes('deadline') || t.includes('within') || t.includes('time limit')) {
    tactics.add('TIME_PRESSURE');
  }

  if (t.includes('legal') || t.includes('liability') || t.includes('gdpr') || t.includes('compliance') || t.includes('lawsuit')) {
    tactics.add('LEGAL_LIABILITY_FRAMING');
  }

  if (t.includes('publish') || t.includes('leak site') || t.includes('shame') || t.includes('public')) {
    tactics.add('PUBLIC_SHAMING');
  }

  if (t.includes('downloaded') || t.includes('sensitive data') || t.includes('exfiltrated') || t.includes('stolen')) {
    tactics.add('DATA_DISCLOSURE_THREAT');
  }

  if (t.includes('restore from backup') || t.includes('backup will not help') || t.includes('encryption')) {
    tactics.add('DOWNTIME_EMPHASIS');
  }

  const result = Array.from(tactics).sort();
  // Simple confidence based on number of tactics found vs potential
  const confidence = result.length > 0 ? 0.8 : 0.1;

  return { tactics: result, confidence };
}
