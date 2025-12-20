
export interface Actor {
  id: string;
  username: string;
  platform: string;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  country?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  authorId: string;
  timestamp: Date;
  platform: string;
  location?: GeoLocation;
  metadata: Record<string, any>; // likes, shares, sentiment (0-1), etc.
}

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CampaignType {
  COORDINATED_INAUTHENTIC_BEHAVIOR = 'COORDINATED_INAUTHENTIC_BEHAVIOR',
  NARRATIVE_MANIPULATION = 'NARRATIVE_MANIPULATION',
  ASTROTURFING = 'ASTROTURFING',
  PSYOPS = 'PSYOPS',
  UNKNOWN = 'UNKNOWN',
}

export interface InfluenceCampaign {
  id: string;
  type: CampaignType;
  actors: string[]; // Actor IDs
  threatLevel: ThreatLevel;
  narrative: string;
  evidence: string[];
  detectedAt: Date;
  status: 'ACTIVE' | 'MITIGATED' | 'RESOLVED';
  confidenceScore: number;
}

export interface BehavioralFingerprint {
  postFrequency: number; // posts per hour
  burstiness: number; // variance of inter-arrival times
  contentRepetition: number; // 0-1 score
  sentimentVolatility: number; // 0-1 score
  accountAgeDays: number;
}

export interface AnomalyDetectionResult {
  isAnomalous: boolean;
  score: number;
  reason: string;
}

export interface NarrativeCluster {
  id: string;
  keywords: string[];
  exemplarPosts: string[];
  sentiment: number;
  volume: number;
  velocity: number; // posts per minute
}
