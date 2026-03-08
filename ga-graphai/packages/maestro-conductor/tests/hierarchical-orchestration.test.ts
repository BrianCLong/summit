import { describe, expect, it } from 'vitest';
import { HierarchicalOrchestrationLoop } from '../src/hierarchical-orchestration';

describe('HierarchicalOrchestrationLoop', () => {
  it('builds the Summit/Maestro stage stack with feedback graph edges', () => {
    const loop = new HierarchicalOrchestrationLoop();
    const plan = loop.createPlan('Integrate autonomous architecture in Summit + Maestro', 'wf-1');

    expect(plan.stages.map((stage) => stage.id)).toEqual([
      'plan',
      'architecture',
      'implement',
      'execute',
      'verify',
      'critic',
    ]);
    expect(loop.toGraphEdges()).toContainEqual({
      from: 'critic',
      to: 'implement',
      condition: 'critic.changes_requested',
    });
  });

  it('requires stage artifacts before advancing', () => {
    const loop = new HierarchicalOrchestrationLoop();
    const plan = loop.createPlan('Artifact-gated execution', 'wf-2');

    expect(loop.canAdvance(plan, 'plan')).toBe(false);

    loop.recordArtifact(plan, 'PRD.md', 'artifacts/prd.md');
    loop.recordArtifact(plan, 'task-spec.json', 'artifacts/task-spec.json');

    expect(loop.canAdvance(plan, 'plan')).toBe(true);
    loop.advance(plan, 'plan');

    const planningState = plan.state.find((entry) => entry.stageId === 'plan');
    const architectureState = plan.state.find(
      (entry) => entry.stageId === 'architecture',
    );

    expect(planningState?.status).toBe('completed');
    expect(architectureState?.status).toBe('in_progress');
  });

  it('throws when artifacts are missing for the requested stage', () => {
    const loop = new HierarchicalOrchestrationLoop();
    const plan = loop.createPlan('Block incomplete transitions', 'wf-3');

    expect(() => loop.advance(plan, 'plan')).toThrow(
      'stage plan is missing required artifacts',
    );
  });
});
