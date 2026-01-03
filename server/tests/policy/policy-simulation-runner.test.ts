/// <reference types="node" />
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import { PolicySimulationRunner } from '../../src/policy/simulation/runner.js';

const baselinePath = path.join(process.cwd(), 'server/src/policy/fixtures/tenant-baseline.json');

describe('PolicySimulationRunner', () => {
  it('detects regressions introduced by proposals', async () => {
    const proposalPath = path.join(process.cwd(), 'server/tests/policy/proposal-fixture.json');
    await fs.writeFile(
      proposalPath,
      JSON.stringify(
        {
          id: 'proposal-cross-tenant',
          patches: [
            {
              op: 'set',
              path: '/baseProfile/crossTenant',
              value: { mode: 'allowlist', allow: ['tenant-999'], requireAgreements: false },
            },
            {
              op: 'append',
              path: '/baseProfile/rules',
              value: [
                {
                  id: 'allow-cross-tenant-beta',
                  description: 'Allow cross-tenant read to tenant-999',
                  effect: 'allow',
                  priority: 5,
                  conditions: {
                    actions: ['read'],
                    resourceTenants: ['tenant-999'],
                    subjectTenants: ['tenant-alpha'],
                  },
                },
              ],
            },
            {
              op: 'set',
              path: '/baseProfile/rules/1/effect',
              value: 'allow',
            },
          ],
        },
        null,
        2,
      ),
      'utf-8',
    );

    const runner = new PolicySimulationRunner({ baselineBundlePath: baselinePath, proposalPath });
    const report = await runner.run();
    const proposedSecurity = report.simulationRuns.find(
      (run) => run.suite === 'security_evals' && run.mode === 'proposed',
    );

    expect(proposedSecurity?.deltas.scenarios.length).toBeGreaterThan(0);
    expect(report.recommendation.decision).toBe('reject');
    await fs.rm(proposalPath);
  });

  it('produces deterministic output for unchanged policy', async () => {
    const runner = new PolicySimulationRunner({ baselineBundlePath: baselinePath });
    const first = await runner.run();
    const second = await runner.run();

    expect(first.recommendation.decision).toBe('approve');
    expect(second.recommendation.decision).toBe('approve');
    expect(first.simulationRuns.map((run) => run.summary.scenarioPassRate)).toEqual(
      second.simulationRuns.map((run) => run.summary.scenarioPassRate),
    );
  });
});
