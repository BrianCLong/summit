/**
 * Agent Fleet Governance Framework
 *
 * Misuse-aware orchestration for Summit AI agent fleets with:
 * - OPA policy engine for fine-grained access control
 * - Multi-LLM prompt chaining with governance
 * - Incident response and automated mitigation
 * - Hallucination detection and audit
 * - Auto-rollback mechanisms
 * - SLSA/cosign provenance for AI artifacts
 * - IC FY28 compliance validation
 *
 * @module @summit/agent-governance
 */

// Types
export * from './types';

// Policy Engine
export { AgentPolicyEngine, agentPolicyEngine } from './policy-engine/AgentPolicyEngine';
export type { PolicyEngineConfig } from './policy-engine/AgentPolicyEngine';

// Orchestration
export {
  PromptChainOrchestrator,
  type OrchestratorConfig,
  type ChainExecutionRequest,
  type ChainExecutionResult,
  type StepExecutionResult,
  type LLMProviderAdapter,
  type LLMExecutionOptions,
  type LLMExecutionResult,
} from './orchestration/PromptChainOrchestrator';

// Incident Response
export {
  IncidentResponseManager,
  incidentResponseManager,
  type IncidentResponseConfig,
  type NotificationChannel,
  type MitigationPolicy,
  type MitigationAction,
} from './incident-response/IncidentResponseManager';

// Hallucination Audit
export {
  HallucinationAuditor,
  hallucinationAuditor,
  type DetectionMethod,
  type DetectionContext,
  type DetectionResult,
} from './hallucination-audit/HallucinationAuditor';

// Rollback
export {
  RollbackManager,
  rollbackManager,
} from './rollback/RollbackManager';

// Provenance
export {
  AIProvenanceManager,
  aiProvenanceManager,
  type ProvenanceConfig,
} from './provenance/AIProvenanceManager';

// Compliance
export { ICFY28ComplianceValidator } from './compliance/ICFY28ComplianceValidator';

// Dashboard
export {
  GovernanceDashboardService,
  type DashboardAPIResponse,
  type DashboardChartData,
  type DashboardTimeSeriesData,
} from './dashboard/GovernanceDashboardService';

// ============================================================================
// Factory Function
// ============================================================================

import { AgentPolicyEngine } from './policy-engine/AgentPolicyEngine';
import { PromptChainOrchestrator } from './orchestration/PromptChainOrchestrator';
import { IncidentResponseManager } from './incident-response/IncidentResponseManager';
import { HallucinationAuditor } from './hallucination-audit/HallucinationAuditor';
import { RollbackManager } from './rollback/RollbackManager';
import { AIProvenanceManager } from './provenance/AIProvenanceManager';
import { ICFY28ComplianceValidator } from './compliance/ICFY28ComplianceValidator';
import { GovernanceDashboardService } from './dashboard/GovernanceDashboardService';

export interface GovernanceFrameworkConfig {
  policy?: Partial<import('./policy-engine/AgentPolicyEngine').PolicyEngineConfig>;
  orchestrator?: Partial<import('./orchestration/PromptChainOrchestrator').OrchestratorConfig>;
  incidentResponse?: Partial<import('./incident-response/IncidentResponseManager').IncidentResponseConfig>;
  provenance?: Partial<import('./provenance/AIProvenanceManager').ProvenanceConfig>;
  compliance?: Partial<import('./types').ICFY28ComplianceConfig>;
}

export interface GovernanceFramework {
  policyEngine: AgentPolicyEngine;
  orchestrator: PromptChainOrchestrator;
  incidentManager: IncidentResponseManager;
  hallucinationAuditor: HallucinationAuditor;
  rollbackManager: RollbackManager;
  provenanceManager: AIProvenanceManager;
  complianceValidator: ICFY28ComplianceValidator;
  dashboard: GovernanceDashboardService;
}

/**
 * Create a fully configured governance framework
 */
export function createGovernanceFramework(
  config: GovernanceFrameworkConfig = {},
): GovernanceFramework {
  // Create core components
  const policyEngine = new AgentPolicyEngine(config.policy);
  const orchestrator = new PromptChainOrchestrator(policyEngine, config.orchestrator);
  const incidentManager = new IncidentResponseManager(config.incidentResponse);
  const hallucinationAuditor = new HallucinationAuditor();
  const rollbackManager = new RollbackManager();
  const provenanceManager = new AIProvenanceManager(config.provenance);

  // Create compliance validator with dependencies
  const complianceValidator = new ICFY28ComplianceValidator(config.compliance || {}, {
    policyEngine,
    provenanceManager,
    hallucinationAuditor,
    incidentManager,
  });

  // Create dashboard with all dependencies
  const dashboard = new GovernanceDashboardService({
    policyEngine,
    orchestrator,
    incidentManager,
    hallucinationAuditor,
    rollbackManager,
    complianceValidator,
  });

  // Wire up cross-component event handling
  policyEngine.onEvent((event) => {
    if (event.type === 'policy_violation') {
      incidentManager.processEvent(event);
    }
  });

  hallucinationAuditor.onEvent((event) => {
    if (event.type === 'hallucination_detected') {
      incidentManager.processEvent(event);
    }
  });

  incidentManager.onEvent(async (event) => {
    if (event.type === 'incident_detected') {
      const details = event.details as { severity?: string };
      if (details?.severity === 'critical') {
        // Trigger rollback check
        await rollbackManager.checkTrigger('safety_breach', {
          agentId: event.agentId,
          fleetId: event.fleetId,
        });
      }
    }
  });

  return {
    policyEngine,
    orchestrator,
    incidentManager,
    hallucinationAuditor,
    rollbackManager,
    provenanceManager,
    complianceValidator,
    dashboard,
  };
}
