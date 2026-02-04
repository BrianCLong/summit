
// Simulation script for Agent-Only Change Review
// Usage: npx tsx server/scripts/simulate_autonomous_review.ts

import { ChangeReviewAgent } from '../src/autonomous/ChangeReviewAgent.js';
import { ChangeRequest, ChangeType, ReviewDecision } from '../src/autonomous/types.js';
import { PolicyEngine, PolicyDecision } from '../src/autonomous/policy-engine.js';
import { ProvenanceLedgerV2 } from '../src/provenance/ledger.js';
import pino from 'pino';

// Mock Dependencies
const logger = pino({ level: 'info' });

// Mock Policy Engine
class MockPolicyEngine extends PolicyEngine {
  constructor() {
    // Pass dummy values to super
    super('http://localhost:8181', {} as any, logger);
  }

  async evaluate(subject: string, action: string, resource: string, context: any): Promise<PolicyDecision> {
    logger.info({ subject, action, context }, 'Mock Policy Evaluation');

    // Simulate policy logic based on context
    if (context.autonomy >= 4) {
       return { allowed: true, reason: 'High autonomy allowed', requiresApproval: false, riskScore: 10 };
    }
    if (context.autonomy === 3) {
       return { allowed: true, reason: 'Medium autonomy, approval needed', requiresApproval: true, riskScore: 40 };
    }
    if (context.resourceSensitivity === 'critical') {
       return { allowed: false, reason: 'Critical resource blocked', requiresApproval: true, riskScore: 90 };
    }

    return { allowed: false, reason: 'Default deny', requiresApproval: true, riskScore: 60 };
  }
}

// Mock Ledger
class MockLedger extends ProvenanceLedgerV2 {
  constructor() {
      super();
      // Disable the signing timer immediately to prevent process hang
      this.cleanup();
  }

  async appendEntry(entry: any): Promise<any> {
    logger.info({ entry }, 'Mock Ledger: Appending Entry');
    return { ...entry, id: 'mock-entry-id', currentHash: 'mock-hash' };
  }
}

async function runSimulation() {
  const policyEngine = new MockPolicyEngine();
  const ledger = new MockLedger();
  const agent = new ChangeReviewAgent(policyEngine, logger, ledger);

  console.log('--- Starting Agent-Only Change Review Simulation ---\n');

  const scenarios: ChangeRequest[] = [
    {
      id: 'CR-101',
      authorId: 'user-alice',
      tenantId: 'tenant-1',
      type: ChangeType.DOCS,
      title: 'Update README.md',
      description: 'Fixing typos',
      files: [{ path: 'README.md', additions: 5, deletions: 2 }]
    },
    {
      id: 'CR-102',
      authorId: 'user-bob',
      tenantId: 'tenant-1',
      type: ChangeType.CODE,
      title: 'Small bugfix in utils',
      description: 'Fixing null check',
      files: [{ path: 'src/utils.ts', additions: 10, deletions: 5 }]
    },
    {
      id: 'CR-103',
      authorId: 'user-charlie',
      tenantId: 'tenant-1',
      type: ChangeType.INFRA,
      title: 'Update DB config',
      description: 'Changing connection pool size',
      files: [{ path: 'config/db.ts', additions: 2, deletions: 2 }]
    },
    {
        id: 'CR-104',
        authorId: 'user-dave',
        tenantId: 'tenant-1',
        type: ChangeType.CONFIG,
        title: 'Update Dev Config',
        description: 'New feature flag',
        files: [{ path: 'config/dev.json', additions: 1, deletions: 0 }],
        metadata: { env: 'dev' }
    }
  ];

  for (const req of scenarios) {
    console.log(`Processing ${req.id}: ${req.title} (${req.type})...`);
    const result = await agent.reviewChange(req);
    console.log(`  Decision: ${result.decision}`);
    console.log(`  Rationale: ${result.rationale}`);
    console.log(`  Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`  Risk Score: ${result.riskScore}\n`);
  }

  console.log('--- Simulation Complete ---');
  // Explicitly exit to ensure no hanging timers
  process.exit(0);
}

runSimulation().catch((err) => {
    console.error(err);
    process.exit(1);
});
