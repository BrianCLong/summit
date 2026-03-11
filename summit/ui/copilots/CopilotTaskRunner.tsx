export interface CopilotTask {
  id: string;
  label: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  output?: string;
}

interface CopilotTaskRunnerProps {
  tasks: CopilotTask[];
}

export function CopilotTaskRunner({ tasks }: CopilotTaskRunnerProps) {
  const runningTasks = tasks.filter((task) => task.status === 'running').length;

  return (
    <section aria-label="copilot-task-runner">
      <h3>Task Runner</h3>
      <p>Running tasks: {runningTasks}</p>
    </section>
  );
}
