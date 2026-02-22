/**
 * Adoption Analytics Types
 *
 * Types for tracking feature adoption, usage patterns, and user behavior.
 * All data is anonymized to protect user privacy.
 *
 * SOC 2 Controls: CC6.1, PI1.1 | GDPR Article 5
 *
 * @module analytics/adoption/types
 */

import { DataClassification } from '../../types/data-envelope.ts';
import type { GovernanceVerdict } from '../../types/data-envelope.ts';

/**
 * Consent status for analytics collection
 */
export interface ConsentRecord {
  analyticsConsent: boolean;
  consentedAt?: Date;
  consentSource: 'explicit' | 'implied' | 'none';
  consentVersion: string;
}

/**
 * Feature categories for grouping
 */
export type FeatureCategory =
  | 'core'           // Core platform features
  | 'analytics'      // Analytics and reporting
  | 'governance'     // Governance and policy
  | 'integrations'   // External integrations
  | 'plugins'        // Plugin ecosystem
  | 'collaboration'  // Team collaboration
  | 'admin';         // Administration

/**
 * Feature definition for tracking
 */
export interface FeatureDefinition {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  trackingEvents: string[];
  adoptionThreshold: number; // Usage count to consider "adopted"
  enabled: boolean;
}

/**
 * Adoption event types
 */
export type AdoptionEventType =
  | 'feature_viewed'     // Feature page/section viewed
  | 'feature_used'       // Feature actively used
  | 'feature_configured' // Feature configured/customized
  | 'feature_error'      // Error during feature use
  | 'milestone_reached'  // Usage milestone achieved
  | 'session_started'    // User session started
  | 'session_ended';     // User session ended

/**
 * Raw adoption event (before anonymization)
 */
export interface AdoptionEventRaw {
  eventId: string;
  eventType: AdoptionEventType;
  tenantId: string;
  userId: string;
  featureId: string;
  timestamp: Date;
  sessionId: string;
  properties: Record<string, unknown>;
  consent: ConsentRecord;
}

/**
 * Anonymized adoption event (stored)
 */
export interface AdoptionEvent {
  eventId: string;
  eventType: AdoptionEventType;
  tenantHash: string;
  userHash: string;
  featureId: string;
  timestamp: Date;
  sessionHash: string;
  properties: Record<string, unknown>;
  governanceVerdict: GovernanceVerdict;
}

/**
 * User adoption profile (anonymized)
 */
export interface UserAdoptionProfile {
  userHash: string;
  tenantHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  totalSessions: number;
  totalEvents: number;
  featuresUsed: Map<string, FeatureUsageStats>;
  adoptionScore: number; // 0-100
  cohort: string; // e.g., "2024-W01"
}

/**
 * Feature usage statistics
 */
export interface FeatureUsageStats {
  featureId: string;
  firstUsedAt: Date;
  lastUsedAt: Date;
  usageCount: number;
  errorCount: number;
  avgSessionDuration?: number;
  adopted: boolean;
}

/**
 * Tenant adoption summary
 */
export interface TenantAdoptionSummary {
  tenantHash: string;
  activeUsers: number;
  totalUsers: number;
  featuresAdopted: number;
  featuresAvailable: number;
  adoptionRate: number;
  topFeatures: string[];
  underutilizedFeatures: string[];
  churnRisk: 'low' | 'medium' | 'high';
}

/**
 * Cohort definition for analysis
 */
export interface CohortDefinition {
  id: string;
  name: string;
  type: 'time' | 'behavior' | 'segment';
  criteria: CohortCriteria;
  createdAt: Date;
}

/**
 * Criteria for cohort membership
 */
export interface CohortCriteria {
  timeRange?: {
    startDate: Date;
    endDate: Date;
    field: 'firstSeen' | 'signup' | 'lastActive';
  };
  features?: {
    required?: string[];
    excluded?: string[];
    minUsage?: number;
  };
  segments?: string[];
}

/**
 * Cohort analysis results
 */
export interface CohortAnalysis {
  cohortId: string;
  cohortName: string;
  memberCount: number;
  retentionCurve: RetentionDataPoint[];
  featureAdoption: Map<string, number>;
  avgTimeToValue: number;
  governanceVerdict: GovernanceVerdict;
  classification: DataClassification;
}

/**
 * Retention data point
 */
export interface RetentionDataPoint {
  period: number; // Days/weeks since cohort start
  retainedUsers: number;
  retentionRate: number;
}

/**
 * Funnel definition
 */
export interface FunnelDefinition {
  id: string;
  name: string;
  steps: FunnelStep[];
  timeWindow: number; // Max time (ms) between first and last step
}

/**
 * Funnel step definition
 */
export interface FunnelStep {
  id: string;
  name: string;
  eventType: AdoptionEventType;
  featureId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Funnel analysis results
 */
export interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  totalEntries: number;
  stepConversions: FunnelStepResult[];
  overallConversionRate: number;
  avgTimeToComplete: number;
  dropOffPoints: DropOffAnalysis[];
  governanceVerdict: GovernanceVerdict;
}

/**
 * Funnel step result
 */
export interface FunnelStepResult {
  stepId: string;
  stepName: string;
  entries: number;
  exits: number;
  conversionRate: number;
  avgTimeToNext?: number;
}

/**
 * Drop-off analysis
 */
export interface DropOffAnalysis {
  stepId: string;
  dropOffRate: number;
  commonNextActions: string[];
  potentialCauses: string[];
}

/**
 * Product metrics dashboard data
 */
export interface ProductMetricsDashboard {
  period: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month';
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    dauMauRatio: number;
    avgSessionDuration: number;
    sessionsPerUser: number;
  };
  adoption: {
    newUsers: number;
    activatedUsers: number;
    activationRate: number;
    featureAdoptionRates: Map<string, number>;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
    churnRate: number;
  };
  health: {
    npsScore?: number;
    errorRate: number;
    supportTickets: number;
  };
  topFeatures: FeatureRanking[];
  governanceVerdict: GovernanceVerdict;
  classification: DataClassification;
}

/**
 * Feature ranking for top features
 */
export interface FeatureRanking {
  featureId: string;
  featureName: string;
  usageCount: number;
  uniqueUsers: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  startDate: Date;
  endDate: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
  filters?: {
    tenantHashes?: string[];
    featureIds?: string[];
    eventTypes?: AdoptionEventType[];
    cohorts?: string[];
  };
  limit?: number;
  offset?: number;
}

/**
 * Analytics export format
 */
export type AnalyticsExportFormat = 'csv' | 'json' | 'parquet';

/**
 * Analytics export request
 */
export interface AnalyticsExportRequest {
  reportType: 'adoption' | 'retention' | 'funnel' | 'cohort' | 'features';
  options: AnalyticsQueryOptions;
  format: AnalyticsExportFormat;
  includeRawEvents: boolean;
  requestedBy: string;
  requestedAt: Date;
}

/**
 * Privacy-preserving aggregation config
 */
export interface PrivacyConfig {
  minGroupSize: number; // Minimum users in group to report
  hashSalt: string;
  retentionDays: number;
  allowedDimensions: string[];
  excludedProperties: string[];
}
