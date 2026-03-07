import { ExtensionPoint } from "../ExtensionPoint.js";

export interface TriggerConfig {
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

export interface TriggerResult {
  subscriptionId: string;
  status: "active" | "inactive";
}

/**
 * Trigger Extension - Defines a source of events that can trigger workflows or automations.
 */
export interface TriggerExtension extends ExtensionPoint<TriggerConfig, TriggerResult> {
  type: "trigger";

  triggerType: string;
  eventSchema: Record<string, any>;
  requiredScopes?: string[];

  register(config: TriggerConfig, callback: (payload: any) => Promise<void>): Promise<string>;
  unregister(subscriptionId: string): Promise<void>;
}

export abstract class BaseTriggerExtension implements TriggerExtension {
  readonly type = "trigger" as const;

  constructor(
    public readonly id: string,
    public readonly triggerType: string,
    public readonly eventSchema: Record<string, any>,
    public readonly requiredScopes: string[] = []
  ) {}

  abstract register(
    config: TriggerConfig,
    callback: (payload: any) => Promise<void>
  ): Promise<string>;
  abstract unregister(subscriptionId: string): Promise<void>;

  abstract execute(input: TriggerConfig): Promise<TriggerResult>;
}
