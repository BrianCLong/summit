export interface FoundryRunOptions {
  prompt: string;
  minIterations?: number;
  maxIterations: number;
  completionPromise: string;
  cwd?: string;
  agent?: string;
  model?: string;
}

export interface RunState {
  iteration: number;
  lastGitSha?: string;
  completed: boolean;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  logs: string[];
}
