import { z } from 'zod';

// Market Trend Types
export const MarketTrendSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(['technology', 'security', 'ux', 'performance', 'compliance']),
  signal: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['low', 'medium', 'high', 'critical']),
  source: z.string(),
  detectedAt: z.date(),
  actionable: z.boolean(),
  recommendedActions: z.array(z.string()),
});

export type MarketTrend = z.infer<typeof MarketTrendSchema>;

// Competitive Threat Types
export const CompetitiveThreatSchema = z.object({
  id: z.string().uuid(),
  competitor: z.string(),
  threatType: z.enum(['feature_gap', 'performance_lag', 'security_weakness', 'ux_deficit']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  detectedAt: z.date(),
  responseDeadline: z.date().optional(),
  mitigationStrategy: z.string().optional(),
});

export type CompetitiveThreat = z.infer<typeof CompetitiveThreatSchema>;

// Regulatory Change Types
export const RegulatoryChangeSchema = z.object({
  id: z.string().uuid(),
  regulation: z.string(),
  jurisdiction: z.string(),
  changeType: z.enum(['new', 'amendment', 'repeal', 'guidance']),
  effectiveDate: z.date(),
  complianceDeadline: z.date(),
  impact: z.enum(['minimal', 'moderate', 'significant', 'transformational']),
  affectedComponents: z.array(z.string()),
  requiredActions: z.array(z.string()),
});

export type RegulatoryChange = z.infer<typeof RegulatoryChangeSchema>;

// Upgrade Types
export const UpgradeComponentSchema = z.enum([
  'algorithm',
  'security',
  'ux',
  'infrastructure',
  'database',
  'api',
  'monitoring',
]);

export type UpgradeComponent = z.infer<typeof UpgradeComponentSchema>;

export const UpgradeStatusSchema = z.enum([
  'pending',
  'analyzing',
  'approved',
  'in_progress',
  'validating',
  'completed',
  'rolled_back',
  'failed',
]);

export type UpgradeStatus = z.infer<typeof UpgradeStatusSchema>;

export const UpgradeRequestSchema = z.object({
  id: z.string().uuid(),
  component: UpgradeComponentSchema,
  currentVersion: z.string(),
  targetVersion: z.string(),
  trigger: z.enum(['market_trend', 'competitive_threat', 'regulatory_change', 'scheduled', 'manual']),
  triggerId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: UpgradeStatusSchema,
  createdAt: z.date(),
  scheduledAt: z.date().optional(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  rollbackAvailable: z.boolean(),
  validationResults: z.record(z.boolean()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type UpgradeRequest = z.infer<typeof UpgradeRequestSchema>;

// Health Check Types
export interface ComponentHealth {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: Date;
  metrics: Record<string, number>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: ComponentHealth[];
  timestamp: Date;
}

// Configuration Types
export interface UpgradePolicy {
  autoUpgrade: boolean;
  requireApproval: boolean;
  maintenanceWindow: {
    dayOfWeek: number[];
    startHour: number;
    endHour: number;
    timezone: string;
  };
  rollbackThreshold: number;
  maxConcurrentUpgrades: number;
}

export interface SensorConfig {
  marketTrendSources: string[];
  competitorMonitoringEnabled: boolean;
  regulatoryFeedUrls: string[];
  scanIntervalMinutes: number;
}
