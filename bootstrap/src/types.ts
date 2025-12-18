export interface AgentConfig {
  path: string;
  enabled: boolean;
}

export interface RuntimeConfig {
  enable_observability: boolean;
  enable_event_triggers: boolean;
  logs_dir: string;
  state_dir: string;
}

export interface SummitConfig {
  version: number | string;
  agents: Record<string, AgentConfig>;
  flows: string[];
  governance: Record<string, string>;
  analytics: Record<string, string>;
  runtime: RuntimeConfig;
}

export interface EventTrigger {
  agent: string;
  flow: string;
}

export interface EventDefinition {
  cron?: string;
  triggers: EventTrigger[];
}

export interface EventsConfig {
  events: Record<string, EventDefinition>;
}
