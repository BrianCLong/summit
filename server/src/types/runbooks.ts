export interface RunbookBinding {
  ruleId?: string;
  incidentTag?: string;
  playbookId: string;
  autoRun: boolean;
}

export interface RunbookExecution {
  id: string;
  playbookId: string;
  incidentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
}
