import { ExtensionPoint } from "../ExtensionPoint.js";

export interface ActionInput {
  actionId: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Action Extension - Defines an executable action that can be performed by the system.
 */
export interface ActionExtension extends ExtensionPoint<ActionInput, ActionResult> {
  type: "action";

  /**
   * Unique identifier for the action definition
   */
  actionId: string;

  /**
   * JSON Schema for the input parameters
   */
  inputSchema: Record<string, any>;

  /**
   * JSON Schema for the output result
   */
  outputSchema?: Record<string, any>;

  /**
   * Required permissions/scopes to execute this action
   */
  requiredScopes?: string[];
}

export abstract class BaseActionExtension implements ActionExtension {
  readonly type = "action" as const;

  constructor(
    public readonly id: string,
    public readonly actionId: string,
    public readonly inputSchema: Record<string, any>,
    public readonly outputSchema: Record<string, any> = {},
    public readonly requiredScopes: string[] = []
  ) {}

  abstract execute(input: ActionInput): Promise<ActionResult>;
}
