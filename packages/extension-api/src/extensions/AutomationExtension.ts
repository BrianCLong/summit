import { ExtensionPoint } from "../ExtensionPoint.js";

export interface AutomationContext {
  triggerEvent: any;
  contextData?: Record<string, any>;
}

export interface AutomationResult {
  success: boolean;
  executedActions: string[];
  errors?: Record<string, string>;
}

/**
 * Automation Extension - Defines a pre-packaged automation flow.
 */
export interface AutomationExtension extends ExtensionPoint<AutomationContext, AutomationResult> {
  type: "automation";

  triggerId: string; // The Trigger Extension ID or type that starts this
  requiredScopes?: string[];

  /**
   * The logic definition could be a JSON structure describing the flow,
   * or a code reference if executed by the system.
   */
  getDefinition(): Record<string, any>;
}

export abstract class BaseAutomationExtension implements AutomationExtension {
  readonly type = "automation" as const;

  constructor(
    public readonly id: string,
    public readonly triggerId: string,
    public readonly requiredScopes: string[] = []
  ) {}

  abstract getDefinition(): Record<string, any>;

  /**
   * Executing an automation manually runs the logic.
   */
  abstract execute(context: AutomationContext): Promise<AutomationResult>;
}
