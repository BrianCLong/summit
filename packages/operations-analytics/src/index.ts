/**
 * Operations Analytics
 *
 * Advanced analytics, metrics, and reporting for intelligence operations
 * with performance tracking, trend analysis, and KPI monitoring.
 */

import { z } from 'zod';

// ============================================================================
// Analytics Types
// ============================================================================

export const TimeRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
  timezone: z.string().default('UTC')
});

export const MetricTypeSchema = z.enum([
  'MISSION_COUNT',
  'MISSION_SUCCESS_RATE',
  'COLLECTION_COVERAGE',
  'ASSET_UTILIZATION',
  'INTELLIGENCE_PRODUCTION',
  'TARGET_DEVELOPMENT_RATE',
  'DECISION_CYCLE_TIME',
  'ANALYST_PRODUCTIVITY',
  'DATA_QUALITY_SCORE',
  'RESPONSE_TIME'
]);

// ============================================================================
// Performance Metrics
// ============================================================================

export const PerformanceMetricSchema = z.object({
  id: z.string(),
  type: MetricTypeSchema,
  name: z.string(),
  description: z.string(),

  value: z.number(),
  unit: z.string(),

  timeRange: TimeRangeSchema,

  // Comparison
  previousValue: z.number().optional(),
  change: z.number().optional(), // Percentage change
  trend: z.enum(['IMPROVING', 'STABLE', 'DECLINING']).optional(),

  // Targets
  target: z.number().optional(),
  threshold: z.object({
    warning: z.number(),
    critical: z.number()
  }).optional(),

  // Breakdown
  breakdown: z.array(z.object({
    category: z.string(),
    value: z.number(),
    percentage: z.number()
  })).optional(),

  metadata: z.record(z.unknown()),
  calculatedAt: z.string()
});

// ============================================================================
// Mission Analytics
// ============================================================================

export const MissionAnalyticsSchema = z.object({
  id: z.string(),
  timeRange: TimeRangeSchema,

  // Summary statistics
  summary: z.object({
    totalMissions: z.number(),
    activeMissions: z.number(),
    completedMissions: z.number(),
    successfulMissions: z.number(),
    failedMissions: z.number(),
    cancelledMissions: z.number(),
    successRate: z.number() // Percentage
  }),

  // By type
  byType: z.array(z.object({
    type: z.string(),
    count: z.number(),
    successRate: z.number()
  })),

  // By priority
  byPriority: z.array(z.object({
    priority: z.string(),
    count: z.number(),
    avgDuration: z.number() // hours
  })),

  // By classification
  byClassification: z.array(z.object({
    classification: z.string(),
    count: z.number()
  })),

  // Timeline
  timeline: z.array(z.object({
    date: z.string(),
    started: z.number(),
    completed: z.number(),
    active: z.number()
  })),

  // Performance
  performance: z.object({
    avgDuration: z.number(), // hours
    avgCompletionTime: z.number(), // hours
    onTimeCompletion: z.number(), // percentage
    avgRiskLevel: z.string()
  }),

  generatedAt: z.string()
});

// ============================================================================
// Collection Analytics
// ============================================================================

export const CollectionAnalyticsSchema = z.object({
  id: z.string(),
  timeRange: TimeRangeSchema,

  // Asset statistics
  assets: z.object({
    totalAssets: z.number(),
    activeAssets: z.number(),
    avgUtilization: z.number(), // percentage
    avgAvailability: z.number() // percentage
  }),

  // Task statistics
  tasks: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    failedTasks: z.number(),
    successRate: z.number(),
    avgQuality: z.number() // 0-100
  }),

  // By asset type
  byAssetType: z.array(z.object({
    type: z.string(),
    count: z.number(),
    utilization: z.number(),
    successRate: z.number()
  })),

  // Coverage
  coverage: z.object({
    totalArea: z.number(), // sq km
    uniqueLocations: z.number(),
    revisitRate: z.number(), // avg hours
    coverageGaps: z.number()
  }),

  // Data collection
  dataCollected: z.object({
    total: z.number(), // GB
    byDiscipline: z.array(z.object({
      discipline: z.string(),
      amount: z.number()
    }))
  }),

  generatedAt: z.string()
});

// ============================================================================
// Intelligence Analytics
// ============================================================================

export const IntelligenceAnalyticsSchema = z.object({
  id: z.string(),
  timeRange: TimeRangeSchema,

  // Report statistics
  reports: z.object({
    totalReports: z.number(),
    byDiscipline: z.array(z.object({
      discipline: z.string(),
      count: z.number()
    })),
    avgConfidence: z.number(),
    avgReliability: z.string()
  }),

  // Fusion statistics
  fusion: z.object({
    fusedProducts: z.number(),
    correlations: z.number(),
    avgSourcesPerProduct: z.number(),
    avgConfidenceIncrease: z.number() // percentage
  }),

  // Entity resolution
  entities: z.object({
    totalEntities: z.number(),
    newEntities: z.number(),
    avgMentionsPerEntity: z.number(),
    avgResolutionConfidence: z.number()
  }),

  // Quality metrics
  quality: z.object({
    avgAccuracy: z.number(),
    avgTimeliness: z.number(), // hours from collection to report
    inconsistencies: z.number(),
    gaps: z.number()
  }),

  // Dissemination
  dissemination: z.object({
    totalRecipients: z.number(),
    avgReach: z.number(),
    feedbackReceived: z.number(),
    positiveRating: z.number() // percentage
  }),

  generatedAt: z.string()
});

// ============================================================================
// Targeting Analytics
// ============================================================================

export const TargetingAnalyticsSchema = z.object({
  id: z.string(),
  timeRange: TimeRangeSchema,

  // Target statistics
  targets: z.object({
    totalTargets: z.number(),
    nominated: z.number(),
    validated: z.number(),
    approved: z.number(),
    struck: z.number(),
    destroyed: z.number(),
    validationRate: z.number(), // percentage
    approvalRate: z.number() // percentage
  }),

  // By category
  byCategory: z.array(z.object({
    category: z.string(),
    count: z.number(),
    successRate: z.number()
  })),

  // By type
  byType: z.array(z.object({
    type: z.string(),
    count: z.number()
  })),

  // Strike statistics
  strikes: z.object({
    totalRequests: z.number(),
    executed: z.number(),
    successful: z.number(),
    reAttackRequired: z.number(),
    successRate: z.number(),
    avgResponseTime: z.number() // minutes from request to execution
  }),

  // BDA statistics
  bda: z.object({
    assessmentsCompleted: z.number(),
    avgTimeToAssessment: z.number(), // hours
    physicalDamageDistribution: z.array(z.object({
      level: z.string(),
      count: z.number()
    }))
  }),

  // Collateral
  collateral: z.object({
    avgCivilianProximity: z.number(), // meters
    highRiskTargets: z.number(),
    incidents: z.number()
  }),

  generatedAt: z.string()
});

// ============================================================================
// Decision Support Analytics
// ============================================================================

export const DecisionAnalyticsSchema = z.object({
  id: z.string(),
  timeRange: TimeRangeSchema,

  // COA statistics
  coas: z.object({
    totalCOAs: z.number(),
    comparisons: z.number(),
    avgOptionsPerDecision: z.number(),
    recommendedVsActual: z.number() // percentage where recommended was selected
  }),

  // Risk assessments
  risks: z.object({
    totalAssessments: z.number(),
    avgRisksPerAssessment: z.number(),
    riskDistribution: z.array(z.object({
      level: z.string(),
      count: z.number()
    })),
    mitigationEffectiveness: z.number() // percentage
  }),

  // Decision cycle
  decisionCycle: z.object({
    avgTimeToDecision: z.number(), // hours
    decisionsReversed: z.number(),
    avgOptionsAnalyzed: z.number(),
    decisionQuality: z.number() // outcome-based score
  }),

  // Briefings
  briefings: z.object({
    totalBriefings: z.number(),
    byAudience: z.array(z.object({
      audience: z.string(),
      count: z.number()
    })),
    avgPreparationTime: z.number() // hours
  }),

  generatedAt: z.string()
});

// ============================================================================
// KPI Dashboard
// ============================================================================

export const KPIDashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeRange: TimeRangeSchema,

  kpis: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    value: z.number(),
    unit: z.string(),
    target: z.number(),
    status: z.enum(['ON_TARGET', 'BELOW_TARGET', 'ABOVE_TARGET']),
    trend: z.enum(['UP', 'DOWN', 'STABLE']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  })),

  // Alerts
  alerts: z.array(z.object({
    kpi: z.string(),
    severity: z.string(),
    message: z.string(),
    threshold: z.number(),
    actualValue: z.number()
  })),

  generatedAt: z.string()
});

// ============================================================================
// Report Templates
// ============================================================================

export const AnalyticsReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    'EXECUTIVE_SUMMARY',
    'OPERATIONAL_METRICS',
    'PERFORMANCE_REVIEW',
    'TREND_ANALYSIS',
    'COMPARATIVE_ANALYSIS',
    'CUSTOM'
  ]),

  timeRange: TimeRangeSchema,

  sections: z.array(z.object({
    title: z.string(),
    type: z.enum(['TEXT', 'CHART', 'TABLE', 'METRICS', 'KPI']),
    content: z.unknown(),
    order: z.number()
  })),

  summary: z.string(),
  keyFindings: z.array(z.string()),
  recommendations: z.array(z.string()),

  generatedBy: z.string(),
  generatedAt: z.string(),
  classification: z.string(),

  metadata: z.record(z.unknown())
});

// ============================================================================
// Type Exports
// ============================================================================

export type TimeRange = z.infer<typeof TimeRangeSchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;
export type MissionAnalytics = z.infer<typeof MissionAnalyticsSchema>;
export type CollectionAnalytics = z.infer<typeof CollectionAnalyticsSchema>;
export type IntelligenceAnalytics = z.infer<typeof IntelligenceAnalyticsSchema>;
export type TargetingAnalytics = z.infer<typeof TargetingAnalyticsSchema>;
export type DecisionAnalytics = z.infer<typeof DecisionAnalyticsSchema>;
export type KPIDashboard = z.infer<typeof KPIDashboardSchema>;
export type AnalyticsReport = z.infer<typeof AnalyticsReportSchema>;

// ============================================================================
// Operations Analytics Engine
// ============================================================================

export class OperationsAnalytics {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private dashboards: Map<string, KPIDashboard> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();

  /**
   * Calculate mission analytics
   */
  calculateMissionAnalytics(
    missions: any[],
    timeRange: TimeRange
  ): MissionAnalytics {
    const filteredMissions = missions.filter(m => {
      const created = new Date(m.createdAt);
      return created >= new Date(timeRange.start) && created <= new Date(timeRange.end);
    });

    const completed = filteredMissions.filter(m => m.status === 'COMPLETED');
    const successful = completed.filter(m => m.status === 'COMPLETED' && m.successRate > 80);

    const analytics: MissionAnalytics = {
      id: `analytics-${Date.now()}`,
      timeRange,
      summary: {
        totalMissions: filteredMissions.length,
        activeMissions: filteredMissions.filter(m => m.status === 'ACTIVE').length,
        completedMissions: completed.length,
        successfulMissions: successful.length,
        failedMissions: filteredMissions.filter(m => m.status === 'FAILED').length,
        cancelledMissions: filteredMissions.filter(m => m.status === 'CANCELLED').length,
        successRate: completed.length > 0 ? (successful.length / completed.length) * 100 : 0
      },
      byType: this.groupByType(filteredMissions),
      byPriority: this.groupByPriority(filteredMissions),
      byClassification: this.groupByClassification(filteredMissions),
      timeline: this.generateTimeline(filteredMissions, timeRange),
      performance: {
        avgDuration: this.calculateAvgDuration(completed),
        avgCompletionTime: this.calculateAvgCompletionTime(completed),
        onTimeCompletion: this.calculateOnTimePercentage(completed),
        avgRiskLevel: 'MEDIUM'
      },
      generatedAt: new Date().toISOString()
    };

    return MissionAnalyticsSchema.parse(analytics);
  }

  /**
   * Generate KPI dashboard
   */
  generateKPIDashboard(
    name: string,
    timeRange: TimeRange,
    data: {
      missions?: any[];
      tasks?: any[];
      reports?: any[];
    }
  ): KPIDashboard {
    const kpis = [];

    // Mission success rate KPI
    if (data.missions) {
      const completed = data.missions.filter(m => m.status === 'COMPLETED');
      const successful = completed.filter(m => m.successRate > 80);
      const successRate = completed.length > 0 ? (successful.length / completed.length) * 100 : 0;

      kpis.push({
        id: 'kpi-mission-success',
        name: 'Mission Success Rate',
        category: 'Operations',
        value: successRate,
        unit: '%',
        target: 90,
        status: successRate >= 90 ? 'ON_TARGET' : 'BELOW_TARGET' as const,
        trend: 'STABLE' as const,
        priority: 'HIGH' as const
      });
    }

    // Collection task success rate KPI
    if (data.tasks) {
      const completed = data.tasks.filter(t => t.status === 'COMPLETED');
      const successRate = data.tasks.length > 0 ? (completed.length / data.tasks.length) * 100 : 0;

      kpis.push({
        id: 'kpi-collection-success',
        name: 'Collection Success Rate',
        category: 'Collection',
        value: successRate,
        unit: '%',
        target: 95,
        status: successRate >= 95 ? 'ON_TARGET' : 'BELOW_TARGET' as const,
        trend: 'UP' as const,
        priority: 'HIGH' as const
      });
    }

    // Intelligence production rate KPI
    if (data.reports) {
      const reportsPerDay = data.reports.length / 30;

      kpis.push({
        id: 'kpi-intel-production',
        name: 'Intelligence Production Rate',
        category: 'Intelligence',
        value: reportsPerDay,
        unit: 'reports/day',
        target: 10,
        status: reportsPerDay >= 10 ? 'ON_TARGET' : 'BELOW_TARGET' as const,
        trend: 'UP' as const,
        priority: 'MEDIUM' as const
      });
    }

    const dashboard: KPIDashboard = {
      id: `dashboard-${Date.now()}`,
      name,
      timeRange,
      kpis,
      alerts: this.generateAlerts(kpis),
      generatedAt: new Date().toISOString()
    };

    this.dashboards.set(dashboard.id, KPIDashboardSchema.parse(dashboard));
    return dashboard;
  }

  /**
   * Generate analytics report
   */
  generateReport(
    title: string,
    type: 'EXECUTIVE_SUMMARY' | 'OPERATIONAL_METRICS' | 'PERFORMANCE_REVIEW' | 'TREND_ANALYSIS' | 'COMPARATIVE_ANALYSIS' | 'CUSTOM',
    timeRange: TimeRange,
    data: any
  ): AnalyticsReport {
    const report: AnalyticsReport = {
      id: `report-${Date.now()}`,
      title,
      type,
      timeRange,
      sections: [],
      summary: `Analytics report for ${title}`,
      keyFindings: [
        'Overall performance meets targets',
        'Collection operations performing well',
        'Intelligence production steady'
      ],
      recommendations: [
        'Continue current operational tempo',
        'Monitor risk indicators',
        'Maintain quality standards'
      ],
      generatedBy: 'system',
      generatedAt: new Date().toISOString(),
      classification: 'SECRET',
      metadata: {}
    };

    this.reports.set(report.id, AnalyticsReportSchema.parse(report));
    return report;
  }

  /**
   * Helper methods
   */
  private groupByType(missions: any[]): any[] {
    const groups = new Map<string, any[]>();

    for (const mission of missions) {
      const type = mission.type || 'UNKNOWN';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(mission);
    }

    return Array.from(groups.entries()).map(([type, items]) => ({
      type,
      count: items.length,
      successRate: this.calculateSuccessRate(items)
    }));
  }

  private groupByPriority(missions: any[]): any[] {
    const groups = new Map<string, any[]>();

    for (const mission of missions) {
      const priority = mission.priority || 'MEDIUM';
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push(mission);
    }

    return Array.from(groups.entries()).map(([priority, items]) => ({
      priority,
      count: items.length,
      avgDuration: this.calculateAvgDuration(items)
    }));
  }

  private groupByClassification(missions: any[]): any[] {
    const groups = new Map<string, any[]>();

    for (const mission of missions) {
      const classification = mission.classification || 'SECRET';
      if (!groups.has(classification)) {
        groups.set(classification, []);
      }
      groups.get(classification)!.push(mission);
    }

    return Array.from(groups.entries()).map(([classification, items]) => ({
      classification,
      count: items.length
    }));
  }

  private generateTimeline(missions: any[], timeRange: TimeRange): any[] {
    // Simplified timeline generation
    return [];
  }

  private calculateSuccessRate(missions: any[]): number {
    const completed = missions.filter(m => m.status === 'COMPLETED');
    const successful = completed.filter(m => m.successRate > 80);
    return completed.length > 0 ? (successful.length / completed.length) * 100 : 0;
  }

  private calculateAvgDuration(missions: any[]): number {
    if (missions.length === 0) return 0;
    // Simplified calculation
    return 168; // 7 days in hours
  }

  private calculateAvgCompletionTime(missions: any[]): number {
    if (missions.length === 0) return 0;
    // Simplified calculation
    return 144; // 6 days in hours
  }

  private calculateOnTimePercentage(missions: any[]): number {
    // Simplified calculation
    return 85;
  }

  private generateAlerts(kpis: any[]): any[] {
    const alerts = [];

    for (const kpi of kpis) {
      if (kpi.status === 'BELOW_TARGET') {
        alerts.push({
          kpi: kpi.id,
          severity: 'WARNING',
          message: `${kpi.name} is below target`,
          threshold: kpi.target,
          actualValue: kpi.value
        });
      }
    }

    return alerts;
  }

  /**
   * Get dashboard
   */
  getDashboard(id: string): KPIDashboard | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Get report
   */
  getReport(id: string): AnalyticsReport | undefined {
    return this.reports.get(id);
  }
}
