
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

export interface NarrativeUptakeMetric {
  narrativeId: string;
  exposureCount: number;
  engagementRate: number;
  shareRate: number;
  sentimentAverage: number;
}

export interface AudienceSegment {
  id: string;
  label: string;
  identityCluster: string;
  mediaDiet: string[];
  priorBeliefs: string[];
  cognitiveVulnerabilities: string[];
  resilienceSignals: string[];
  trustedMessengers: string[];
  size: number;
  narrativeUptake: NarrativeUptakeMetric[];
}

export interface AudienceTrustEdge {
  sourceSegmentId: string;
  targetSegmentId: string;
  trustScore: number;
  evidenceActorIds: string[];
}

export interface AudienceSegmentGraph {
  segments: AudienceSegment[];
  trustEdges: AudienceTrustEdge[];
}

export interface NarrativeTechnique {
  id: string;
  name: string;
  cognitiveBiases: string[];
  emotionalTriggers: string[];
  channelPreferences: string[];
  potency: number;
}

export interface ProtectiveNarrative {
  id: string;
  themes: string[];
  messengerIds: string[];
  targetTechniqueIds: string[];
}

export interface MessengerProfile {
  id: string;
  name: string;
  credibilityScore: number;
  themes: string[];
}

export interface SegmentRiskProfile {
  segmentId: string;
  techniqueId: string;
  vulnerabilityScore: number;
  resilienceScore: number;
  recommendedProtectiveNarratives: string[];
  recommendedMessengers: string[];
}
