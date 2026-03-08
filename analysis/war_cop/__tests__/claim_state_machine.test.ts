import { describe, it } from "node:test";
import * as assert from "node:assert";
const expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });

import { updateClaimState, ClaimRecord } from '../claim_state_machine';

describe('updateClaimState', () => {
  it('updates state to contested if contradicted', () => {
    const claim: ClaimRecord = {
      claim_id: 'CLAIM:1',
      state: 'new',
      corroboration_count: 0,
      contradiction_count: 1,
      disinfo_risk: 'low',
      last_checked_utc: '2023-01-01',
    };
    const updated = updateClaimState(claim);
    expect(updated.state).toBe('contested');
  });
});
