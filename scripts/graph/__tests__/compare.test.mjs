import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareSnapshotToDeltas } from '../lib/compare.mjs';

describe('compareSnapshotToDeltas', () => {
  it('flags missing snapshot records', () => {
    const snapshotRecords = [];
    const deltaRecords = [
      {
        kind: 'node',
        tenant_id: 'acme',
        uuid: 'node-1',
        type: 'Person',
        version: 3,
        provenance_id: 'prov-1',
        evidence_ids: ['ev-1'],
      },
    ];

    const findings = compareSnapshotToDeltas({ snapshotRecords, deltaRecords });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].checks[0].name, 'exists_in_neo4j');
    assert.equal(findings[0].checks[0].status, 'fail');
  });

  it('flags version mismatch', () => {
    const snapshotRecords = [
      {
        kind: 'node',
        tenant_id: 'acme',
        uuid: 'node-1',
        type: 'Person',
        version: 2,
        provenance_id: 'prov-1',
      },
    ];
    const deltaRecords = [
      {
        kind: 'node',
        tenant_id: 'acme',
        uuid: 'node-1',
        type: 'Person',
        version: 3,
        provenance_id: 'prov-1',
        evidence_ids: ['ev-1'],
      },
    ];

    const findings = compareSnapshotToDeltas({ snapshotRecords, deltaRecords });

    assert.equal(findings.length, 1);
    assert.equal(findings[0].diff.field, 'version');
  });
});
