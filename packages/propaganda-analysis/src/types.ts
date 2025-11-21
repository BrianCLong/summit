/**
 * Propaganda Analysis Types
 * Types for terrorist propaganda and messaging analysis
 */

export interface PropagandaContent {
  id: string;
  type: ContentType;
  creator?: string;
  organization?: string;
  created: Date;
  discovered: Date;
  title?: string;
  language: string;
  themes: string[];
  narrative: NarrativeAnalysis;
  distribution: Distribution;
  impact: ImpactMetrics;
  removed: boolean;
}

export enum ContentType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  ARTICLE = 'ARTICLE',
  MAGAZINE = 'MAGAZINE',
  POSTER = 'POSTER',
  SOCIAL_MEDIA_POST = 'SOCIAL_MEDIA_POST',
  NASHEED = 'NASHEED',
  SERMON = 'SERMON',
  STATEMENT = 'STATEMENT',
  MANIFESTO = 'MANIFESTO'
}

export interface NarrativeAnalysis {
  primaryMessage: string;
  themes: Theme[];
  targets: string[];
  emotionalAppeal: EmotionalAppeal[];
  frames: string[];
  grievances: string[];
  callToAction?: string;
}

export interface Theme {
  type: ThemeType;
  description: string;
  prominence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export enum ThemeType {
  MARTYRDOM = 'MARTYRDOM',
  VICTIMIZATION = 'VICTIMIZATION',
  CONSPIRACY = 'CONSPIRACY',
  RELIGIOUS_DUTY = 'RELIGIOUS_DUTY',
  REVENGE = 'REVENGE',
  HEROISM = 'HEROISM',
  UTOPIA = 'UTOPIA',
  APOCALYPSE = 'APOCALYPSE',
  ENEMY_DEHUMANIZATION = 'ENEMY_DEHUMANIZATION',
  IN_GROUP_SOLIDARITY = 'IN_GROUP_SOLIDARITY'
}

export interface EmotionalAppeal {
  type: 'ANGER' | 'FEAR' | 'PRIDE' | 'GUILT' | 'HOPE' | 'SOLIDARITY';
  intensity: number;
  target: string;
}

export interface Distribution {
  platforms: DistributionPlatform[];
  networks: DistributionNetwork[];
  reach: number;
  engagement: EngagementMetrics;
  viralityScore: number;
}

export interface DistributionPlatform {
  platform: string;
  postId?: string;
  posted: Date;
  removed?: Date;
  views?: number;
  shares?: number;
  active: boolean;
}

export interface DistributionNetwork {
  id: string;
  type: 'SOCIAL_MEDIA' | 'MESSAGING_APP' | 'FORUM' | 'FILE_SHARING' | 'DEDICATED_SITE';
  nodes: NetworkNode[];
  reach: number;
}

export interface NetworkNode {
  id: string;
  type: 'ACCOUNT' | 'GROUP' | 'CHANNEL' | 'WEBSITE';
  platform: string;
  followers?: number;
  active: boolean;
}

export interface EngagementMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  downloads?: number;
  reactions: Record<string, number>;
}

export interface ImpactMetrics {
  reach: number;
  influence: number;
  recruitment?: number;
  radicalization?: number;
  attacks?: AttackInspiration[];
}

export interface AttackInspiration {
  attackId: string;
  contentId: string;
  confirmed: boolean;
  description: string;
}

export interface MediaProduction {
  id: string;
  organization: string;
  outlet: string;
  productions: PropagandaContent[];
  quality: ProductionQuality;
  frequency: number; // per month
  languages: string[];
  active: boolean;
}

export enum ProductionQuality {
  PROFESSIONAL = 'PROFESSIONAL',
  SEMI_PROFESSIONAL = 'SEMI_PROFESSIONAL',
  AMATEUR = 'AMATEUR'
}

export interface MediaSpokesperson {
  id: string;
  name?: string;
  aliases: string[];
  organization: string;
  role: string;
  statements: Statement[];
  credibility: number;
  active: boolean;
}

export interface Statement {
  id: string;
  date: Date;
  type: string;
  content: string;
  medium: string;
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  verified: boolean;
}

export interface NarrativeEvolution {
  organization: string;
  timeline: NarrativeChange[];
  currentNarrative: NarrativeAnalysis;
  trajectory: 'ESCALATING' | 'MODERATING' | 'STABLE';
}

export interface NarrativeChange {
  date: Date;
  type: string;
  description: string;
  catalysts: string[];
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecruitmentMessaging {
  contentId: string;
  targetAudience: TargetAudience;
  tactics: RecruitmentTactic[];
  effectiveness: number;
  conversions?: number;
}

export interface TargetAudience {
  demographics: Demographics;
  psychographics: Psychographics;
  vulnerabilities: string[];
}

export interface Demographics {
  ageRange?: [number, number];
  gender?: string;
  locations: string[];
  languages: string[];
}

export interface Psychographics {
  interests: string[];
  grievances: string[];
  values: string[];
  beliefs: string[];
}

export interface RecruitmentTactic {
  type: string;
  description: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CounterNarrative {
  id: string;
  targetContent: string;
  message: string;
  creators: string[];
  distribution: Distribution;
  effectiveness: number;
  created: Date;
}

export interface LanguageAnalysis {
  contentId: string;
  language: string;
  dialect?: string;
  translator?: string;
  quality: 'NATIVE' | 'FLUENT' | 'COMPETENT' | 'POOR';
  regionalMarkers: string[];
  targetRegions: string[];
}

export interface AudienceAnalysis {
  contentId: string;
  demographics: Demographics;
  engagement: EngagementMetrics;
  sentiment: SentimentAnalysis;
  receptivity: number;
}

export interface SentimentAnalysis {
  positive: number;
  negative: number;
  neutral: number;
  dominant: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface PropagandaCampaign {
  id: string;
  organization: string;
  name?: string;
  startDate: Date;
  endDate?: Date;
  content: string[];
  objectives: string[];
  targetAudiences: TargetAudience[];
  effectiveness: number;
  active: boolean;
}

export interface AnalysisQuery {
  organizations?: string[];
  contentTypes?: ContentType[];
  themes?: ThemeType[];
  languages?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  minReach?: number;
}

export interface AnalysisResult {
  content: PropagandaContent[];
  totalCount: number;
  campaigns: PropagandaCampaign[];
  narratives: NarrativeEvolution[];
  trends: PropagandaTrend[];
  counterNarrativeOpportunities: CounterNarrativeOpportunity[];
}

export interface PropagandaTrend {
  type: string;
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  magnitude: number;
  period: string;
  description: string;
}

export interface CounterNarrativeOpportunity {
  contentId: string;
  vulnerability: string;
  suggestedApproach: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetAudience: TargetAudience;
}
