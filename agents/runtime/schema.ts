export interface RuntimeGoal {
  goalId: string;
  prompt: string;
  mode: 'tmux' | 'burst';
}

export interface Task {
  taskId: string;
  title: string;
  role: string;
  command: string[];
  priority: number;
  retries: number;
}

export interface TaskResult {
  taskId: string;
  ok: boolean;
  rc: number;
  stdout: string;
  stderr: string;
  startedAt: number;
  endedAt: number;
  workerId: string;
  attempt: number;
}
