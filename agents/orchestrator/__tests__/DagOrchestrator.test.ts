import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DagCycleError } from '../src/dag/graph.js';
import { formatOrchestratorEvidenceId, isOrchestratorEvidenceId } from '../src/dag/evidence_id.js';
import { DagPolicyError, OrchestratorEngine } from '../src/dag/engine.js';
import { EdgePolicyGate } from '../src/dag/policy_gate.js';
import { DagWorkflow } from '../src/dag/schema.js';

const baseWorkflow: DagWorkflow = {
  id: 'workflow-2-agent',
  nodes: [
    { id: 'researcher-node', agent: 'researcher' },
    { id: 'critic-node', agent: 'critic' },
  ],
  edges: [
    {
      id: 'handoff-1',
      from: 'researcher-node',
      to: 'critic-node',
      tool: 'handoff.notes',
    },
  ],
};

const executors = {
  researcher: () => 'research-findings-v1',
  critic: ({ upstream }: { upstream: ReadonlyArray<{ from: string; output: string }> }) =>
    `critique:${upstream.map((item) => `${item.from}:${item.output}`).join('|')}`,
};

describe('DAG orchestrator MWS', () => {
  it('rejects cyclic execution graphs', async () => {
    const cyclic: DagWorkflow = {
      id: 'cyclic-workflow',
      nodes: [
        { id: 'a', agent: 'researcher' },
        { id: 'b', agent: 'critic' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    };

    const engine = new OrchestratorEngine({ enabled: true, writeArtifacts: false });

    await expect(engine.execute(cyclic, executors)).rejects.toThrow(DagCycleError);
  });

  it('blocks unauthorized cross-agent tool calls', async () => {
    const engine = new OrchestratorEngine({
      enabled: true,
      writeArtifacts: false,
      policyGate: new EdgePolicyGate({
        crossAgentToolAllowList: {
          researcher: {
            critic: ['different.tool'],
          },
        },
      }),
    });

    await expect(engine.execute(baseWorkflow, executors)).rejects.toThrow(DagPolicyError);
  });

  it('produces deterministic report artifacts across replays', async () => {
    const run1Dir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-run1-'));
    const run2Dir = await fs.mkdtemp(path.join(os.tmpdir(), 'orchestrator-run2-'));

    const policyGate = new EdgePolicyGate({
      crossAgentToolAllowList: {
        researcher: {
          critic: ['handoff.notes'],
        },
      },
    });

    const engineA = new OrchestratorEngine({
      enabled: true,
      evidenceSequence: 7,
      outputDir: run1Dir,
      policyGate,
    });
    const engineB = new OrchestratorEngine({
      enabled: true,
      evidenceSequence: 7,
      outputDir: run2Dir,
      policyGate,
    });

    const resultA = await engineA.execute(baseWorkflow, executors);
    const resultB = await engineB.execute(baseWorkflow, executors);

    expect(resultA.reportHash).toBe(resultB.reportHash);
    expect(resultA.artifacts.report).toEqual(resultB.artifacts.report);

    const reportA = await fs.readFile(path.join(run1Dir, 'report.json'), 'utf8');
    const reportB = await fs.readFile(path.join(run2Dir, 'report.json'), 'utf8');
    expect(reportA).toBe(reportB);

    const metricsA = await fs.readFile(path.join(run1Dir, 'metrics.json'), 'utf8');
    const metricsB = await fs.readFile(path.join(run2Dir, 'metrics.json'), 'utf8');
    expect(metricsA).toBe(metricsB);

    expect(JSON.stringify(resultA.artifacts.stamp)).not.toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it('uses SUMMIT-ORCH-XXXX evidence ids', async () => {
    const formatted = formatOrchestratorEvidenceId(42);
    expect(formatted).toBe('SUMMIT-ORCH-0042');
    expect(isOrchestratorEvidenceId(formatted)).toBe(true);

    const engine = new OrchestratorEngine({
      enabled: true,
      evidenceSequence: 42,
      writeArtifacts: false,
      policyGate: new EdgePolicyGate({
        crossAgentToolAllowList: {
          researcher: {
            critic: ['handoff.notes'],
          },
        },
      }),
    });

    const result = await engine.execute(baseWorkflow, executors);
    expect(result.evidenceId).toBe('SUMMIT-ORCH-0042');
    expect(isOrchestratorEvidenceId(result.artifacts.report.evidence_id)).toBe(true);
  });
});
