export interface EpisodicMemory {
  run_id: string;
  tenant_id: string;
  step: number;
  event_json: any;
  ts: Date;
}

export interface WorkingMemory {
  run_id: string;
  tenant_id: string;
  summary: string;
  key_facts: any;
  ts: Date;
}

export interface ToolMemory {
  run_id: string;
  tenant_id: string;
  tool_id: string;
  usage_stats: any;
  last_result: any;
  ts: Date;
}
