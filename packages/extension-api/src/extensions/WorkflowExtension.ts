import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Workflow action extension point
 */
export interface WorkflowExtension extends ExtensionPoint<WorkflowInput, WorkflowResult> {
  type: 'workflow';
  actionName: string;
  description: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

export interface WorkflowInput {
  action: string;
  parameters: Record<string, any>;
  context: {
    userId: string;
    workflowId: string;
    executionId: string;
  };
}

export interface WorkflowResult {
  success: boolean;
  output?: any;
  error?: string;
  nextActions?: string[];
}

export abstract class BaseWorkflowExtension implements WorkflowExtension {
  readonly type = 'workflow' as const;

  constructor(
    public readonly id: string,
    public readonly actionName: string,
    public readonly description: string,
    public readonly inputSchema: Record<string, any>,
    public readonly outputSchema: Record<string, any>
  ) {}

  abstract execute(input: WorkflowInput): Promise<WorkflowResult>;
}
