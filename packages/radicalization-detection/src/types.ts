/**
 * Radicalization Detection Types
 * Types for monitoring radicalization pathways and extremist content
 */

export interface RadicalizationProfile {
  id: string;
  individualId: string;
  status: RadicalizationStatus;
  stage: RadicalizationStage;
  pathway: RadicalizationPathway;
  indicators: RadicalizationIndicator[];
  timeline: RadicalizationTimeline;
  influences: Influence[];
  interventions: Intervention[];
  riskScore: number;
  lastAssessed: Date;
}

export enum RadicalizationStatus {
  MONITORING = 'MONITORING',
  AT_RISK = 'AT_RISK',
  RADICALIZED = 'RADICALIZED',
  MOBILIZED = 'MOBILIZED',
  DERADICALIZED = 'DERADICALIZED'
}

export enum RadicalizationStage {
  PRE_RADICALIZATION = 'PRE_RADICALIZATION',
  IDENTIFICATION = 'IDENTIFICATION',
  INDOCTRINATION = 'INDOCTRINATION',
  ACTION = 'ACTION'
}

export interface RadicalizationPathway {
  primary: PathwayType;
  secondary?: PathwayType[];
  description: string;
  duration?: number; // days
}

export enum PathwayType {
  ONLINE = 'ONLINE',
  PEER_NETWORK = 'PEER_NETWORK',
  FAMILY = 'FAMILY',
  RELIGIOUS_INSTITUTION = 'RELIGIOUS_INSTITUTION',
  PRISON = 'PRISON',
  CONFLICT_ZONE = 'CONFLICT_ZONE',
  IDEOLOGICAL_MENTOR = 'IDEOLOGICAL_MENTOR',
  GRIEVANCE_BASED = 'GRIEVANCE_BASED'
}

export interface RadicalizationIndicator {
  id: string;
  type: IndicatorType;
  description: string;
  detected: Date;
  confidence: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
}

export enum IndicatorType {
  CONTENT_CONSUMPTION = 'CONTENT_CONSUMPTION',
  IDEOLOGICAL_SHIFT = 'IDEOLOGICAL_SHIFT',
  BEHAVIORAL_CHANGE = 'BEHAVIORAL_CHANGE',
  SOCIAL_ISOLATION = 'SOCIAL_ISOLATION',
  EXTREMIST_ASSOCIATION = 'EXTREMIST_ASSOCIATION',
  VIOLENT_RHETORIC = 'VIOLENT_RHETORIC',
  MARTYRDOM_GLORIFICATION = 'MARTYRDOM_GLORIFICATION',
  CONSPIRACY_THEORIES = 'CONSPIRACY_THEORIES',
  US_VS_THEM = 'US_VS_THEM',
  DEHUMANIZATION = 'DEHUMANIZATION'
}

export interface RadicalizationTimeline {
  profileCreated: Date;
  firstIndicator?: Date;
  stageProgression: StageChange[];
  criticalEvents: TimelineEvent[];
}

export interface StageChange {
  from: RadicalizationStage;
  to: RadicalizationStage;
  date: Date;
  catalysts: string[];
}

export interface TimelineEvent {
  date: Date;
  type: string;
  description: string;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Influence {
  id: string;
  type: InfluenceType;
  source: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  startDate: Date;
  endDate?: Date;
}

export enum InfluenceType {
  IDEOLOGICAL_MENTOR = 'IDEOLOGICAL_MENTOR',
  PEER_GROUP = 'PEER_GROUP',
  ONLINE_COMMUNITY = 'ONLINE_COMMUNITY',
  FAMILY_MEMBER = 'FAMILY_MEMBER',
  RELIGIOUS_AUTHORITY = 'RELIGIOUS_AUTHORITY',
  EXTREMIST_CONTENT = 'EXTREMIST_CONTENT',
  TRAUMATIC_EVENT = 'TRAUMATIC_EVENT',
  DISCRIMINATION = 'DISCRIMINATION'
}

export interface Intervention {
  id: string;
  type: InterventionType;
  date: Date;
  provider: string;
  description: string;
  effectiveness?: 'SUCCESSFUL' | 'PARTIAL' | 'UNSUCCESSFUL' | 'ONGOING';
  followUp?: Date;
}

export enum InterventionType {
  COUNSELING = 'COUNSELING',
  FAMILY_ENGAGEMENT = 'FAMILY_ENGAGEMENT',
  COMMUNITY_PROGRAM = 'COMMUNITY_PROGRAM',
  EDUCATION = 'EDUCATION',
  MENTORSHIP = 'MENTORSHIP',
  VOCATIONAL_TRAINING = 'VOCATIONAL_TRAINING',
  COUNTER_NARRATIVE = 'COUNTER_NARRATIVE',
  LAW_ENFORCEMENT = 'LAW_ENFORCEMENT'
}

export interface OnlineRadicalization {
  individualId: string;
  platforms: PlatformActivity[];
  contentExposure: ContentExposure[];
  echoChambers: EchoChamber[];
  recruiters: OnlineRecruiter[];
  progression: OnlineProgression[];
}

export interface PlatformActivity {
  platform: string;
  accountId?: string;
  joinDate?: Date;
  activityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  contentTypes: string[];
  interactions: number;
  lastActive?: Date;
}

export interface ContentExposure {
  id: string;
  type: ContentType;
  platform: string;
  contentId?: string;
  viewed: Date;
  engagement?: EngagementLevel;
  extremismLevel: 'EXTREME' | 'MODERATE' | 'GATEWAY';
}

export enum ContentType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  FORUM_POST = 'FORUM_POST',
  SOCIAL_MEDIA_POST = 'SOCIAL_MEDIA_POST',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  LIVESTREAM = 'LIVESTREAM'
}

export enum EngagementLevel {
  VIEW = 'VIEW',
  LIKE = 'LIKE',
  SHARE = 'SHARE',
  COMMENT = 'COMMENT',
  CREATE = 'CREATE'
}

export interface EchoChamber {
  id: string;
  platform: string;
  name?: string;
  memberCount?: number;
  ideology: string;
  extremismLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  activities: string[];
}

export interface OnlineRecruiter {
  id: string;
  accountId: string;
  platform: string;
  tactics: RecruitmentTactic[];
  targets: string[];
  success: number;
  active: boolean;
}

export interface RecruitmentTactic {
  type: string;
  description: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface OnlineProgression {
  date: Date;
  stage: string;
  evidence: string[];
  platforms: string[];
}

export interface ExtremistContent {
  id: string;
  type: ContentType;
  platform: string;
  creator?: string;
  created: Date;
  title?: string;
  description?: string;
  language: string;
  ideology: string;
  extremismLevel: 'EXTREME' | 'MODERATE' | 'GATEWAY';
  views?: number;
  shares?: number;
  removed: boolean;
  propagationNetwork: PropagationNode[];
}

export interface PropagationNode {
  platform: string;
  postId?: string;
  shared: Date;
  reach?: number;
  engagement?: number;
}

export interface GatewayContent {
  id: string;
  contentId: string;
  type: ContentType;
  platform: string;
  pathwayTo: string[];
  conversionRate?: number;
  identifiedDate: Date;
}

export interface SocialNetworkInfluence {
  individualId: string;
  network: NetworkMember[];
  extremistConnections: Connection[];
  isolationScore: number;
  peerPressure: PeerPressureIndicator[];
}

export interface NetworkMember {
  memberId: string;
  relationship: string;
  influence: 'HIGH' | 'MEDIUM' | 'LOW';
  radicalized: boolean;
}

export interface Connection {
  targetId: string;
  type: 'FAMILY' | 'FRIEND' | 'ASSOCIATE' | 'MENTOR' | 'ONLINE';
  strength: number;
  since: Date;
}

export interface PeerPressureIndicator {
  source: string;
  type: string;
  description: string;
  date: Date;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface IdeologicalEvolution {
  individualId: string;
  baseline: IdeologicalPosition;
  current: IdeologicalPosition;
  changes: IdeologicalChange[];
  trajectory: 'RADICALIZING' | 'STABLE' | 'MODERATING';
}

export interface IdeologicalPosition {
  date: Date;
  beliefs: Belief[];
  rhetoric: RhetoricAnalysis;
  targets: string[];
}

export interface Belief {
  category: string;
  description: string;
  intensity: number;
  violent: boolean;
}

export interface RhetoricAnalysis {
  violenceLevel: number;
  dehumanization: number;
  conspiracyTheories: string[];
  grievances: string[];
}

export interface IdeologicalChange {
  date: Date;
  type: string;
  description: string;
  direction: 'MORE_EXTREME' | 'LESS_EXTREME';
  catalysts: string[];
}

export interface DetectionQuery {
  status?: RadicalizationStatus[];
  stages?: RadicalizationStage[];
  pathways?: PathwayType[];
  minRiskScore?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DetectionResult {
  profiles: RadicalizationProfile[];
  totalCount: number;
  highRisk: RadicalizationProfile[];
  trends: RadicalizationTrend[];
}

export interface RadicalizationTrend {
  type: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  magnitude: number;
  period: string;
  description: string;
}
