/**
 * Tradecraft Event Canonical Format (TECF)
 * Minimal v0 schema for enterprise espionage campaign simulation and detection.
 */

export enum TECFActorType {
  HUMAN = 'HUMAN',
  SERVICE_ACCOUNT = 'SERVICE_ACCOUNT',
  BOT = 'BOT',
  UNKNOWN = 'UNKNOWN'
}

export enum TECFAssetType {
  FILE = 'FILE',
  DATABASE = 'DATABASE',
  ENDPOINT = 'ENDPOINT',
  COMMUNICATION_CHANNEL = 'COMMUNICATION_CHANNEL',
  CREDENTIAL = 'CREDENTIAL'
}

export enum TECFIntentHypothesis {
  RECON = 'RECON',
  LATERAL_MOVEMENT = 'LATERAL_MOVEMENT',
  STAGING = 'STAGING',
  EXFIL = 'EXFIL',
  BENIGN = 'BENIGN'
}

export interface TECFEvent {
  tenant_id: string;
  event_id: string;
  event_time: string; // ISO8601

  actor: {
    type: TECFActorType;
    id: string;
  };

  asset: {
    type: TECFAssetType;
    id: string;
  };

  channel: string; // e.g., 'm365', 'slack', 'okta'
  action: string;  // e.g., 'download', 'login', 'share'

  intent_hypothesis?: {
    type: TECFIntentHypothesis;
    note: string;
  };

  confidence: number; // 0-1

  raw_ref: {
    source_system: string;
    external_id: string;
  };

  provenance: {
    connector_id: string;
    run_id: string;
  };
}
