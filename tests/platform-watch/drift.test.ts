import { detectDrift } from '../../src/connectors/platform-watch/drift';
import { ClaimItem, EvidenceItem } from '../../src/connectors/platform-watch/types';

describe('platform-watch drift detection', () => {
  it('flags drift when no-change claims conflict with evidence', () => {
    const evidence: EvidenceItem[] = [
      {
        id: 'EVD-PLAT-SHADOWDRAGON-20260205-abcdef12',
        platform: 'shadowdragon',
        source_url: 'https://shadowdragon.io/blog/shadowdragon-introduces-horizon-identity/',
        title: 'Introducing Horizon Identity',
        content_hash: 'a'.repeat(64),
        summary: 'ShadowDragon announces Horizon Identity.',
        tags: ['announcement'],
      },
    ];

    const claims: ClaimItem[] = [
      {
        id: 'ITEM:CLAIM-03',
        text: 'ShadowDragon: No new coverage, platform, or partnership announcements.',
        platform: 'shadowdragon',
        evidence_refs: [],
      },
    ];

    const drift = detectDrift(claims, evidence);
    expect(drift.detected).toBe(true);
    expect(drift.reasons).toHaveLength(1);
    expect(drift.reasons[0].claim_id).toBe('ITEM:CLAIM-03');
  });
});
