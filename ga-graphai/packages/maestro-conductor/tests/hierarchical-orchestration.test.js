"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const hierarchical_orchestration_1 = require("../src/hierarchical-orchestration");
(0, vitest_1.describe)('HierarchicalOrchestrationLoop', () => {
    (0, vitest_1.it)('builds the Summit/Maestro stage stack with feedback graph edges', () => {
        const loop = new hierarchical_orchestration_1.HierarchicalOrchestrationLoop();
        const plan = loop.createPlan('Integrate autonomous architecture in Summit + Maestro', 'wf-1');
        (0, vitest_1.expect)(plan.stages.map((stage) => stage.id)).toEqual([
            'plan',
            'architecture',
            'implement',
            'execute',
            'verify',
            'critic',
        ]);
        (0, vitest_1.expect)(loop.toGraphEdges()).toContainEqual({
            from: 'critic',
            to: 'implement',
            condition: 'critic.changes_requested',
        });
    });
    (0, vitest_1.it)('requires stage artifacts before advancing', () => {
        const loop = new hierarchical_orchestration_1.HierarchicalOrchestrationLoop();
        const plan = loop.createPlan('Artifact-gated execution', 'wf-2');
        (0, vitest_1.expect)(loop.canAdvance(plan, 'plan')).toBe(false);
        loop.recordArtifact(plan, 'PRD.md', 'artifacts/prd.md');
        loop.recordArtifact(plan, 'task-spec.json', 'artifacts/task-spec.json');
        (0, vitest_1.expect)(loop.canAdvance(plan, 'plan')).toBe(true);
        loop.advance(plan, 'plan');
        const planningState = plan.state.find((entry) => entry.stageId === 'plan');
        const architectureState = plan.state.find((entry) => entry.stageId === 'architecture');
        (0, vitest_1.expect)(planningState?.status).toBe('completed');
        (0, vitest_1.expect)(architectureState?.status).toBe('in_progress');
    });
    (0, vitest_1.it)('throws when artifacts are missing for the requested stage', () => {
        const loop = new hierarchical_orchestration_1.HierarchicalOrchestrationLoop();
        const plan = loop.createPlan('Block incomplete transitions', 'wf-3');
        (0, vitest_1.expect)(() => loop.advance(plan, 'plan')).toThrow('stage plan is missing required artifacts');
    });
});
