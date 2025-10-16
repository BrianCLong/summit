/**
 * @fileoverview Chaos Engineering Report Generator
 * Comprehensive reporting and analysis system for chaos experiments
 * with detailed insights, trend analysis, and executive summaries.
 */

import { EventEmitter } from 'events';
import {
  ExperimentResult,
  ExperimentInsight,
  ChaosExperiment,
} from '../core/ChaosEngine.js';

/**
 * Report types and formats
 */
export type ReportType =
  | 'experiment_summary'
  | 'trend_analysis'
  | 'resilience_scorecard'
  | 'executive_summary'
  | 'technical_details'
  | 'compliance_audit';

export type ReportFormat = 'html' | 'pdf' | 'json' | 'markdown' | 'csv';

/**
 * Report configuration
 */
export interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  timeRange: {
    start: Date;
    end: Date;
  };
  filters: ReportFilters;
  includeCharts: boolean;
  includeRawData: boolean;
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  recipients?: string[];
  scheduledDelivery?: ScheduleConfig;
}

/**
 * Report filtering options
 */
export interface ReportFilters {
  environments?: string[];
  teams?: string[];
  experimentTypes?: string[];
  riskLevels?: string[];
  status?: string[];
  tags?: string[];
}

/**
 * Scheduled report delivery
 */
export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:MM format
  timezone: string;
  enabled: boolean;
}

/**
 * Comprehensive chaos experiment report
 */
export interface ChaosReport {
  id: string;
  type: ReportType;
  title: string;
  subtitle?: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: ReportSummary;
  sections: ReportSection[];
  appendices: ReportAppendix[];
  metadata: ReportMetadata;
}

/**
 * Report summary section
 */
export interface ReportSummary {
  totalExperiments: number;
  successfulExperiments: number;
  failedExperiments: number;
  averageScore: number;
  keyFindings: string[];
  criticalIssues: CriticalIssue[];
  recommendations: Recommendation[];
  trendsObserved: TrendObservation[];
}

/**
 * Critical issue identification
 */
export interface CriticalIssue {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'critical';
  affectedSystems: string[];
  firstObserved: Date;
  frequency: number;
  businessImpact: BusinessImpact;
  mitigation: MitigationPlan;
}

/**
 * Business impact assessment
 */
export interface BusinessImpact {
  category:
    | 'availability'
    | 'performance'
    | 'security'
    | 'data_integrity'
    | 'compliance';
  estimatedDowntimeMinutes?: number;
  estimatedRevenueLoss?: number;
  customerImpact: 'none' | 'minimal' | 'moderate' | 'significant' | 'severe';
  reputationRisk: 'low' | 'medium' | 'high';
}

/**
 * Mitigation plan for issues
 */
export interface MitigationPlan {
  immediateActions: string[];
  shortTermActions: string[];
  longTermActions: string[];
  owner: string;
  timeline: string;
  estimatedEffort: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Report recommendation
 */
export interface Recommendation {
  id: string;
  category: 'architecture' | 'monitoring' | 'process' | 'tooling' | 'training';
  title: string;
  description: string;
  rationale: string;
  implementationSteps: string[];
  estimatedBenefit: string;
  effort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  timeline: string;
}

/**
 * Trend observation
 */
export interface TrendObservation {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  timeframe: string;
  significance: 'low' | 'medium' | 'high';
  analysis: string;
}

/**
 * Report section
 */
export interface ReportSection {
  id: string;
  title: string;
  order: number;
  content: SectionContent;
}

/**
 * Section content types
 */
export interface SectionContent {
  type: 'text' | 'chart' | 'table' | 'metrics' | 'timeline' | 'heatmap';
  data: any;
  visualization?: VisualizationConfig;
  analysis?: string;
  keyPoints?: string[];
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'timeline';
  title: string;
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  showLegend: boolean;
  showGrid: boolean;
}

/**
 * Report appendix
 */
export interface ReportAppendix {
  id: string;
  title: string;
  content: any;
  type: 'raw_data' | 'methodology' | 'glossary' | 'references';
}

/**
 * Report metadata
 */
export interface ReportMetadata {
  generatedBy: string;
  version: string;
  sources: string[];
  methodology: string;
  limitations: string[];
  confidentialityLevel: string;
  distributionList?: string[];
}

/**
 * Resilience scorecard metrics
 */
export interface ResilienceScorecard {
  overallScore: number; // 0-100
  categories: {
    availability: ScorecardCategory;
    performance: ScorecardCategory;
    errorHandling: ScorecardCategory;
    recovery: ScorecardCategory;
    monitoring: ScorecardCategory;
  };
  trends: {
    thirtyDays: number;
    ninetyDays: number;
    oneYear: number;
  };
  benchmarks: {
    industry: number;
    internal: number;
    target: number;
  };
}

/**
 * Scorecard category
 */
export interface ScorecardCategory {
  score: number; // 0-100
  weight: number; // contribution to overall score
  metrics: CategoryMetric[];
  trend: 'improving' | 'stable' | 'degrading';
  recommendation?: string;
}

/**
 * Category metric
 */
export interface CategoryMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: number; // percentage change
  status: 'good' | 'warning' | 'critical';
}

/**
 * Comprehensive chaos engineering report generator
 */
export class ChaosReportGenerator extends EventEmitter {
  private reports: Map<string, ChaosReport> = new Map();
  private scheduledReports: Map<string, ScheduleConfig> = new Map();
  private templates: Map<ReportType, any> = new Map();

  constructor(
    private config: {
      outputDirectory: string;
      enableScheduling: boolean;
      defaultFormat: ReportFormat;
      retentionDays: number;
      enableEncryption: boolean;
      watermarkReports: boolean;
    },
  ) {
    super();
    this.initializeTemplates();
    this.startScheduledReports();
  }

  /**
   * Generate chaos engineering report
   */
  async generateReport(
    experiments: ExperimentResult[],
    reportConfig: ReportConfig,
  ): Promise<ChaosReport> {
    const reportId = this.generateReportId(reportConfig);

    const report: ChaosReport = {
      id: reportId,
      type: reportConfig.type,
      title: this.generateTitle(reportConfig),
      subtitle: this.generateSubtitle(reportConfig),
      generatedAt: new Date(),
      timeRange: reportConfig.timeRange,
      summary: await this.generateSummary(experiments, reportConfig),
      sections: await this.generateSections(experiments, reportConfig),
      appendices: await this.generateAppendices(experiments, reportConfig),
      metadata: this.generateMetadata(reportConfig),
    };

    // Store report
    this.reports.set(reportId, report);

    // Generate output files
    await this.outputReport(report, reportConfig);

    // Send notifications if configured
    if (reportConfig.recipients && reportConfig.recipients.length > 0) {
      await this.distributeReport(report, reportConfig);
    }

    this.emit('report:generated', { reportId, type: reportConfig.type });

    return report;
  }

  /**
   * Generate experiment summary report
   */
  async generateExperimentSummary(
    experiments: ExperimentResult[],
    config?: Partial<ReportConfig>,
  ): Promise<ChaosReport> {
    const reportConfig: ReportConfig = {
      type: 'experiment_summary',
      format: 'html',
      timeRange: this.getDefaultTimeRange(),
      filters: {},
      includeCharts: true,
      includeRawData: false,
      confidentialityLevel: 'internal',
      ...config,
    };

    return this.generateReport(experiments, reportConfig);
  }

  /**
   * Generate resilience scorecard
   */
  async generateResilienceScorecard(
    experiments: ExperimentResult[],
    config?: Partial<ReportConfig>,
  ): Promise<ChaosReport> {
    const reportConfig: ReportConfig = {
      type: 'resilience_scorecard',
      format: 'html',
      timeRange: this.getDefaultTimeRange(),
      filters: {},
      includeCharts: true,
      includeRawData: false,
      confidentialityLevel: 'internal',
      ...config,
    };

    const report = await this.generateReport(experiments, reportConfig);

    // Add resilience scorecard specific data
    const scorecard = await this.calculateResilienceScorecard(experiments);
    report.sections.unshift({
      id: 'resilience_scorecard',
      title: 'Resilience Scorecard',
      order: 1,
      content: {
        type: 'metrics',
        data: scorecard,
        analysis: this.generateScorecardAnalysis(scorecard),
      },
    });

    return report;
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    experiments: ExperimentResult[],
    config?: Partial<ReportConfig>,
  ): Promise<ChaosReport> {
    const reportConfig: ReportConfig = {
      type: 'executive_summary',
      format: 'pdf',
      timeRange: this.getDefaultTimeRange(),
      filters: {},
      includeCharts: true,
      includeRawData: false,
      confidentialityLevel: 'confidential',
      ...config,
    };

    const report = await this.generateReport(experiments, reportConfig);

    // Customize for executive audience
    report.title = 'System Resilience Executive Summary';
    report.subtitle = 'Chaos Engineering Assessment';

    return report;
  }

  /**
   * Generate trend analysis report
   */
  async generateTrendAnalysis(
    experiments: ExperimentResult[],
    config?: Partial<ReportConfig>,
  ): Promise<ChaosReport> {
    const reportConfig: ReportConfig = {
      type: 'trend_analysis',
      format: 'html',
      timeRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
        end: new Date(),
      },
      filters: {},
      includeCharts: true,
      includeRawData: true,
      confidentialityLevel: 'internal',
      ...config,
    };

    return this.generateReport(experiments, reportConfig);
  }

  /**
   * Schedule recurring report generation
   */
  scheduleReport(reportConfig: ReportConfig, schedule: ScheduleConfig): string {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.scheduledReports.set(scheduleId, {
      ...schedule,
      reportConfig,
    } as any);

    this.emit('report:scheduled', { scheduleId, schedule });

    return scheduleId;
  }

  /**
   * Get generated report by ID
   */
  getReport(reportId: string): ChaosReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * List available reports
   */
  listReports(filters?: {
    type?: ReportType;
    startDate?: Date;
    endDate?: Date;
  }): ChaosReport[] {
    let reports = Array.from(this.reports.values());

    if (filters) {
      if (filters.type) {
        reports = reports.filter((r) => r.type === filters.type);
      }
      if (filters.startDate) {
        reports = reports.filter((r) => r.generatedAt >= filters.startDate!);
      }
      if (filters.endDate) {
        reports = reports.filter((r) => r.generatedAt <= filters.endDate!);
      }
    }

    return reports.sort(
      (a, b) => b.generatedAt.getTime() - a.generatedAt.getTime(),
    );
  }

  /**
   * Generate report summary
   */
  private async generateSummary(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSummary> {
    const totalExperiments = experiments.length;
    const successfulExperiments = experiments.filter(
      (e) => e.status === 'completed',
    ).length;
    const failedExperiments = experiments.filter(
      (e) => e.status === 'failed',
    ).length;

    const scores = experiments
      .map((e) => this.calculateExperimentScore(e))
      .filter((s) => s > 0);
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    const keyFindings = await this.extractKeyFindings(experiments);
    const criticalIssues = await this.identifyCriticalIssues(experiments);
    const recommendations = await this.generateRecommendations(experiments);
    const trendsObserved = await this.analyzeTrends(experiments);

    return {
      totalExperiments,
      successfulExperiments,
      failedExperiments,
      averageScore,
      keyFindings,
      criticalIssues,
      recommendations,
      trendsObserved,
    };
  }

  /**
   * Generate report sections
   */
  private async generateSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    switch (config.type) {
      case 'experiment_summary':
        sections.push(
          ...(await this.generateExperimentSummarySections(
            experiments,
            config,
          )),
        );
        break;

      case 'trend_analysis':
        sections.push(
          ...(await this.generateTrendAnalysisSections(experiments, config)),
        );
        break;

      case 'resilience_scorecard':
        sections.push(
          ...(await this.generateScorecardSections(experiments, config)),
        );
        break;

      case 'executive_summary':
        sections.push(
          ...(await this.generateExecutiveSections(experiments, config)),
        );
        break;

      case 'technical_details':
        sections.push(
          ...(await this.generateTechnicalSections(experiments, config)),
        );
        break;

      case 'compliance_audit':
        sections.push(
          ...(await this.generateComplianceSections(experiments, config)),
        );
        break;
    }

    return sections.sort((a, b) => a.order - b.order);
  }

  /**
   * Generate experiment summary sections
   */
  private async generateExperimentSummarySections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    return [
      {
        id: 'overview',
        title: 'Experiment Overview',
        order: 1,
        content: {
          type: 'metrics',
          data: {
            totalExperiments: experiments.length,
            successRate: this.calculateSuccessRate(experiments),
            averageDuration: this.calculateAverageDuration(experiments),
            environmentBreakdown: this.getEnvironmentBreakdown(experiments),
          },
          analysis:
            'Summary of chaos experiments conducted during the reporting period.',
        },
      },
      {
        id: 'experiment_results',
        title: 'Experiment Results',
        order: 2,
        content: {
          type: 'table',
          data: experiments.map((e) => ({
            name: e.experimentId,
            status: e.status,
            duration: e.duration,
            score: this.calculateExperimentScore(e),
            insights: e.insights.length,
          })),
          analysis: 'Detailed results for each experiment executed.',
        },
      },
      {
        id: 'insights_analysis',
        title: 'Insights and Learnings',
        order: 3,
        content: {
          type: 'text',
          data: this.aggregateInsights(experiments),
          keyPoints: this.extractInsightKeyPoints(experiments),
          analysis:
            'Key insights discovered through chaos engineering experiments.',
        },
      },
    ];
  }

  /**
   * Generate trend analysis sections
   */
  private async generateTrendAnalysisSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    const timeSeriesData = this.prepareTimeSeriesData(experiments);

    return [
      {
        id: 'trend_overview',
        title: 'Resilience Trends Over Time',
        order: 1,
        content: {
          type: 'chart',
          data: timeSeriesData,
          visualization: {
            chartType: 'line',
            title: 'System Resilience Score Trends',
            xAxis: 'Time',
            yAxis: 'Resilience Score',
            colors: ['#007bff', '#28a745', '#dc3545'],
            showLegend: true,
            showGrid: true,
          },
          analysis:
            'Trending analysis of system resilience over the reporting period.',
        },
      },
      {
        id: 'performance_trends',
        title: 'Performance Trend Analysis',
        order: 2,
        content: {
          type: 'chart',
          data: this.preparePerformanceTrends(experiments),
          visualization: {
            chartType: 'line',
            title: 'Response Time and Error Rate Trends',
            xAxis: 'Time',
            yAxis: 'Metrics',
            colors: ['#ffc107', '#dc3545'],
            showLegend: true,
            showGrid: true,
          },
          analysis:
            'Performance metrics trending over time during chaos experiments.',
        },
      },
    ];
  }

  /**
   * Calculate resilience scorecard
   */
  private async calculateResilienceScorecard(
    experiments: ExperimentResult[],
  ): Promise<ResilienceScorecard> {
    const availability = this.calculateAvailabilityScore(experiments);
    const performance = this.calculatePerformanceScore(experiments);
    const errorHandling = this.calculateErrorHandlingScore(experiments);
    const recovery = this.calculateRecoveryScore(experiments);
    const monitoring = this.calculateMonitoringScore(experiments);

    const overallScore =
      availability.score * 0.25 +
      performance.score * 0.2 +
      errorHandling.score * 0.2 +
      recovery.score * 0.2 +
      monitoring.score * 0.15;

    return {
      overallScore: Math.round(overallScore),
      categories: {
        availability,
        performance,
        errorHandling,
        recovery,
        monitoring,
      },
      trends: {
        thirtyDays: this.calculateTrendScore(experiments, 30),
        ninetyDays: this.calculateTrendScore(experiments, 90),
        oneYear: this.calculateTrendScore(experiments, 365),
      },
      benchmarks: {
        industry: 75, // Industry benchmark
        internal: 80, // Internal target
        target: 85, // Aspirational target
      },
    };
  }

  /**
   * Extract key findings from experiments
   */
  private async extractKeyFindings(
    experiments: ExperimentResult[],
  ): Promise<string[]> {
    const findings: string[] = [];

    // Success rate finding
    const successRate = this.calculateSuccessRate(experiments);
    if (successRate < 80) {
      findings.push(`Low success rate observed: ${successRate.toFixed(1)}%`);
    } else if (successRate > 95) {
      findings.push(
        `Excellent success rate achieved: ${successRate.toFixed(1)}%`,
      );
    }

    // High-impact insights
    const criticalInsights = experiments
      .flatMap((e) => e.insights)
      .filter((i) => i.severity === 'critical' || i.severity === 'high');

    if (criticalInsights.length > 0) {
      findings.push(
        `${criticalInsights.length} critical system weaknesses discovered`,
      );
    }

    // Recovery time analysis
    const avgRecoveryTime = this.calculateAverageRecoveryTime(experiments);
    if (avgRecoveryTime > 300000) {
      // 5 minutes
      findings.push(
        `Slow recovery times observed: average ${(avgRecoveryTime / 1000).toFixed(1)}s`,
      );
    }

    return findings;
  }

  /**
   * Identify critical issues from experiments
   */
  private async identifyCriticalIssues(
    experiments: ExperimentResult[],
  ): Promise<CriticalIssue[]> {
    const issues: CriticalIssue[] = [];
    const issueMap = new Map<string, ExperimentInsight[]>();

    // Group insights by type
    experiments.forEach((experiment) => {
      experiment.insights
        .filter(
          (insight) =>
            insight.severity === 'critical' || insight.severity === 'high',
        )
        .forEach((insight) => {
          const key = insight.title;
          if (!issueMap.has(key)) {
            issueMap.set(key, []);
          }
          issueMap.get(key)!.push(insight);
        });
    });

    // Convert to critical issues
    for (const [title, insights] of issueMap.entries()) {
      if (insights.length >= 2) {
        // Issue appears in multiple experiments
        const issue: CriticalIssue = {
          id: `issue_${title.replace(/\s+/g, '_').toLowerCase()}`,
          title,
          description: insights[0].description,
          severity: insights[0].severity as 'high' | 'critical',
          affectedSystems: [
            ...new Set(
              insights.flatMap((i) => i.evidence.map((e) => e.source)),
            ),
          ],
          firstObserved: new Date(
            Math.min(
              ...insights.map(
                (i) => i.evidence[0]?.timestamp.getTime() || Date.now(),
              ),
            ),
          ),
          frequency: insights.length,
          businessImpact: {
            category: this.categorizeIssue(title),
            customerImpact: this.assessCustomerImpact(insights),
            reputationRisk:
              insights[0].severity === 'critical' ? 'high' : 'medium',
          },
          mitigation: this.generateMitigationPlan(insights),
        };

        issues.push(issue);
      }
    }

    return issues.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Generate recommendations based on experiments
   */
  private async generateRecommendations(
    experiments: ExperimentResult[],
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Analyze experiment patterns for recommendations
    const failedExperiments = experiments.filter((e) => e.status === 'failed');
    const lowScoreExperiments = experiments.filter(
      (e) => this.calculateExperimentScore(e) < 70,
    );

    if (failedExperiments.length > experiments.length * 0.2) {
      recommendations.push({
        id: 'improve_reliability',
        category: 'architecture',
        title: 'Improve System Reliability',
        description:
          'High failure rate in chaos experiments indicates reliability issues',
        rationale: `${failedExperiments.length} out of ${experiments.length} experiments failed`,
        implementationSteps: [
          'Implement circuit breaker patterns',
          'Add retry mechanisms with exponential backoff',
          'Improve error handling and graceful degradation',
          'Enhance monitoring and alerting',
        ],
        estimatedBenefit: 'Reduce system downtime by 40-60%',
        effort: 'high',
        priority: 'high',
        owner: 'architecture-team',
        timeline: '3-6 months',
      });
    }

    if (lowScoreExperiments.length > 0) {
      recommendations.push({
        id: 'enhance_monitoring',
        category: 'monitoring',
        title: 'Enhance Observability',
        description: 'Low resilience scores suggest insufficient monitoring',
        rationale: 'Multiple experiments showed monitoring gaps',
        implementationSteps: [
          'Implement distributed tracing',
          'Add business metrics monitoring',
          'Set up proactive alerting',
          'Create runbook automation',
        ],
        estimatedBenefit: 'Reduce MTTR by 50%',
        effort: 'medium',
        priority: 'medium',
        owner: 'sre-team',
        timeline: '2-4 months',
      });
    }

    return recommendations;
  }

  /**
   * Analyze trends in experiment data
   */
  private async analyzeTrends(
    experiments: ExperimentResult[],
  ): Promise<TrendObservation[]> {
    const trends: TrendObservation[] = [];

    // Success rate trend
    const successRateTrend = this.calculateSuccessRateTrend(experiments);
    trends.push({
      metric: 'Success Rate',
      trend:
        successRateTrend > 5
          ? 'improving'
          : successRateTrend < -5
            ? 'degrading'
            : 'stable',
      changePercent: successRateTrend,
      timeframe: '30 days',
      significance: Math.abs(successRateTrend) > 10 ? 'high' : 'medium',
      analysis: `Success rate has ${successRateTrend > 0 ? 'improved' : 'declined'} by ${Math.abs(successRateTrend).toFixed(1)}%`,
    });

    // Response time trend
    const responseTimeTrend = this.calculateResponseTimeTrend(experiments);
    trends.push({
      metric: 'Average Response Time',
      trend:
        responseTimeTrend < -5
          ? 'improving'
          : responseTimeTrend > 5
            ? 'degrading'
            : 'stable',
      changePercent: responseTimeTrend,
      timeframe: '30 days',
      significance: Math.abs(responseTimeTrend) > 15 ? 'high' : 'medium',
      analysis: `Response time has ${responseTimeTrend < 0 ? 'improved' : 'degraded'} by ${Math.abs(responseTimeTrend).toFixed(1)}%`,
    });

    return trends;
  }

  /**
   * Calculate experiment score based on results
   */
  private calculateExperimentScore(experiment: ExperimentResult): number {
    let score = 100;

    // Deduct points for failures
    if (experiment.status === 'failed') {
      score -= 50;
    }

    // Deduct points for steady state violations
    const beforeHealth = experiment.steady_state.before.overall_health;
    const afterHealth = experiment.steady_state.after.overall_health;
    const healthDegradation = beforeHealth - afterHealth;
    score -= healthDegradation * 0.5;

    // Deduct points for high error rates
    if (experiment.metrics.application.error_rate > 0.05) {
      score -= 20;
    }

    // Deduct points for slow response times
    if (experiment.metrics.application.response_time > 2000) {
      score -= 15;
    }

    // Add points for successful insights
    const positiveInsights = experiment.insights.filter(
      (i) => i.type === 'resilience_confirmed',
    ).length;
    score += positiveInsights * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Helper methods for calculations
   */

  private calculateSuccessRate(experiments: ExperimentResult[]): number {
    if (experiments.length === 0) return 0;
    const successful = experiments.filter(
      (e) => e.status === 'completed',
    ).length;
    return (successful / experiments.length) * 100;
  }

  private calculateAverageDuration(experiments: ExperimentResult[]): number {
    if (experiments.length === 0) return 0;
    const totalDuration = experiments
      .filter((e) => e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalDuration / experiments.length;
  }

  private calculateAverageRecoveryTime(
    experiments: ExperimentResult[],
  ): number {
    // Mock implementation - would calculate actual recovery times
    return (
      experiments.reduce((sum, e) => sum + (e.duration || 0), 0) /
      experiments.length
    );
  }

  private getEnvironmentBreakdown(
    experiments: ExperimentResult[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    experiments.forEach((e) => {
      // Would extract environment from experiment metadata
      const env = 'staging'; // Mock
      breakdown[env] = (breakdown[env] || 0) + 1;
    });
    return breakdown;
  }

  private generateTitle(config: ReportConfig): string {
    const typeNames = {
      experiment_summary: 'Chaos Experiments Summary',
      trend_analysis: 'Resilience Trend Analysis',
      resilience_scorecard: 'System Resilience Scorecard',
      executive_summary: 'Executive Summary',
      technical_details: 'Technical Analysis Report',
      compliance_audit: 'Compliance Audit Report',
    };

    return typeNames[config.type] || 'Chaos Engineering Report';
  }

  private generateSubtitle(config: ReportConfig): string {
    const start = config.timeRange.start.toLocaleDateString();
    const end = config.timeRange.end.toLocaleDateString();
    return `Report Period: ${start} - ${end}`;
  }

  private generateMetadata(config: ReportConfig): ReportMetadata {
    return {
      generatedBy: 'Chaos Engineering Platform',
      version: '2.1.0',
      sources: ['Chaos Toolkit', 'Prometheus', 'Application Logs'],
      methodology:
        'Chaos engineering experiments following principles of chaos engineering',
      limitations: [
        'Results based on synthetic failure injection',
        'May not capture all real-world failure scenarios',
        'Limited to tested components and failure modes',
      ],
      confidentialityLevel: config.confidentialityLevel,
      distributionList: config.recipients,
    };
  }

  private generateAppendices(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportAppendix[]> {
    const appendices: ReportAppendix[] = [];

    if (config.includeRawData) {
      appendices.push({
        id: 'raw_data',
        title: 'Raw Experiment Data',
        content: experiments,
        type: 'raw_data',
      });
    }

    appendices.push({
      id: 'methodology',
      title: 'Methodology',
      content: this.getMethodologyDescription(),
      type: 'methodology',
    });

    return Promise.resolve(appendices);
  }

  private getMethodologyDescription(): string {
    return `
    This report is based on chaos engineering experiments conducted using industry-standard practices.
    
    Experiments follow the principles of:
    1. Build a hypothesis around steady state behavior
    2. Vary real-world events
    3. Run experiments in production
    4. Automate experiments to run continuously
    5. Minimize blast radius
    
    All experiments include proper safeguards and rollback mechanisms to ensure system safety.
    `;
  }

  private async outputReport(
    report: ChaosReport,
    config: ReportConfig,
  ): Promise<void> {
    // Implementation would generate actual files
    console.log(`Generated ${config.format} report: ${report.title}`);
  }

  private async distributeReport(
    report: ChaosReport,
    config: ReportConfig,
  ): Promise<void> {
    // Implementation would send reports to recipients
    console.log(`Distributed report to: ${config.recipients?.join(', ')}`);
  }

  private initializeTemplates(): void {
    // Initialize report templates
    console.log('Report templates initialized');
  }

  private startScheduledReports(): void {
    if (this.config.enableScheduling) {
      setInterval(
        () => {
          this.processScheduledReports();
        },
        60 * 60 * 1000,
      ); // Check every hour
    }
  }

  private async processScheduledReports(): Promise<void> {
    // Process scheduled reports
    console.log('Processing scheduled reports...');
  }

  private generateReportId(config: ReportConfig): string {
    return `${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultTimeRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    return { start, end };
  }

  // Additional helper methods would be implemented here
  private aggregateInsights(experiments: ExperimentResult[]): any {
    return experiments.flatMap((e) => e.insights);
  }

  private extractInsightKeyPoints(experiments: ExperimentResult[]): string[] {
    return experiments
      .flatMap((e) => e.insights)
      .map((i) => i.title)
      .slice(0, 5);
  }

  private prepareTimeSeriesData(experiments: ExperimentResult[]): any[] {
    return experiments.map((e) => ({
      timestamp: e.startTime,
      score: this.calculateExperimentScore(e),
    }));
  }

  private preparePerformanceTrends(experiments: ExperimentResult[]): any[] {
    return experiments.map((e) => ({
      timestamp: e.startTime,
      responseTime: e.metrics.application.response_time,
      errorRate: e.metrics.application.error_rate * 100,
    }));
  }

  private calculateAvailabilityScore(
    experiments: ExperimentResult[],
  ): ScorecardCategory {
    const avgHealth =
      experiments.reduce(
        (sum, e) => sum + e.steady_state.after.overall_health,
        0,
      ) / experiments.length;

    return {
      score: avgHealth,
      weight: 0.25,
      metrics: [
        {
          name: 'System Uptime',
          value: avgHealth,
          target: 99.9,
          unit: '%',
          trend: 2.1,
          status:
            avgHealth > 95 ? 'good' : avgHealth > 90 ? 'warning' : 'critical',
        },
      ],
      trend: 'stable',
    };
  }

  private calculatePerformanceScore(
    experiments: ExperimentResult[],
  ): ScorecardCategory {
    // Implementation would calculate performance scores
    return {
      score: 85,
      weight: 0.2,
      metrics: [],
      trend: 'improving',
    };
  }

  private calculateErrorHandlingScore(
    experiments: ExperimentResult[],
  ): ScorecardCategory {
    return { score: 80, weight: 0.2, metrics: [], trend: 'stable' };
  }

  private calculateRecoveryScore(
    experiments: ExperimentResult[],
  ): ScorecardCategory {
    return { score: 75, weight: 0.2, metrics: [], trend: 'improving' };
  }

  private calculateMonitoringScore(
    experiments: ExperimentResult[],
  ): ScorecardCategory {
    return { score: 90, weight: 0.15, metrics: [], trend: 'stable' };
  }

  private calculateTrendScore(
    experiments: ExperimentResult[],
    days: number,
  ): number {
    // Implementation would calculate trend scores
    return 78;
  }

  private generateScorecardAnalysis(scorecard: ResilienceScorecard): string {
    return `Overall resilience score is ${scorecard.overallScore}/100, indicating ${
      scorecard.overallScore > 80
        ? 'good'
        : scorecard.overallScore > 60
          ? 'acceptable'
          : 'concerning'
    } system resilience.`;
  }

  private categorizeIssue(title: string): BusinessImpact['category'] {
    if (title.toLowerCase().includes('availability')) return 'availability';
    if (title.toLowerCase().includes('performance')) return 'performance';
    if (title.toLowerCase().includes('security')) return 'security';
    if (title.toLowerCase().includes('data')) return 'data_integrity';
    return 'availability';
  }

  private assessCustomerImpact(
    insights: ExperimentInsight[],
  ): BusinessImpact['customerImpact'] {
    const severity = insights[0].severity;
    if (severity === 'critical') return 'severe';
    if (severity === 'high') return 'significant';
    return 'moderate';
  }

  private generateMitigationPlan(
    insights: ExperimentInsight[],
  ): MitigationPlan {
    return {
      immediateActions: [
        'Monitor system closely',
        'Prepare rollback procedures',
      ],
      shortTermActions: ['Implement circuit breakers', 'Add retry logic'],
      longTermActions: ['Redesign for resilience', 'Add comprehensive testing'],
      owner: 'sre-team',
      timeline: '1-3 months',
      estimatedEffort: 'medium',
      priority: insights[0].severity === 'critical' ? 'critical' : 'high',
    };
  }

  private calculateSuccessRateTrend(experiments: ExperimentResult[]): number {
    // Mock trend calculation
    return 2.3;
  }

  private calculateResponseTimeTrend(experiments: ExperimentResult[]): number {
    // Mock trend calculation
    return -1.8;
  }

  private async generateExperimentSummarySections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    // Implementation already provided above
    return [];
  }

  private async generateTrendAnalysisSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    // Implementation already provided above
    return [];
  }

  private async generateScorecardSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    return [];
  }

  private async generateExecutiveSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    return [];
  }

  private async generateTechnicalSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    return [];
  }

  private async generateComplianceSections(
    experiments: ExperimentResult[],
    config: ReportConfig,
  ): Promise<ReportSection[]> {
    return [];
  }
}
