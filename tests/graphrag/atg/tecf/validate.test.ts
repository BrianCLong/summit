import { describe, it, expect } from '@jest/globals';
import { validateTECFEvent } from '../../../../src/graphrag/atg/tecf/validate.js';
import { TECFActorType, TECFAssetType } from '../../../../src/graphrag/atg/tecf/schema.js';
describe('TECF Validation', () => {
  it('should validate correct event', () => {
    const event = { tenant_id: 't', event_id: 'e', event_time: '2025-02-06T12:00:00Z', actor: { type: TECFActorType.HUMAN, id: 'u' }, asset: { type: TECFAssetType.FILE, id: 'a' }, channel: 'c', action: 'a', confidence: 0.5, raw_ref: { source_system: 's', external_id: 'x' }, provenance: { connector_id: 'c', run_id: 'r' } };
    expect(() => validateTECFEvent(event)).not.toThrow();
  });
});
