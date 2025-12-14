export interface StepDefinition {
  id: string;
  name: string;
  type: string;
  dependencies?: string[];
  parameters?: Record<string, any>;
  timeout?: number;
  retryCount?: number;
}

export interface RunbookDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
  inputs: Record<string, string>; // name -> description
  outputs: Record<string, string>; // name -> description
  steps: StepDefinition[];
  failure_modes?: Record<string, string>;
  preconditions?: string[];
}

export interface RunbookContext {
  runId: string;
  runbookId: string;
  userId: string;
  tenantId: string;
  startTime: Date;
  inputs: Record<string, any>;
  outputs: Map<string, any>; // stepId -> output
  logs: any[];
}

export interface RunbookStep {
  execute(context: RunbookContext, parameters: Record<string, any>): Promise<any>;
}
