import { AgentOrchestrator } from '../orchestrator/agent-orchestrator.js';
import { EventLogWriter } from '../logging/event-log.js';
import type { Agent, AgentTask } from '../types.js';

const demoAgent: Agent = {
  name: 'demo-agent',
  canHandle: () => true,
  async execute(task: AgentTask) {
    return {
      task_id: task.id,
      status: 'success',
      outputs: { echoed: task.inputs },
      attempt: 1,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
  },
};

const tasks: AgentTask[] = [
  {
    id: 'demo-1',
    priority: 10,
    created_at: new Date().toISOString(),
    type: 'demo',
    inputs: { message: 'summit orchestrator demo' },
  },
];

const run = async (): Promise<void> => {
  const orchestrator = new AgentOrchestrator([demoAgent], new EventLogWriter());
  const summary = await orchestrator.run(tasks);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

void run();
