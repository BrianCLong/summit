import { describe, it, expect } from 'vitest';
import { validateTECFEvent } from '../../../../src/graphrag/atg/tecf/validate.js';
import { TECFActorType, TECFAssetType, TECFIntentHypothesis } from '../../../../src/graphrag/atg/tecf/schema.js';

describe('TECF Validation', () => {
  const validEvent = {
    tenant_id: 'tenant-123',
    event_id: 'event-456',
    event_time: '2025-02-06T12:00:00Z',
    actor: {
      type: TECFActorType.HUMAN,
      id: 'user-789'
    },
    asset: {
      type: TECFAssetType.FILE,
      id: 'file-abc'
    },
    channel: 'm365',
    action: 'download',
    confidence: 0.9,
    raw_ref: {
      source_system: 'm365-audit',
      external_id: 'raw-123'
    },
    provenance: {
      connector_id: 'm365-connector',
      run_id: 'run-001'
    }
  };

  it('should validate a correct event', () => {
    expect(() => validateTECFEvent(validEvent)).not.toThrow();
  });

  it('should throw on missing required fields', () => {
    const invalidEvent = { ...validEvent };
    delete (invalidEvent as any).tenant_id;
    expect(() => validateTECFEvent(invalidEvent)).toThrow();
  });

  it('should throw on invalid enum values', () => {
    const invalidEvent = {
      ...validEvent,
      actor: {
        type: 'SUPERMAN',
        id: 'clark-kent'
      }
    };
    expect(() => validateTECFEvent(invalidEvent)).toThrow();
  });

  it('should throw on invalid confidence range', () => {
    const invalidEvent = { ...validEvent, confidence: 1.5 };
    expect(() => validateTECFEvent(invalidEvent)).toThrow();
  });
});
