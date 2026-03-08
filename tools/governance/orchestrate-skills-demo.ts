import { evaluateIntensityDecision } from '../../summit/agents/orchestrator/agent-orchestrator.ts';

const events: unknown[] = [];

const result = evaluateIntensityDecision(
  {
    env: 'dev',
    agent_role: 'builder',
    run_id: 'demo-run',
    task_id: 'demo-task',
    agent_name: 'codex',
    skill: 'docs.update',
    allowed_repo_paths: ['docs/'],
  },
  Number(process.env.AGENT_INTENSITY ?? '1'),
  {
    name: 'docs.update',
    risk: 'low',
    scopes: ['repo.write'],
    repo_paths: ['docs/'],
  },
  {
    emit: (event) => events.push(event),
  },
);

console.log(JSON.stringify({ result, events }, null, 2));
