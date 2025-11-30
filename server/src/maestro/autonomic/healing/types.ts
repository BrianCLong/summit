
export interface TriggerCondition {
  signalType: string;
  operator: 'GT' | 'LT' | 'EQ';
  value: number;
  duration?: number; // Sustain for X ms
}

export interface PlaybookAction {
  type: 'RETRY' | 'REROUTE' | 'DOWNGRADE' | 'QUARANTINE' | 'ALERT' | 'SHED_LOAD';
  params: Record<string, any>;
}

export interface SelfHealingPlaybook {
  id: string;
  name: string;
  scope: 'TASK' | 'CI' | 'INFRA';
  triggers: TriggerCondition[];
  actions: PlaybookAction[];
  rollbackActions?: PlaybookAction[];
  cooldownMs: number;
}
