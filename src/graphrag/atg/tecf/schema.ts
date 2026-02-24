export enum TECFActorType { HUMAN = 'HUMAN', SERVICE_ACCOUNT = 'SERVICE_ACCOUNT', BOT = 'BOT', UNKNOWN = 'UNKNOWN' }
export enum TECFAssetType { FILE = 'FILE', DATABASE = 'DATABASE', ENDPOINT = 'ENDPOINT', COMMUNICATION_CHANNEL = 'COMMUNICATION_CHANNEL', CREDENTIAL = 'CREDENTIAL' }
export enum TECFIntentHypothesis { RECON = 'RECON', LATERAL_MOVEMENT = 'LATERAL_MOVEMENT', STAGING = 'STAGING', EXFIL = 'EXFIL', BENIGN = 'BENIGN' }
export interface TECFEvent {
  tenant_id: string; event_id: string; event_time: string;
  actor: { type: TECFActorType; id: string };
  asset: { type: TECFAssetType; id: string };
  channel: string; action: string;
  intent_hypothesis?: { type: TECFIntentHypothesis; note: string };
  confidence: number;
  raw_ref: { source_system: string; external_id: string };
  provenance: { connector_id: string; run_id: string };
}
