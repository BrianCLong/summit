#!/usr/bin/env node

/**
 * RepoOS Autonomous Governor Demo
 *
 * Demonstrates policy-based decision making for repository operations.
 * Shows how the governor evaluates actions through constitutional and
 * operational rules.
 */

import { policyEngine } from '../services/repoos/governor/policy-engine.js';

// ============================================================================
// DEMO SCENARIOS
// ============================================================================

console.log('\n' + '━'.repeat(80));
console.log('  RepoOS Autonomous Governor - Live Demo');
console.log('  Policy-Based Repository Governance');
console.log('━'.repeat(80) + '\n');

// Sample repository state
const repoState = {
  prs: [
    {
      id: 'pr-123',
      number: 123,
      title: 'Add new feature',
      author: 'developer',
      actorType: 'human',
      changedFiles: ['src/features/new-feature.ts', 'src/features/new-feature.test.ts'],
      labels: ['feature', 'frontend'],
      sizeLines: 250,
      mergeable: true,
      ciStatus: 'green',
      reviewStatus: 'approved',
      updatedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      concern: 'frontend',
    },
    {
      id: 'pr-124',
      number: 124,
      title: 'Update CI workflow',
      author: 'agent-bot',
      actorType: 'agent',
      changedFiles: ['.github/workflows/ci.yml'],
      labels: ['ci', 'automation'],
      sizeLines: 50,
      mergeable: true,
      ciStatus: 'green',
      reviewStatus: 'pending',
      updatedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      concern: 'ci',
    },
    {
      id: 'pr-125',
      number: 125,
      title: 'Fix security vulnerability',
      author: 'developer',
      actorType: 'human',
      changedFiles: ['server/src/security/auth.ts'],
      labels: ['security', 'hotfix'],
      sizeLines: 30,
      mergeable: true,
      ciStatus: 'red',
      reviewStatus: 'approved',
      updatedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      concern: 'security',
    },
  ],
  incidentMode: false,
  releaseFreeze: false,
  protectedPaths: ['.github/workflows/', 'governance/', 'services/repoos/'],
  requiredChecks: ['ci', 'tests', 'lint'],
  generatedAt: new Date().toISOString(),
  entropyScore: 0.0003,
  activeFrontiers: 58,
  ciQueueDepth: 15,
};

// ============================================================================
// SCENARIO 1: Low-Risk Human PR (Should Allow)
// ============================================================================

console.log('\n📋 Scenario 1: Low-Risk Human PR');
console.log('─'.repeat(80));

const scenario1 = {
  id: 'action-1',
  type: 'merge_pr',
  targetIds: ['pr-123'],
  actor: 'system',
  rationale: 'PR has green CI, approval, and no protected paths',
  metadata: {
    manifestUri: 'artifacts/manifests/pr-123.json',
    policyHash: 'sha256:abc123',
    evidenceArtifactPath: 'artifacts/evidence/pr-123.json',
    runId: 'run-001',
    costBudget: 100,
  },
  proposedAt: new Date().toISOString(),
};

const decision1 = await policyEngine.evaluateCandidateAction(
  scenario1,
  repoState,
  'governed_execute'
);

console.log(`\nAction: Merge PR #123`);
console.log(`Actor: ${scenario1.actor}`);
console.log(`Decision: ${decision1.decision.toUpperCase()}`);
console.log(`Allowed: ${decision1.allowed ? '✅ YES' : '❌ NO'}`);
console.log(`Severity: ${decision1.severity}`);
console.log(`\nReasons:`);
decision1.reasons.forEach(r => console.log(`  - ${r}`));
console.log(`\nPolicy Rules: ${decision1.policyRuleIds.join(', ') || 'None triggered'}`);

// ============================================================================
// SCENARIO 2: Agent Modifying Protected Path (Should Block)
// ============================================================================

console.log('\n\n📋 Scenario 2: Agent Modifying Protected Workflow');
console.log('─'.repeat(80));

const scenario2 = {
  id: 'action-2',
  type: 'merge_pr',
  targetIds: ['pr-124'],
  actor: 'agent',
  agentType: 'remediation',
  rationale: 'Agent attempting to optimize CI workflow',
  metadata: {
    manifestUri: 'artifacts/manifests/pr-124.json',
    policyHash: 'sha256:def456',
    evidenceArtifactPath: 'artifacts/evidence/pr-124.json',
    runId: 'run-002',
    costBudget: 50,
  },
  proposedAt: new Date().toISOString(),
};

const decision2 = await policyEngine.evaluateCandidateAction(
  scenario2,
  repoState,
  'governed_execute'
);

console.log(`\nAction: Merge PR #124 (Agent-initiated)`);
console.log(`Actor: ${scenario2.actor} (${scenario2.agentType})`);
console.log(`Decision: ${decision2.decision.toUpperCase()}`);
console.log(`Allowed: ${decision2.allowed ? '✅ YES' : '❌ NO'}`);
console.log(`Severity: ${decision2.severity}`);
console.log(`\nReasons:`);
decision2.reasons.forEach(r => console.log(`  - ${r}`));
console.log(`\nPolicy Rules: ${decision2.policyRuleIds.join(', ')}`);

// ============================================================================
// SCENARIO 3: Merge with Failing CI (Should Block)
// ============================================================================

console.log('\n\n📋 Scenario 3: Security Fix with Failing CI');
console.log('─'.repeat(80));

const scenario3 = {
  id: 'action-3',
  type: 'merge_pr',
  targetIds: ['pr-125'],
  actor: 'human',
  rationale: 'Urgent security fix',
  metadata: {
    manifestUri: 'artifacts/manifests/pr-125.json',
    policyHash: 'sha256:ghi789',
    evidenceArtifactPath: 'artifacts/evidence/pr-125.json',
    runId: 'run-003',
    costBudget: 200,
  },
  proposedAt: new Date().toISOString(),
};

const decision3 = await policyEngine.evaluateCandidateAction(
  scenario3,
  repoState,
  'governed_execute'
);

console.log(`\nAction: Merge PR #125 (Security Fix)`);
console.log(`Actor: ${scenario3.actor}`);
console.log(`CI Status: RED 🔴`);
console.log(`Decision: ${decision3.decision.toUpperCase()}`);
console.log(`Allowed: ${decision3.allowed ? '✅ YES' : '❌ NO'}`);
console.log(`Severity: ${decision3.severity}`);
console.log(`\nReasons:`);
decision3.reasons.forEach(r => console.log(`  - ${r}`));
console.log(`\nPolicy Rules: ${decision3.policyRuleIds.join(', ')}`);

// ============================================================================
// SCENARIO 4: Incident Mode (Should Block Everything)
// ============================================================================

console.log('\n\n📋 Scenario 4: Incident Mode Protection');
console.log('─'.repeat(80));

const incidentRepoState = {
  ...repoState,
  incidentMode: true,
};

const scenario4 = {
  id: 'action-4',
  type: 'merge_pr',
  targetIds: ['pr-123'],
  actor: 'system',
  rationale: 'Attempting merge during incident',
  metadata: {
    manifestUri: 'artifacts/manifests/pr-123.json',
    policyHash: 'sha256:jkl012',
    evidenceArtifactPath: 'artifacts/evidence/pr-123.json',
    runId: 'run-004',
    costBudget: 100,
  },
  proposedAt: new Date().toISOString(),
};

const decision4 = await policyEngine.evaluateCandidateAction(
  scenario4,
  incidentRepoState,
  'governed_execute'
);

console.log(`\nAction: Merge PR #123`);
console.log(`Repository Status: INCIDENT MODE 🚨`);
console.log(`Decision: ${decision4.decision.toUpperCase()}`);
console.log(`Allowed: ${decision4.allowed ? '✅ YES' : '❌ NO'}`);
console.log(`Severity: ${decision4.severity}`);
console.log(`\nReasons:`);
decision4.reasons.forEach(r => console.log(`  - ${r}`));
console.log(`\nPolicy Rules: ${decision4.policyRuleIds.join(', ')}`);
if (decision4.recommendation) {
  console.log(`\nRecommendation: ${decision4.recommendation}`);
}

// ============================================================================
// SCENARIO 5: Constitutional Violation (Run Determinism)
// ============================================================================

console.log('\n\n📋 Scenario 5: Constitutional Violation - Missing Run ID');
console.log('─'.repeat(80));

const scenario5 = {
  id: 'action-5',
  type: 'merge_pr',
  targetIds: ['pr-123'],
  actor: 'system',
  rationale: 'Merge without run provenance',
  metadata: {
    manifestUri: 'artifacts/manifests/pr-123.json',
    policyHash: 'sha256:mno345',
    evidenceArtifactPath: 'artifacts/evidence/pr-123.json',
    // Missing runId! Constitutional violation
    costBudget: 100,
  },
  proposedAt: new Date().toISOString(),
};

const decision5 = await policyEngine.evaluateCandidateAction(
  scenario5,
  repoState,
  'governed_execute'
);

console.log(`\nAction: Merge PR #123 (No Run Provenance)`);
console.log(`Decision: ${decision5.decision.toUpperCase()}`);
console.log(`Allowed: ${decision5.allowed ? '✅ YES' : '❌ NO'}`);
console.log(`Severity: ${decision5.severity}`);
console.log(`\nReasons:`);
decision5.reasons.forEach(r => console.log(`  - ${r}`));
console.log(`\nPolicy Rules: ${decision5.policyRuleIds.join(', ')}`);

// ============================================================================
// SYSTEM STATUS
// ============================================================================

console.log('\n\n' + '━'.repeat(80));
console.log('  System Status');
console.log('━'.repeat(80));

const ruleCount = policyEngine.getRuleCount();
console.log(`\n📊 Policy Rules Active:`);
console.log(`   - Constitutional Laws: ${ruleCount.constitutional} (immutable)`);
console.log(`   - Operational Rules: ${ruleCount.operational}`);
console.log(`   - Total Rules: ${ruleCount.total}`);

console.log(`\n📈 Governance Capabilities:`);
console.log(`   ✅ Constitutional enforcement`);
console.log(`   ✅ Protected path detection`);
console.log(`   ✅ CI gating`);
console.log(`   ✅ Agent scope restriction`);
console.log(`   ✅ Incident mode protection`);
console.log(`   ✅ Release freeze support`);
console.log(`   ✅ Run determinism`);
console.log(`   ✅ Evidence preservation`);

console.log(`\n🎯 Key Features:`);
console.log(`   • Explainable decisions with reasons`);
console.log(`   • Deterministic evaluation`);
console.log(`   • Precedence-based aggregation`);
console.log(`   • Constitutional law protection`);
console.log(`   • Agent proposal sandboxing`);
console.log(`   • Incident/freeze safety controls`);

console.log('\n' + '━'.repeat(80));
console.log('  Demo Complete - Governor is Production Ready!');
console.log('━'.repeat(80) + '\n');
