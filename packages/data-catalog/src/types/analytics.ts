/**
 * Catalog Analytics Types
 * Types for tracking usage, metrics, and analytics
 */

/**
 * Usage Event
 */
export interface UsageEvent {
  id: string;
  eventType: UsageEventType;
  assetId: string;
  userId: string;
  sessionId: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Usage Event Types
 */
export enum UsageEventType {
  VIEW = 'VIEW',
  SEARCH = 'SEARCH',
  DOWNLOAD = 'DOWNLOAD',
  EDIT = 'EDIT',
  COMMENT = 'COMMENT',
  SHARE = 'SHARE',
  BOOKMARK = 'BOOKMARK',
  RATE = 'RATE',
  CERTIFY = 'CERTIFY',
}

/**
 * Asset Usage Metrics
 */
export interface AssetUsageMetrics {
  assetId: string;
  viewCount: number;
  uniqueViewers: number;
  downloadCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;
  averageRating: number;
  ratingCount: number;
  lastAccessed: Date;
  trendingScore: number;
}

/**
 * Search Analytics
 */
export interface SearchAnalytics {
  query: string;
  searchCount: number;
  clickThroughRate: number;
  averagePosition: number;
  zeroResultsCount: number;
  topResults: SearchResult[];
  refinements: string[];
}

/**
 * Search Result
 */
export interface SearchResult {
  assetId: string;
  assetName: string;
  clickCount: number;
  averagePosition: number;
}

/**
 * User Engagement Metrics
 */
export interface UserEngagementMetrics {
  userId: string;
  sessionCount: number;
  totalTimeSpent: number;
  assetsViewed: number;
  searchesPerformed: number;
  commentsPosted: number;
  documentsCreated: number;
  lastActive: Date;
  engagementScore: number;
}

/**
 * Coverage Metrics
 */
export interface CoverageMetrics {
  totalAssets: number;
  documentedAssets: number;
  certifiedAssets: number;
  assetsWithOwners: number;
  assetsWithTags: number;
  assetsWithLineage: number;
  coveragePercentage: number;
  qualityScore: number;
}

/**
 * Adoption Metrics
 */
export interface AdoptionMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  adoptionRate: number;
  retentionRate: number;
  activationRate: number;
  period: TimePeriod;
}

/**
 * Time Period
 */
export enum TimePeriod {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

/**
 * Popular Asset
 */
export interface PopularAsset {
  assetId: string;
  assetName: string;
  assetType: string;
  score: number;
  viewCount: number;
  trend: TrendDirection;
}

/**
 * Trend Direction
 */
export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

/**
 * ROI Metrics
 */
export interface ROIMetrics {
  timeSavedHours: number;
  dataQualityImprovement: number;
  duplicateDataReduction: number;
  userProductivityGain: number;
  costSavings: number;
  period: TimePeriod;
}

/**
 * Executive Summary
 */
export interface ExecutiveSummary {
  period: TimePeriod;
  totalAssets: number;
  activeUsers: number;
  searchQueries: number;
  coverageMetrics: CoverageMetrics;
  adoptionMetrics: AdoptionMetrics;
  topAssets: PopularAsset[];
  keyInsights: Insight[];
}

/**
 * Insight
 */
export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  actionable: boolean;
  recommendations: string[];
}

/**
 * Insight Type
 */
export enum InsightType {
  USAGE_SPIKE = 'USAGE_SPIKE',
  USAGE_DROP = 'USAGE_DROP',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  COVERAGE_GAP = 'COVERAGE_GAP',
  ADOPTION_TREND = 'ADOPTION_TREND',
  SEARCH_OPTIMIZATION = 'SEARCH_OPTIMIZATION',
}

/**
 * Insight Severity
 */
export enum InsightSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}
