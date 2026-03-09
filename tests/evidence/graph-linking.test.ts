import { describe, it } from 'node:test';
import assert from 'node:assert';
import { linkEvidenceToEntity } from '../../src/evidence/linking/graphLinker';

describe('GraphLinker', () => {
  it('should link evidence to entity', () => {
    const link = linkEvidenceToEntity('EVID:123', 'entity:456');
    assert.strictEqual(link.relation, 'supports');
    assert.strictEqual(link.evidenceId, 'EVID:123');
    assert.strictEqual(link.entityId, 'entity:456');
  });
});
