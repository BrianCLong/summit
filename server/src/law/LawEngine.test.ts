
import { describe, it, expect, beforeEach } from '@jest/globals';
import { LawEngine } from './LawEngine.js';
import { EpistemicLaws } from './constitution.js';

describe('LawEngine', () => {
  let engine: LawEngine;

  beforeEach(() => {
    engine = LawEngine.getInstance();
    // Re-register laws to be sure
    EpistemicLaws.forEach(law => {
        if (!engine.getLaws().find(l => l.id === law.id)) {
            engine.registerLaw(law);
        }
    });
  });

  it('should enforce EL-01 (Provenance)', async () => {
    const context: any = {
      actor: { id: 'test-user', roles: ['admin'] },
      action: 'CREATE_CLAIM',
      resource: { data: 'foo' } // Missing provenance
    };

    const result = await engine.evaluate(context);
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.lawId === 'EL-01')).toBe(true);
  });

  it('should allow valid EL-01 resource', async () => {
    const context: any = {
      actor: { id: 'test-user', roles: ['admin'] },
      action: 'CREATE_CLAIM',
      resource: { data: 'foo', provenance: { source: 'trusted' } }
    };

    const result = await engine.evaluate(context);
    expect(result.allowed).toBe(true);
  });

  it('should enforce EL-02 (Authority)', async () => {
    const context: any = {
      actor: { id: 'bad-user', roles: [] }, // No roles
      action: 'DELETE_DB',
      resource: { provenance: {} }
    };

    const result = await engine.evaluate(context);
    expect(result.allowed).toBe(false);
    expect(result.violations.some(v => v.lawId === 'EL-02')).toBe(true);
  });
});
