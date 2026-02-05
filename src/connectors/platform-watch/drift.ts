import { ClaimItem, DriftReason, DriftResult, EvidenceItem } from './types';

const NO_CHANGE_PATTERNS = [
  /no\s+new\s+(features|integrations|releases|updates|announcements|pricing)/i,
  /no\s+updates?/i,
  /no\s+new\s+releases?/i,
  /quiet\s+persists?/i,
  /no\s+recent\s+announcements?/i,
];

const CHANGE_SIGNAL_PATTERNS = [
  /release/i,
  /version/i,
  /introduc/i,
  /announce/i,
  /launch/i,
  /update/i,
];

export function detectDrift(claims: ClaimItem[], evidence: EvidenceItem[]): DriftResult {
  const reasons: DriftReason[] = [];
  const evidenceByPlatform = groupEvidenceByPlatform(evidence);

  for (const claim of claims) {
    if (!isNoChangeClaim(claim.text)) continue;
    const relatedEvidence = evidenceByPlatform.get(claim.platform) ?? [];
    const contradicting = relatedEvidence.find((item) => isChangeSignal(item));
    if (contradicting) {
      reasons.push({
        claim_id: claim.id,
        evidence_id: contradicting.id,
        explanation: 'Claim indicates no-change while evidence shows an update signal.',
      });
    }
  }

  return {
    detected: reasons.length > 0,
    reasons: reasons.sort((a, b) => a.claim_id.localeCompare(b.claim_id)),
  };
}

export function isNoChangeClaim(text: string): boolean {
  return NO_CHANGE_PATTERNS.some((pattern) => pattern.test(text));
}

export function isChangeSignal(evidence: EvidenceItem): boolean {
  const combined = `${evidence.title} ${evidence.summary} ${evidence.tags.join(' ')}`;
  return CHANGE_SIGNAL_PATTERNS.some((pattern) => pattern.test(combined));
}

function groupEvidenceByPlatform(evidence: EvidenceItem[]): Map<string, EvidenceItem[]> {
  const map = new Map<string, EvidenceItem[]>();
  for (const item of evidence) {
    const list = map.get(item.platform) ?? [];
    list.push(item);
    map.set(item.platform, list);
  }
  for (const [key, list] of map.entries()) {
    map.set(
      key,
      list.sort((a, b) => a.id.localeCompare(b.id)),
    );
  }
  return map;
}
