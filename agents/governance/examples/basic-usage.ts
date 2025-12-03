/**
 * Agent Governance Framework - Basic Usage Example
 *
 * This example demonstrates how to set up and use the governance
 * framework for AI agent fleets.
 */

import {
  createGovernanceFramework,
  AgentPolicyContext,
  PromptChain,
  createGovernanceMiddleware,
} from '@summit/agent-governance';

// ============================================================================
// 1. Create the Governance Framework
// ============================================================================

const governance = createGovernanceFramework({
  policy: {
    opaBaseUrl: process.env.OPA_URL || 'http://localhost:8181',
    cacheEnabled: true,
    cacheTtlMs: 60_000,
    failSafe: 'deny', // Deny by default when OPA is unavailable
    federalMode: true,
  },
  orchestrator: {
    maxConcurrentChains: 10,
    maxChainCostUsd: 100,
    enableHallucinationCheck: true,
    hallucinationThreshold: 0.7,
    enableProvenance: true,
    auditLevel: 'enhanced',
  },
  incidentResponse: {
    autoMitigate: true,
    escalationTimeoutMs: 300_000,
  },
  compliance: {
    enabled: true,
    validationLevel: 'full',
    auditFrequency: 'continuous',
  },
});

// ============================================================================
// 2. Evaluate Policy for Agent Actions
// ============================================================================

async function evaluateAgentAction() {
  const context: AgentPolicyContext = {
    agentId: 'analyst-agent-001',
    fleetId: 'analysis-fleet',
    sessionId: 'session-12345',
    trustLevel: 'elevated',
    classification: 'SECRET',
    capabilities: ['read', 'analyze', 'recommend'],
    requestedAction: 'analyze_intelligence',
    targetResource: 'entity:target-12345',
    userContext: {
      userId: 'analyst-001',
      roles: ['senior_analyst', 'entity_viewer'],
      clearance: 'TOP_SECRET',
      organization: 'intel-division',
    },
    environmentContext: {
      timestamp: Date.now(),
      airgapped: false,
      federalEnvironment: true,
      slsaLevel: 'SLSA_3',
    },
  };

  const decision = await governance.policyEngine.evaluateAction(context);

  console.log('Policy Decision:', {
    allowed: decision.allow,
    reason: decision.reason,
    auditLevel: decision.auditLevel,
    conditions: decision.conditions,
  });

  if (!decision.allow) {
    console.error('Action denied:', decision.reason);
    return null;
  }

  return decision;
}

// ============================================================================
// 3. Execute a Governed Prompt Chain
// ============================================================================

async function executeAnalysisChain() {
  // Define the chain
  const analysisChain: PromptChain = {
    id: 'intel-analysis-chain',
    name: 'Intelligence Analysis Chain',
    description: 'Multi-step analysis of intelligence data',
    steps: [
      {
        id: 'extract-entities',
        sequence: 1,
        llmProvider: 'anthropic-claude',
        prompt: {
          template: `Extract key entities from the following intelligence report:

{{report}}

Return a JSON array of entities with name, type, and confidence score.`,
          systemPrompt: 'You are an intelligence analyst assistant.',
          variables: ['report'],
          maxTokens: 2000,
          temperature: 0.3,
          classification: 'SECRET',
        },
        inputMappings: { report: 'inputReport' },
        outputMappings: { entities: 'extractedEntities' },
        validations: [
          {
            type: 'schema',
            config: { type: 'array' },
            action: 'reject',
          },
          {
            type: 'safety',
            config: { blockedPatterns: ['classified', 'top secret'] },
            action: 'flag',
          },
        ],
        timeout: 30000,
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 1000,
          backoffMultiplier: 2,
          retryableErrors: ['timeout', 'rate_limit'],
        },
      },
      {
        id: 'analyze-relationships',
        sequence: 2,
        llmProvider: 'anthropic-claude',
        prompt: {
          template: `Given these entities:

{{entities}}

Analyze potential relationships and connections. Return a JSON object with relationships.`,
          systemPrompt: 'You are an intelligence analyst assistant.',
          variables: ['entities'],
          maxTokens: 3000,
          temperature: 0.5,
          classification: 'SECRET',
        },
        inputMappings: { entities: 'extractedEntities' },
        outputMappings: { relationships: 'analyzedRelationships' },
        validations: [
          {
            type: 'hallucination',
            config: { threshold: 0.7 },
            action: 'flag',
          },
        ],
        timeout: 45000,
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 1000,
          backoffMultiplier: 2,
          retryableErrors: ['timeout'],
        },
      },
    ],
    governance: {
      requiredApprovals: [],
      maxCostPerExecution: 5,
      maxDurationMs: 120000,
      allowedClassifications: ['CONFIDENTIAL', 'SECRET'],
      auditLevel: 'enhanced',
      incidentEscalation: ['team-lead', 'security-officer'],
    },
    provenance: {
      createdBy: 'system',
      createdAt: new Date(),
      version: '1.0.0',
      slsaLevel: 'SLSA_3',
      attestations: [],
    },
    metadata: {
      department: 'intelligence',
      purpose: 'entity-analysis',
    },
  };

  // Execute the chain
  const result = await governance.orchestrator.executeChain({
    chain: analysisChain,
    inputs: {
      inputReport: 'Sample intelligence report text...',
    },
    context: {
      agentId: 'analyst-agent-001',
      fleetId: 'analysis-fleet',
      sessionId: 'session-12345',
      trustLevel: 'elevated',
      classification: 'SECRET',
      capabilities: ['read', 'analyze'],
      requestedAction: 'execute_chain',
      targetResource: 'chain:intel-analysis',
      userContext: {
        userId: 'analyst-001',
        roles: ['senior_analyst'],
        clearance: 'TOP_SECRET',
        organization: 'intel-division',
      },
      environmentContext: {
        timestamp: Date.now(),
        airgapped: false,
        federalEnvironment: true,
        slsaLevel: 'SLSA_3',
      },
    },
  });

  console.log('Chain Execution Result:', {
    success: result.success,
    stepsCompleted: result.metrics.stepsCompleted,
    totalCost: result.metrics.totalCost,
    latencyMs: result.metrics.totalLatencyMs,
  });

  return result;
}

// ============================================================================
// 4. Report and Handle Incidents
// ============================================================================

async function handleIncident() {
  // Report a new incident
  const incident = await governance.incidentManager.reportIncident({
    type: 'policy_violation',
    severity: 'high',
    title: 'Unauthorized classification access attempt',
    description:
      'Agent attempted to access TOP SECRET data with SECRET clearance',
    affectedAgents: ['analyst-agent-001'],
    affectedSessions: ['session-12345'],
    evidence: [
      {
        type: 'audit_record',
        source: 'policy-engine',
        data: {
          requestedClassification: 'TOP_SECRET',
          userClearance: 'SECRET',
          timestamp: new Date().toISOString(),
        },
      },
    ],
    reporter: 'governance-system',
    classification: 'SECRET',
  });

  console.log('Incident Created:', {
    id: incident.id,
    status: incident.status,
    escalationPath: incident.escalationPath,
  });

  // Later, resolve the incident
  const resolved = await governance.incidentManager.resolveIncident(
    incident.id,
    {
      resolver: 'security-officer',
      rootCause: 'Misconfigured agent trust level',
      lessonsLearned: [
        'Implement additional pre-flight clearance checks',
        'Add automated trust level verification',
      ],
    },
  );

  console.log('Incident Resolved:', {
    id: resolved?.id,
    status: resolved?.status,
    resolvedAt: resolved?.resolvedAt,
  });
}

// ============================================================================
// 5. Audit Hallucinations
// ============================================================================

async function auditLLMOutput() {
  const detection = await governance.hallucinationAuditor.audit({
    agentId: 'analyst-agent-001',
    sessionId: 'session-12345',
    input: 'What are the key findings from the 2023 intelligence report?',
    output:
      'According to the classified 2023 Smith et al. study published in the Journal of Intelligence...',
    sources: [], // No actual sources provided
  });

  if (detection) {
    console.log('Hallucination Detected:', {
      id: detection.id,
      type: detection.type,
      severity: detection.severity,
      confidence: detection.confidence,
      remediation: detection.remediation,
    });
  } else {
    console.log('No hallucination detected');
  }
}

// ============================================================================
// 6. Create Rollback Checkpoint
// ============================================================================

async function manageRollbacks() {
  // Create a checkpoint before risky operation
  const checkpoint = await governance.rollbackManager.createCheckpoint({
    scope: 'agent',
    agentId: 'analyst-agent-001',
    state: {
      config: {
        trustLevel: 'elevated',
        capabilities: ['read', 'analyze'],
        version: '2.1.0',
      },
      activeChains: [],
    },
    createdBy: 'system',
  });

  console.log('Checkpoint Created:', checkpoint.id);

  // If something goes wrong, initiate rollback
  const shouldRollback = false; // In real scenario, this would be based on error detection

  if (shouldRollback) {
    const rollback = await governance.rollbackManager.initiateRollback({
      trigger: 'safety_breach',
      scope: 'agent',
      agentId: 'analyst-agent-001',
      reason: 'Safety threshold exceeded',
      initiatedBy: 'system',
      checkpointId: checkpoint.id,
    });

    console.log('Rollback Initiated:', {
      id: rollback.id,
      status: rollback.status,
      steps: rollback.steps.length,
    });
  }
}

// ============================================================================
// 7. Track Provenance
// ============================================================================

async function trackProvenance() {
  // Create provenance for an LLM output
  const provenance = await governance.provenanceManager.createOutputProvenance({
    output: 'Analysis complete. Key findings: ...',
    promptHash: 'abc123def456',
    modelId: 'claude-3-opus',
    agentId: 'analyst-agent-001',
    sessionId: 'session-12345',
    temperature: 0.5,
    maxTokens: 2000,
  });

  console.log('Provenance Created:', {
    id: provenance.id,
    slsaLevel: provenance.slsaLevel,
    signed: !!provenance.cosignBundle,
  });

  // Verify provenance
  const verification = await governance.provenanceManager.verifyProvenance(
    provenance.id,
  );

  console.log('Provenance Verification:', {
    valid: verification.valid,
    slsaLevel: verification.slsaLevel,
    checks: verification.checks.map((c) => `${c.name}: ${c.passed}`),
  });
}

// ============================================================================
// 8. Validate Compliance
// ============================================================================

async function checkCompliance() {
  // Run full IC FY28 compliance validation
  const result = await governance.complianceValidator.validate();

  console.log('Compliance Validation:', {
    compliant: result.overallCompliant,
    controlsPassed: result.controls.filter((c) => c.status === 'compliant')
      .length,
    controlsTotal: result.controls.length,
    findings: result.findings.length,
  });

  // Get compliance score
  const score = governance.complianceValidator.getComplianceScore();

  console.log('Compliance Score:', {
    score: score.score,
    trend: score.trend,
    byCategory: score.byCategory,
  });
}

// ============================================================================
// 9. Get Dashboard Metrics
// ============================================================================

async function getDashboardMetrics() {
  const metrics = await governance.dashboard.getMetrics();

  console.log('Dashboard Metrics:', {
    policy: {
      total: metrics.policy.evaluationsTotal,
      allowed: metrics.policy.evaluationsAllowed,
      denied: metrics.policy.evaluationsDenied,
    },
    incidents: {
      active: metrics.incidents.activeIncidents,
      mttr: metrics.incidents.mttr,
    },
    hallucinations: {
      rate: metrics.hallucinations.detectionRate,
      total: metrics.hallucinations.totalDetections,
    },
    compliance: {
      score: metrics.compliance.overallScore,
      compliant: metrics.compliance.icfy28Compliant,
    },
  });

  // Get health status
  const health = await governance.dashboard.getHealthStatus();

  console.log('Health Status:', health);
}

// ============================================================================
// 10. Express Middleware Example
// ============================================================================

function setupExpressMiddleware() {
  // This would be used in an Express app
  const middleware = createGovernanceMiddleware(
    governance.policyEngine.evaluateAction.bind(governance.policyEngine),
  );

  // Use in Express:
  // app.use('/api/agents', middleware);

  console.log('Express middleware created');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('=== Agent Governance Framework Demo ===\n');

  try {
    console.log('1. Evaluating agent action policy...');
    await evaluateAgentAction();

    console.log('\n2. Managing rollback checkpoints...');
    await manageRollbacks();

    console.log('\n3. Tracking provenance...');
    await trackProvenance();

    console.log('\n4. Auditing LLM output for hallucinations...');
    await auditLLMOutput();

    console.log('\n5. Checking IC FY28 compliance...');
    await checkCompliance();

    console.log('\n6. Getting dashboard metrics...');
    await getDashboardMetrics();

    console.log('\n7. Setting up Express middleware...');
    setupExpressMiddleware();

    console.log('\n=== Demo Complete ===');
  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Run if executed directly
main().catch(console.error);
