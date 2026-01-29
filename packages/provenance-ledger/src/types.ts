export interface SourceObject {
  source_id: string;
  origin: 'PAI' | 'CAI' | 'OSINT';
  access_path: string;
  acquired_at: string;
  license?: string;
  hash: string;
  content_type: string;
}

export interface LineageEvent {
  event_id: string;
  ts: string;
  actor: string;
  action: string;
  inputs: string[];
  outputs: string[];
  tool?: string;
  model?: string;
}

export interface TransformRecord {
  transform_id: string;
  input_hash: string;
  output_hash: string;
  method: string;
}

export interface ModelUsageRecord {
  model_id: string;
  prompt_hash: string;
  completion_hash: string;
  usage_metadata?: Record<string, any>;
}
