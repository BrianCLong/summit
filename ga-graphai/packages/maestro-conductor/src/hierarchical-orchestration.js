"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchicalOrchestrationLoop = void 0;
const DEFAULT_STAGES = [
    {
        id: 'plan',
        title: 'Goal decomposition',
        owner: 'planner',
        requiredArtifacts: ['PRD.md', 'task-spec.json'],
        feedbackSignals: ['scope.validated'],
        maxRetries: 1,
    },
    {
        id: 'architecture',
        title: 'System design and boundaries',
        owner: 'architect',
        requiredArtifacts: ['architecture.md', 'risk-register.md'],
        feedbackSignals: ['architecture.approved'],
        maxRetries: 1,
    },
    {
        id: 'implement',
        title: 'Code implementation',
        owner: 'engineer',
        requiredArtifacts: ['patch.diff', 'tests.plan.md'],
        feedbackSignals: ['code.compiles'],
        maxRetries: 2,
    },
    {
        id: 'execute',
        title: 'Environment execution and telemetry capture',
        owner: 'executor',
        requiredArtifacts: ['execution.log', 'metrics.json'],
        feedbackSignals: ['tests.run'],
        maxRetries: 2,
    },
    {
        id: 'verify',
        title: 'QA and policy gate verification',
        owner: 'qa',
        requiredArtifacts: ['test-report.xml', 'policy-evidence.json'],
        feedbackSignals: ['gates.green'],
        maxRetries: 2,
    },
    {
        id: 'critic',
        title: 'Critic review and release recommendation',
        owner: 'critic',
        requiredArtifacts: ['release-note.md', 'rollback-plan.md'],
        feedbackSignals: ['critic.approved'],
        maxRetries: 1,
    },
];
class HierarchicalOrchestrationLoop {
    stages;
    constructor(stages = DEFAULT_STAGES) {
        this.stages = stages;
    }
    createPlan(objective, workflowId = `wf-${Date.now()}`) {
        return {
            workflowId,
            objective,
            stages: [...this.stages],
            state: this.stages.map((stage) => ({
                stageId: stage.id,
                status: 'pending',
                retryCount: 0,
            })),
            artifactLedger: {},
        };
    }
    toGraphEdges() {
        return [
            { from: 'plan', to: 'architecture', condition: 'scope.validated' },
            { from: 'architecture', to: 'implement', condition: 'architecture.approved' },
            { from: 'implement', to: 'execute', condition: 'code.compiles' },
            { from: 'execute', to: 'verify', condition: 'tests.run' },
            { from: 'verify', to: 'critic', condition: 'gates.green' },
            { from: 'critic', to: 'implement', condition: 'critic.changes_requested' },
            { from: 'critic', to: 'plan', condition: 'objective.reframed' },
        ];
    }
    recordArtifact(plan, artifactName, artifactRef) {
        plan.artifactLedger[artifactName] = artifactRef;
    }
    canAdvance(plan, stageId) {
        const stage = plan.stages.find((candidate) => candidate.id === stageId);
        if (!stage) {
            return false;
        }
        return stage.requiredArtifacts.every((artifact) => Boolean(plan.artifactLedger[artifact]));
    }
    advance(plan, stageId) {
        const state = plan.state.find((entry) => entry.stageId === stageId);
        if (!state) {
            throw new Error(`unknown stage ${stageId}`);
        }
        if (!this.canAdvance(plan, stageId)) {
            throw new Error(`stage ${stageId} is missing required artifacts`);
        }
        state.status = 'completed';
        const nextPending = plan.state.find((entry) => entry.status === 'pending');
        if (nextPending) {
            nextPending.status = 'in_progress';
        }
    }
}
exports.HierarchicalOrchestrationLoop = HierarchicalOrchestrationLoop;
