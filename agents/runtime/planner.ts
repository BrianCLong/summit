import { createHash } from 'crypto';
import { RuntimeGoal, Task } from './schema.js';

export function stableId(text: string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 12);
}

export async function buildDeterministicPlan(goal: RuntimeGoal): Promise<Task[]> {
  const norm = goal.prompt.trim().toLowerCase().replace(/\s+/g, ' ');
  const base = stableId(norm);

  const prompts = [
    `Summarize the goal: ${goal.prompt}`,
    `List implementation steps for: ${goal.prompt}`,
    `List risks and test cases for: ${goal.prompt}`,
    `Write acceptance criteria for: ${goal.prompt}`,
  ];

  const roles = ["summarizer", "implementer", "tester", "evaluator"];
  const tasks: Task[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const taskId = `${base}-t${i + 1}`;
    // We use a safe echo instead of python execution for prototype and avoid shell interpolation
    // or exec with unescaped strings. Here we simulate the agent command cleanly.
    const cmd = [
      'node',
      '-e',
      `setTimeout(() => { console.log('RESULT::' + process.argv[1]) }, 400)`,
      prompt
    ];

    tasks.push({
      taskId,
      title: `task-${i + 1}`,
      role: roles[i],
      command: cmd,
      priority: 10 - (i + 1),
      retries: 0,
    });
  }

  // Deterministic sort: highest priority first, then by task ID
  return tasks.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.taskId.localeCompare(b.taskId);
  });
}
