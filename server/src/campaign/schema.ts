export type ActorType = 'state' | 'affiliate' | 'cutout' | 'platform' | 'individual';
export type AssetType = 'domain' | 'channel' | 'account' | 'botnet';
export type NarrativeType = 'claim' | 'meme' | 'target' | 'narrative';
export type EvidenceType = 'url' | 'screenshot' | 'hash' | 'media' | 'report';
export type ActionType = 'seed' | 'amplify' | 'debunk' | 'migrate' | 'monitor';

export interface Actor {
  id: string;
  name: string;
  type: ActorType;
  metadata?: Record<string, unknown>;
}

export interface Asset {
  id: string;
  type: AssetType;
  url?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
}

export interface NarrativeObject {
  id: string;
  type: NarrativeType;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceObject {
  id: string;
  type: EvidenceType;
  fingerprint?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface Action {
  id: string;
  type: ActionType;
  sourceId: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  actors: Actor[];
  assets: Asset[];
  narratives: NarrativeObject[];
  evidence: EvidenceObject[];
  actions: Action[];
  metadata?: Record<string, unknown>;
}
