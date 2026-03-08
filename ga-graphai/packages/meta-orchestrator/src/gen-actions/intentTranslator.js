"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerativeActionTranslator = void 0;
function makeAuditId(serviceId, intentType) {
    return `${serviceId}:${intentType}:${Date.now()}`;
}
class GenerativeActionTranslator {
    knowledgeGraph;
    policyEvaluator;
    auditSink;
    approvalQueue;
    defaultRollbackWindowMinutes;
    constructor(options) {
        this.knowledgeGraph = options.knowledgeGraph;
        this.policyEvaluator = options.policyEvaluator;
        this.auditSink = options.auditSink;
        this.approvalQueue = options.approvalQueue;
        this.defaultRollbackWindowMinutes = options.defaultRollbackWindowMinutes ?? 30;
    }
    translate(intent) {
        const context = this.knowledgeGraph.queryService(intent.targetServiceId);
        if (!context) {
            throw new Error(`unknown service ${intent.targetServiceId}`);
        }
        let environmentId = intent.environmentId ?? context.environments?.[0]?.id;
        if (!environmentId) {
            throw new Error(`intent ${intent.type} missing environment for ${intent.targetServiceId}`);
        }
        const pipelineStage = context.pipelines
            ?.flatMap((pipeline) => pipeline.stages)
            .find((stage) => stage.environmentId === environmentId);
        const policyRequest = {
            action: this.resolvePolicyAction(intent),
            resource: `service:${intent.targetServiceId}`,
            context: intent.requestedBy,
        };
        const policyEvaluation = this.policyEvaluator(policyRequest);
        if (!policyEvaluation.allowed) {
            throw new Error(`policy denied action ${policyRequest.action}: ${policyEvaluation.reasons.join(', ')}`);
        }
        const riskProfile = context.risk;
        const requiresApproval = this.requiresApproval(intent, riskProfile, context);
        const auditRef = makeAuditId(intent.targetServiceId, intent.type);
        const guardrail = {
            policyEvaluation,
            requiresApproval,
            approvalReason: requiresApproval
                ? 'Risk score or policy risk exceeded threshold; human approval required.'
                : undefined,
        };
        const steps = this.buildSteps({ ...intent, environmentId }, pipelineStage?.id);
        const plan = {
            intent: { ...intent, environmentId },
            steps,
            guardrail,
            risk: riskProfile,
            auditRef,
        };
        if (this.approvalQueue && guardrail.requiresApproval) {
            this.approvalQueue.enqueue(plan);
        }
        void this.auditSink?.record({
            id: auditRef,
            timestamp: new Date().toISOString(),
            category: 'plan',
            summary: `Generated action plan for ${intent.type} ${intent.targetServiceId}`,
            data: plan,
        });
        return plan;
    }
    resolvePolicyAction(intent) {
        switch (intent.type) {
            case 'deploy':
                return 'orchestration.deploy';
            case 'scale':
                return 'orchestration.scale';
            case 'rollback':
                return 'orchestration.rollback';
            default:
                return 'orchestration.unknown';
        }
    }
    requiresApproval(intent, risk, context) {
        const riskScore = risk?.score ?? 0;
        const tolerance = intent.riskTolerance ?? 'medium';
        const hasHighRiskPolicy = context.policies?.some((policy) => policy.tags?.includes('high-risk')) ?? false;
        const openCriticalIncident = context.incidents?.some((incident) => incident.status === 'open' && incident.severity === 'critical');
        const toleranceThreshold = tolerance === 'high' ? 0.75 : tolerance === 'medium' ? 0.5 : 0.3;
        if (hasHighRiskPolicy || openCriticalIncident) {
            return true;
        }
        if (riskScore >= toleranceThreshold) {
            return true;
        }
        if (intent.type === 'rollback' && context.incidents?.length) {
            return false;
        }
        return false;
    }
    buildSteps(intent, stageId) {
        const baseGuardrails = [`rollback-window=${this.defaultRollbackWindowMinutes}m`];
        const target = intent.environmentId ?? 'unknown';
        if (intent.type === 'deploy') {
            return [
                {
                    id: 'validate-plan',
                    description: `Validate deployment plan for ${intent.targetServiceId} in ${target}`,
                    command: `orchestrator validate --service ${intent.targetServiceId} --env ${target}`,
                    rollbackCommand: `orchestrator rollback-plan --service ${intent.targetServiceId} --env ${target}`,
                    guardrails: [...baseGuardrails, 'policy=pass'],
                },
                {
                    id: 'execute-stage',
                    description: stageId
                        ? `Execute stage ${stageId} via meta orchestrator`
                        : `Execute deployment for ${intent.targetServiceId}`,
                    command: stageId
                        ? `orchestrator run-stage --stage ${stageId}`
                        : `orchestrator deploy --service ${intent.targetServiceId} --env ${target}`,
                    rollbackCommand: `orchestrator rollback --service ${intent.targetServiceId} --env ${target}`,
                    guardrails: [...baseGuardrails, 'self-heal=monitor'],
                    metadata: intent.metadata,
                },
            ];
        }
        if (intent.type === 'scale') {
            const desired = intent.desiredCapacity ?? 1;
            return [
                {
                    id: 'plan-scale',
                    description: `Plan scaling ${intent.targetServiceId} to ${desired} units in ${target}`,
                    command: `orchestrator scale-plan --service ${intent.targetServiceId} --env ${target} --capacity ${desired}`,
                    rollbackCommand: `orchestrator scale-plan --service ${intent.targetServiceId} --env ${target} --capacity revert`,
                    guardrails: [...baseGuardrails, 'capacity-check', 'cost-guard-integration'],
                },
                {
                    id: 'apply-scale',
                    description: `Apply scaling action`,
                    command: `orchestrator scale-apply --service ${intent.targetServiceId} --env ${target}`,
                    rollbackCommand: `orchestrator scale-apply --service ${intent.targetServiceId} --env ${target} --rollback`,
                    guardrails: [...baseGuardrails, 'observe-15m'],
                    metadata: { desiredCapacity: desired },
                },
            ];
        }
        return [
            {
                id: 'execute-rollback',
                description: `Rollback ${intent.targetServiceId} in ${target}`,
                command: `orchestrator rollback --service ${intent.targetServiceId} --env ${target}`,
                rollbackCommand: 'noop',
                guardrails: [...baseGuardrails, 'post-incident-review'],
            },
        ];
    }
}
exports.GenerativeActionTranslator = GenerativeActionTranslator;
