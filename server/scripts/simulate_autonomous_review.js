"use strict";
// Simulation script for Agent-Only Change Review
// Usage: npx tsx server/scripts/simulate_autonomous_review.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ChangeReviewAgent_js_1 = require("../src/autonomous/ChangeReviewAgent.js");
const types_js_1 = require("../src/autonomous/types.js");
const policy_engine_js_1 = require("../src/autonomous/policy-engine.js");
const ledger_js_1 = require("../src/provenance/ledger.js");
const pino_1 = __importDefault(require("pino"));
// Mock Dependencies
const logger = (0, pino_1.default)({ level: 'info' });
// Mock Policy Engine
class MockPolicyEngine extends policy_engine_js_1.PolicyEngine {
    constructor() {
        // Pass dummy values to super
        super('http://localhost:8181', {}, logger);
    }
    async evaluate(subject, action, resource, context) {
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
class MockLedger extends ledger_js_1.ProvenanceLedgerV2 {
    constructor() {
        super();
        // Disable the signing timer immediately to prevent process hang
        this.cleanup();
    }
    async appendEntry(entry) {
        logger.info({ entry }, 'Mock Ledger: Appending Entry');
        return { ...entry, id: 'mock-entry-id', currentHash: 'mock-hash' };
    }
}
async function runSimulation() {
    const policyEngine = new MockPolicyEngine();
    const ledger = new MockLedger();
    const agent = new ChangeReviewAgent_js_1.ChangeReviewAgent(policyEngine, logger, ledger);
    console.log('--- Starting Agent-Only Change Review Simulation ---\n');
    const scenarios = [
        {
            id: 'CR-101',
            authorId: 'user-alice',
            tenantId: 'tenant-1',
            type: types_js_1.ChangeType.DOCS,
            title: 'Update README.md',
            description: 'Fixing typos',
            files: [{ path: 'README.md', additions: 5, deletions: 2 }]
        },
        {
            id: 'CR-102',
            authorId: 'user-bob',
            tenantId: 'tenant-1',
            type: types_js_1.ChangeType.CODE,
            title: 'Small bugfix in utils',
            description: 'Fixing null check',
            files: [{ path: 'src/utils.ts', additions: 10, deletions: 5 }]
        },
        {
            id: 'CR-103',
            authorId: 'user-charlie',
            tenantId: 'tenant-1',
            type: types_js_1.ChangeType.INFRA,
            title: 'Update DB config',
            description: 'Changing connection pool size',
            files: [{ path: 'config/db.ts', additions: 2, deletions: 2 }]
        },
        {
            id: 'CR-104',
            authorId: 'user-dave',
            tenantId: 'tenant-1',
            type: types_js_1.ChangeType.CONFIG,
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
