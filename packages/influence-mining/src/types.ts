export type RelationshipType = 'mention' | 'reply' | 'share' | string;

export interface Entity {
  id: string;
  type: string;
  label?: string;
  attributes?: Record<string, unknown>;
}

export interface Relationship {
  from: string;
  to: string;
  type: RelationshipType;
  weight: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  types: RelationshipType[];
}

export interface Graph {
  nodes: Entity[];
  edges: GraphEdge[];
  adjacency: Record<string, Record<string, number>>;
}

export interface BotCluster {
  label: string;
  members: string[];
  activityScore: number;
  evidence: RelationshipType[];
}

export interface Cluster {
  nodes: string[];
  amplificationScore: number;
}

export interface Pattern {
  description: string;
  participants: string[];
  support: number;
}

export interface InfluenceNetwork {
  graph: Graph;
  entities: Entity[];
  relationships: Relationship[];
}

export interface EnrichedNetwork extends InfluenceNetwork {
  motifs: {
    botNetworks: BotCluster[];
    amplifierClusters: Cluster[];
    coordinatedBehaviors: Pattern[];
  };
}

export interface NodeRanking {
  entity: Entity;
  score: number;
  inboundWeight: number;
  outboundWeight: number;
}

export interface RankedNetwork extends InfluenceNetwork {
  rankings: NodeRanking[];
}

export interface SocialPost {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  inReplyTo?: string | null;
  sharedFrom?: string | null;
  mentions?: string[];
}

export interface TextDocument {
  id: string;
  text: string;
  primaryActor: string;
}

export type SourceData =
  | { kind: 'social'; posts: SocialPost[] }
  | { kind: 'text'; documents: TextDocument[] };

export interface IngestResult {
  posts: SocialPost[];
  documents: TextDocument[];
  entities: Entity[];
}
