"use strict";
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
 * @module @intelgraph/agent-governance
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceDashboardService = exports.ICFY28ComplianceValidator = exports.aiProvenanceManager = exports.AIProvenanceManager = exports.rollbackManager = exports.RollbackManager = exports.hallucinationAuditor = exports.HallucinationAuditor = exports.incidentResponseManager = exports.IncidentResponseManager = exports.PromptChainOrchestrator = exports.agentPolicyEngine = exports.AgentPolicyEngine = void 0;
exports.createGovernanceFramework = createGovernanceFramework;
// Types
__exportStar(require("./types"), exports);
// Policy Engine
var AgentPolicyEngine_1 = require("./policy-engine/AgentPolicyEngine");
Object.defineProperty(exports, "AgentPolicyEngine", { enumerable: true, get: function () { return AgentPolicyEngine_1.AgentPolicyEngine; } });
Object.defineProperty(exports, "agentPolicyEngine", { enumerable: true, get: function () { return AgentPolicyEngine_1.agentPolicyEngine; } });
// Orchestration
var PromptChainOrchestrator_1 = require("./orchestration/PromptChainOrchestrator");
Object.defineProperty(exports, "PromptChainOrchestrator", { enumerable: true, get: function () { return PromptChainOrchestrator_1.PromptChainOrchestrator; } });
// Incident Response
var IncidentResponseManager_1 = require("./incident-response/IncidentResponseManager");
Object.defineProperty(exports, "IncidentResponseManager", { enumerable: true, get: function () { return IncidentResponseManager_1.IncidentResponseManager; } });
Object.defineProperty(exports, "incidentResponseManager", { enumerable: true, get: function () { return IncidentResponseManager_1.incidentResponseManager; } });
// Hallucination Audit
var HallucinationAuditor_1 = require("./hallucination-audit/HallucinationAuditor");
Object.defineProperty(exports, "HallucinationAuditor", { enumerable: true, get: function () { return HallucinationAuditor_1.HallucinationAuditor; } });
Object.defineProperty(exports, "hallucinationAuditor", { enumerable: true, get: function () { return HallucinationAuditor_1.hallucinationAuditor; } });
// Rollback
var RollbackManager_1 = require("./rollback/RollbackManager");
Object.defineProperty(exports, "RollbackManager", { enumerable: true, get: function () { return RollbackManager_1.RollbackManager; } });
Object.defineProperty(exports, "rollbackManager", { enumerable: true, get: function () { return RollbackManager_1.rollbackManager; } });
// Provenance
var AIProvenanceManager_1 = require("./provenance/AIProvenanceManager");
Object.defineProperty(exports, "AIProvenanceManager", { enumerable: true, get: function () { return AIProvenanceManager_1.AIProvenanceManager; } });
Object.defineProperty(exports, "aiProvenanceManager", { enumerable: true, get: function () { return AIProvenanceManager_1.aiProvenanceManager; } });
// Compliance
var ICFY28ComplianceValidator_1 = require("./compliance/ICFY28ComplianceValidator");
Object.defineProperty(exports, "ICFY28ComplianceValidator", { enumerable: true, get: function () { return ICFY28ComplianceValidator_1.ICFY28ComplianceValidator; } });
// Dashboard
var GovernanceDashboardService_1 = require("./dashboard/GovernanceDashboardService");
Object.defineProperty(exports, "GovernanceDashboardService", { enumerable: true, get: function () { return GovernanceDashboardService_1.GovernanceDashboardService; } });
// ============================================================================
// Factory Function
// ============================================================================
const AgentPolicyEngine_2 = require("./policy-engine/AgentPolicyEngine");
const PromptChainOrchestrator_2 = require("./orchestration/PromptChainOrchestrator");
const IncidentResponseManager_2 = require("./incident-response/IncidentResponseManager");
const HallucinationAuditor_2 = require("./hallucination-audit/HallucinationAuditor");
const RollbackManager_2 = require("./rollback/RollbackManager");
const AIProvenanceManager_2 = require("./provenance/AIProvenanceManager");
const ICFY28ComplianceValidator_2 = require("./compliance/ICFY28ComplianceValidator");
const GovernanceDashboardService_2 = require("./dashboard/GovernanceDashboardService");
/**
 * Create a fully configured governance framework
 */
function createGovernanceFramework(config = {}) {
    // Create core components
    const policyEngine = new AgentPolicyEngine_2.AgentPolicyEngine(config.policy);
    const orchestrator = new PromptChainOrchestrator_2.PromptChainOrchestrator(policyEngine, config.orchestrator);
    const incidentManager = new IncidentResponseManager_2.IncidentResponseManager(config.incidentResponse);
    const hallucinationAuditor = new HallucinationAuditor_2.HallucinationAuditor();
    const rollbackManager = new RollbackManager_2.RollbackManager();
    const provenanceManager = new AIProvenanceManager_2.AIProvenanceManager(config.provenance);
    // Create compliance validator with dependencies
    const complianceValidator = new ICFY28ComplianceValidator_2.ICFY28ComplianceValidator(config.compliance || {}, {
        policyEngine,
        provenanceManager,
        hallucinationAuditor,
        incidentManager,
    });
    // Create dashboard with all dependencies
    const dashboard = new GovernanceDashboardService_2.GovernanceDashboardService({
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
            const details = event.details;
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
