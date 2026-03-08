import test from 'node:test';
import assert from 'node:assert/strict';

import {
  enforceIntensity,
  parseIntensity,
} from '../../summit/agents/governance/intensity';
import { evaluateIntensityDecision } from '../../summit/agents/orchestrator/agent-orchestrator';

const invocation = {
  env: 'dev' as const,
  agent_role: 'builder',
};

test('intensity==0 blocks repo.write, net, fs', () => {
  assert.equal(
    enforceIntensity(invocation, 0, {
      name: 'dangerous.skill',
      risk: 'low',
      scopes: ['repo.write'],
    }).allow,
    false,
  );

  assert.equal(
    enforceIntensity(invocation, 0, {
      name: 'dangerous.skill',
      risk: 'low',
      scopes: ['net'],
    }).allow,
    false,
  );

  assert.equal(
    enforceIntensity(invocation, 0, {
      name: 'dangerous.skill',
      risk: 'low',
      scopes: ['fs'],
    }).allow,
    false,
  );
});

test('intensity==1 blocks medium/high risk writes even if policy would allow', () => {
  const decision = enforceIntensity(
    {
      ...invocation,
      allowed_repo_paths: ['docs/'],
    },
    1,
    {
      name: 'release.approve',
      risk: 'high',
      scopes: ['repo.write'],
      repo_paths: ['docs/'],
    },
  );

  assert.equal(decision.allow, false);
  assert.match(decision.reason, /medium\/high risk/);
});

test('intensity events are emitted deterministically', () => {
  const eventsA: unknown[] = [];
  const eventsB: unknown[] = [];

  const request = {
    env: 'prod' as const,
    agent_role: 'builder',
    run_id: 'run-7',
    task_id: 'task-9',
    agent_name: 'codex',
    skill: 'docs.update',
  };

  const skillSpec = {
    name: 'docs.update',
    risk: 'low' as const,
    scopes: ['repo.write'],
    repo_paths: ['docs/'],
  };

  evaluateIntensityDecision(request, 0, skillSpec, {
    emit: (event) => eventsA.push(event),
  });
  evaluateIntensityDecision(request, 0, skillSpec, {
    emit: (event) => eventsB.push(event),
  });

  assert.deepEqual(eventsA, eventsB);
  assert.equal((eventsA[0] as { type: string }).type, 'INTENSITY_EVALUATED');
  assert.equal((eventsA[1] as { type: string }).type, 'INTENSITY_DENIED');
});

test('parseIntensity defaults by env and accepts explicit values', () => {
  assert.equal(parseIntensity('prod', undefined), 0);
  assert.equal(parseIntensity('dev', undefined), 1);
  assert.equal(parseIntensity('test', undefined), 1);
  assert.equal(parseIntensity('dev', '2'), 2);
});
