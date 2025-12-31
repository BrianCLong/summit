export enum DeprecationStage {
  Active = 'active',
  Announce = 'announce',
  Warn = 'warn',
  Restrict = 'restrict',
  Disable = 'disable',
  Remove = 'remove',
}

export interface DeprecationRecord {
  id: string; // unique identifier for the component (e.g., "api.v1.users.list")
  type: 'api' | 'agent' | 'policy' | 'schema' | 'workflow';
  stage: DeprecationStage;
  reason: string;
  replacement?: string;
  since: string; // ISO date
  deadline: string; // ISO date for next stage or removal
  owner: string;
  minVersion?: string;
}

export interface DeprecationConfig {
  records: DeprecationRecord[];
}
