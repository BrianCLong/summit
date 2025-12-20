import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(ensureAuthenticated);

// 1. Governance Status
router.get('/governance/status', (req, res) => {
  // Mock logic: Check for simulated 'overrides' or 'bypass'
  // In a real scenario, this might check OPA policy results or audit logs.
  const status = {
    status: 'green', // 'green' | 'yellow' | 'red'
    details: {
      activePermissionTiers: ['tier-1', 'tier-2', 'tier-3', 'tier-4'],
      governanceProtectedPaths: 15,
      lastTier4Approval: new Date().toISOString(),
      killSwitchStatus: 'inactive',
    },
    message: 'All governance policies enforced.',
  };
  res.json(status);
});

// 2. Agents Status
router.get('/agents/status', (req, res) => {
  // Mock logic: Check QuotaManager or specific agent telemetry
  const status = {
    status: 'green',
    details: {
      activeAgents: {
        'tier-1': 5,
        'tier-2': 12,
        'tier-3': 3,
      },
      budgetUsagePercent: 45,
      topRiskScores: [
        { agentId: 'agent-alpha', score: 12 },
        { agentId: 'agent-bravo', score: 8 },
      ],
      lastTerminatedAgent: {
        id: 'agent-charlie',
        reason: 'BudgetExceeded',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    },
  };
  res.json(status);
});

// 3. CI Status
router.get('/ci/status', (req, res) => {
  // Mock logic: Could integrate with GitHub API if token available, otherwise mock.
  const status = {
    status: 'green',
    details: {
      openPRs: {
        'tier-1': 2,
        'tier-2': 5,
      },
      blockedPRs: [
        { id: 123, reason: 'GovernanceCheckFailed' }
      ],
      governanceFailures24h: 1,
      ciPassRate: 0.98,
    },
  };
  res.json(status);
});

// 4. Releases Status
router.get('/releases/status', (req, res) => {
  const status = {
    status: 'yellow', // Example: Canary active
    details: {
      currentTrain: 'canary',
      evidenceBundleCompleteness: 0.95,
      rollbackReadiness: 'ready',
      lastReleaseHash: 'a1b2c3d4',
    },
  };
  res.json(status);
});

// 5. ZK & Isolation Status
router.get('/zk/status', (req, res) => {
  const status = {
    status: 'green',
    details: {
      zkProtocolVersion: 'v2.1.0',
      unsafeChangeAttempts: 0,
      isolationViolations: 0,
      lastTabletopExercise: '2023-10-15',
    },
  };
  res.json(status);
});

// 6. Streaming Status
router.get('/streaming/status', (req, res) => {
  const status = {
    status: 'green',
    details: {
      eventIngestionRate: 1250, // events/sec
      streamLagMs: 45,
      featureFreshnessMs: 120,
      budgetImpact: 'low',
    },
  };
  res.json(status);
});

// 7. GA Readiness Status
router.get('/ga/status', (req, res) => {
  // Derived logic
  const status = {
    status: 'red', // Example: Not ready yet
    details: {
      checklist: {
        governance: true,
        security: true,
        isolation: true,
        agentBudgets: true,
        releases: false, // Canary is active, not stable GA
        docsAudit: true,
      },
    },
  };
  res.json(status);
});

export default router;
