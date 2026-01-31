
import { PolicyEngine } from '../src/autonomous/policy-engine';
import path from 'path';

const mockDb = { query: async () => ({ rows: [] }) };
const mockLogger = {
    info: (obj: any, msg: string) => console.log('INFO:', msg, obj),
    error: (obj: any, msg: string) => console.error('ERROR:', msg, obj),
    warn: (obj: any, msg: string) => console.warn('WARN:', msg, obj),
    debug: () => {}
};

async function verify() {
  console.log('Verifying Policy Engine Cards...');
  console.log('CWD:', process.cwd());

  const engine = new PolicyEngine('http://mock-opa', mockDb as any, mockLogger as any);

  // Test Case 1: High Autonomy + Critical Resource -> Should be DENIED by card
  const context = {
    user: { id: 'u1', roles: [], tenantId: 't1', permissions: [] },
    resource: { type: 'db', id: 'production-db', tenantId: 't1', sensitivity: 'critical' },
    action: { type: 'delete', category: 'write', autonomy: 4 }, // Autonomy > 3
    environment: { name: 'prod', production: true, region: 'us-east' },
    time: { timestamp: Date.now(), timezone: 'UTC', businessHours: true }
  };

  const decision = await engine.evaluate('u1', 'delete', 'production:db', {
      autonomy: 4,
      budgets: { usd: 1, tokens: 1, timeMinutes: 1 }
  });

  if (decision.allowed === false && decision.reason.includes('no-high-risk-autonomy')) {
     console.log('✅ Policy Card Enforcement Verified: High Autonomy action blocked.');
     process.exit(0);
  } else {
     console.error('❌ Policy Card Enforcement Failed:', decision);
     process.exit(1);
  }
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
