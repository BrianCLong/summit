import {
  analyzeConsentRevocationImpact,
  diffConsentPolicies,
  getConsentGraphSnapshot,
  listConsentPolicyVersions,
} from '../index.ts';

function getVersion(id: string) {
  const version = listConsentPolicyVersions().find((item) => item.id === id);
  if (!version) {
    throw new Error(`Missing test fixture for version ${id}`);
  }
  return version;
}

describe('Consent graph temporal views', () => {
  it('returns deterministic snapshots for identical asOf coordinates', () => {
    const version = getVersion('v1');
    const snapshotA = getConsentGraphSnapshot(version.validTime, version.txTime);
    const snapshotB = getConsentGraphSnapshot(version.validTime, version.txTime);

    expect(snapshotA).toEqual(snapshotB);
    expect(snapshotA.edges).not.toHaveLength(0);
  });

  it('diffs isolate actual consent changes between policy versions', () => {
    const diff = diffConsentPolicies('v1', 'v2');

    const addedEdgeIds = diff.added.map((edge) => edge.id).sort();
    const removedEdgeIds = diff.removed.map((edge) => edge.id).sort();

    expect(addedEdgeIds).toEqual([
      'edge:flow:alice-analytics',
      'edge:purpose:marketing->scope:analytics',
    ]);
    expect(removedEdgeIds).toEqual([
      'edge:flow:alice-location',
      'edge:purpose:marketing->scope:location',
      'edge:scope:location->delegation:acme',
    ]);
    expect(diff.unchangedCount).toBeGreaterThan(0);
  });

  it('surfaces all impacted flows when a purpose is revoked', () => {
    const version = getVersion('v2');
    const impact = analyzeConsentRevocationImpact('purpose:marketing', version.validTime, version.txTime);

    const impactedFlowIds = impact.impactedSubjects.flatMap((subject) =>
      subject.flows.map((flow) => flow.flow.id),
    );

    expect(impact.totalImpactedFlows).toBe(2);
    expect(new Set(impactedFlowIds)).toEqual(new Set(['flow:alice-email', 'flow:alice-analytics']));
  });
});
