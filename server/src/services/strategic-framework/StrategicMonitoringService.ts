/**
 * Strategic Monitoring Service
 *
 * Provides comprehensive strategic monitoring capabilities including:
 * - Dashboard management
 * - KPI/metric tracking
 * - Progress reporting
 * - Alerting and notifications
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import { getTracer } from '../../otel.js';
import {
  StrategicDashboard,
  DashboardSection,
  StrategicMetric,
  TrendAnalysis,
  MetricThreshold,
  MetricForecast,
  MetricAnnotation,
  DashboardAlert,
  ProgressReport,
  GoalProgress,
  InitiativeProgress,
  MetricSummary,
  RiskSummary,
  DecisionSummary,
  MetricType,
  MetricDataPoint,
} from './types.js';
import { strategicPlanningService } from './StrategicPlanningService.js';

const tracer = getTracer('strategic-monitoring-service');

// In-memory storage
const dashboardsStore = new Map<string, StrategicDashboard>();
const metricsStore = new Map<string, StrategicMetric>();
const reportsStore = new Map<string, ProgressReport>();
const alertsStore = new Map<string, DashboardAlert>();

export class StrategicMonitoringService {
  private static instance: StrategicMonitoringService;

  private constructor() {
    logger.info('StrategicMonitoringService initialized');
  }

  public static getInstance(): StrategicMonitoringService {
    if (!StrategicMonitoringService.instance) {
      StrategicMonitoringService.instance = new StrategicMonitoringService();
    }
    return StrategicMonitoringService.instance;
  }

  // ============================================================================
  // DASHBOARD MANAGEMENT
  // ============================================================================

  async createDashboard(
    input: {
      name: string;
      description: string;
      owner: string;
      viewers?: string[];
      refreshFrequency?: StrategicDashboard['refreshFrequency'];
    },
    userId: string,
  ): Promise<StrategicDashboard> {
    const span = tracer.startSpan('monitoringService.createDashboard');
    try {
      const now = new Date();
      const id = uuidv4();

      const dashboard: StrategicDashboard = {
        id,
        name: input.name,
        description: input.description,
        owner: input.owner,
        viewers: input.viewers || [],
        sections: [],
        refreshFrequency: input.refreshFrequency || 'DAILY',
        lastRefresh: now,
        alerts: [],
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      dashboardsStore.set(id, dashboard);
      logger.info({ dashboardId: id }, 'Dashboard created');

      return dashboard;
    } finally {
      span.end();
    }
  }

  async getDashboard(id: string): Promise<StrategicDashboard | null> {
    const dashboard = dashboardsStore.get(id);
    if (!dashboard) return null;

    // Hydrate alerts
    const alerts = Array.from(alertsStore.values()).filter(
      (a) => dashboard.sections.some((s) => s.metrics.includes(a.metricId)),
    );

    return { ...dashboard, alerts };
  }

  async getAllDashboards(userId?: string): Promise<StrategicDashboard[]> {
    let dashboards = Array.from(dashboardsStore.values());

    if (userId) {
      dashboards = dashboards.filter(
        (d) => d.owner === userId || d.viewers.includes(userId),
      );
    }

    return dashboards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async addDashboardSection(
    dashboardId: string,
    section: Omit<DashboardSection, 'id'>,
    userId: string,
  ): Promise<StrategicDashboard> {
    const dashboard = dashboardsStore.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const newSection: DashboardSection = {
      ...section,
      id: uuidv4(),
    };

    dashboard.sections.push(newSection);
    dashboard.updatedAt = new Date();
    dashboard.updatedBy = userId;
    dashboard.version++;

    dashboardsStore.set(dashboardId, dashboard);
    return dashboard;
  }

  async updateDashboardSection(
    dashboardId: string,
    sectionId: string,
    updates: Partial<DashboardSection>,
    userId: string,
  ): Promise<StrategicDashboard> {
    const dashboard = dashboardsStore.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const sectionIndex = dashboard.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    dashboard.sections[sectionIndex] = {
      ...dashboard.sections[sectionIndex],
      ...updates,
      id: sectionId,
    };
    dashboard.updatedAt = new Date();
    dashboard.updatedBy = userId;
    dashboard.version++;

    dashboardsStore.set(dashboardId, dashboard);
    return dashboard;
  }

  async deleteDashboard(id: string): Promise<boolean> {
    return dashboardsStore.delete(id);
  }

  // ============================================================================
  // METRIC MANAGEMENT
  // ============================================================================

  async createMetric(
    input: {
      name: string;
      description: string;
      type: MetricType;
      category: string;
      owner: string;
      formula?: string;
      dataSource: string;
      unit: string;
      direction: StrategicMetric['direction'];
      baseline: number;
      target: number;
      stretch?: number;
      linkedGoals?: string[];
      linkedObjectives?: string[];
    },
    userId: string,
  ): Promise<StrategicMetric> {
    const span = tracer.startSpan('monitoringService.createMetric');
    try {
      const now = new Date();
      const id = uuidv4();

      const metric: StrategicMetric = {
        id,
        name: input.name,
        description: input.description,
        type: input.type,
        category: input.category,
        owner: input.owner,
        formula: input.formula,
        dataSource: input.dataSource,
        unit: input.unit,
        direction: input.direction,
        baseline: input.baseline,
        target: input.target,
        stretch: input.stretch || input.target * 1.2,
        current: input.baseline,
        previousPeriod: input.baseline,
        trend: {
          direction: 'STABLE',
          rate: 0,
          volatility: 0,
          seasonality: false,
          projectedValue: input.baseline,
          confidenceInterval: [input.baseline, input.baseline],
        },
        thresholds: this.generateDefaultThresholds(input.baseline, input.target, input.direction),
        linkedGoals: input.linkedGoals || [],
        linkedObjectives: input.linkedObjectives || [],
        history: [{ timestamp: now, value: input.baseline }],
        forecast: {
          method: 'linear',
          periods: [],
          accuracy: 0,
          lastUpdated: now,
        },
        annotations: [],
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      metricsStore.set(id, metric);
      logger.info({ metricId: id, name: metric.name }, 'Metric created');

      return metric;
    } finally {
      span.end();
    }
  }

  async getMetric(id: string): Promise<StrategicMetric | null> {
    return metricsStore.get(id) || null;
  }

  async getAllMetrics(filters?: {
    type?: MetricType;
    category?: string;
    owner?: string;
  }): Promise<StrategicMetric[]> {
    let metrics = Array.from(metricsStore.values());

    if (filters) {
      if (filters.type) metrics = metrics.filter((m) => m.type === filters.type);
      if (filters.category) metrics = metrics.filter((m) => m.category === filters.category);
      if (filters.owner) metrics = metrics.filter((m) => m.owner === filters.owner);
    }

    return metrics.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateMetricValue(
    metricId: string,
    value: number,
    note?: string,
    userId?: string,
  ): Promise<StrategicMetric> {
    const span = tracer.startSpan('monitoringService.updateMetricValue');
    try {
      const metric = metricsStore.get(metricId);
      if (!metric) {
        throw new Error(`Metric not found: ${metricId}`);
      }

      const now = new Date();
      const previousValue = metric.current;

      // Add to history
      const dataPoint: MetricDataPoint = { timestamp: now, value, note };
      metric.history.push(dataPoint);

      // Keep last 365 data points
      if (metric.history.length > 365) {
        metric.history = metric.history.slice(-365);
      }

      metric.previousPeriod = previousValue;
      metric.current = value;

      // Update trend analysis
      metric.trend = this.analyzeTrend(metric.history, metric.direction);

      // Update forecast
      metric.forecast = this.generateForecast(metric.history, metric.direction);

      // Check thresholds and create alerts
      await this.checkThresholds(metric);

      metric.updatedAt = now;
      if (userId) metric.updatedBy = userId;
      metric.version++;

      metricsStore.set(metricId, metric);
      logger.info({ metricId, value }, 'Metric value updated');

      return metric;
    } finally {
      span.end();
    }
  }

  async addMetricAnnotation(
    metricId: string,
    annotation: Omit<MetricAnnotation, 'id'>,
  ): Promise<StrategicMetric> {
    const metric = metricsStore.get(metricId);
    if (!metric) {
      throw new Error(`Metric not found: ${metricId}`);
    }

    const newAnnotation: MetricAnnotation = {
      ...annotation,
      id: uuidv4(),
    };

    metric.annotations.push(newAnnotation);
    metric.updatedAt = new Date();
    metric.version++;

    metricsStore.set(metricId, metric);
    return metric;
  }

  async deleteMetric(id: string): Promise<boolean> {
    return metricsStore.delete(id);
  }

  private generateDefaultThresholds(
    baseline: number,
    target: number,
    direction: StrategicMetric['direction'],
  ): MetricThreshold[] {
    const range = Math.abs(target - baseline);
    const isHigherBetter = direction === 'HIGHER_IS_BETTER';

    if (isHigherBetter) {
      return [
        { level: 'CRITICAL', operator: 'LESS_THAN', value: baseline - range * 0.2, color: '#d32f2f', notification: true },
        { level: 'WARNING', operator: 'LESS_THAN', value: baseline, color: '#ff9800', notification: true },
        { level: 'CAUTION', operator: 'LESS_THAN', value: baseline + range * 0.5, color: '#ffeb3b', notification: false },
        { level: 'ON_TRACK', operator: 'GREATER_THAN_OR_EQUAL', value: baseline + range * 0.5, color: '#4caf50', notification: false },
        { level: 'EXCEEDING', operator: 'GREATER_THAN_OR_EQUAL', value: target, color: '#2196f3', notification: true },
      ];
    } else {
      return [
        { level: 'CRITICAL', operator: 'GREATER_THAN', value: baseline + range * 0.2, color: '#d32f2f', notification: true },
        { level: 'WARNING', operator: 'GREATER_THAN', value: baseline, color: '#ff9800', notification: true },
        { level: 'CAUTION', operator: 'GREATER_THAN', value: baseline - range * 0.5, color: '#ffeb3b', notification: false },
        { level: 'ON_TRACK', operator: 'LESS_THAN_OR_EQUAL', value: baseline - range * 0.5, color: '#4caf50', notification: false },
        { level: 'EXCEEDING', operator: 'LESS_THAN_OR_EQUAL', value: target, color: '#2196f3', notification: true },
      ];
    }
  }

  private analyzeTrend(history: MetricDataPoint[], direction: StrategicMetric['direction']): TrendAnalysis {
    if (history.length < 2) {
      return {
        direction: 'STABLE',
        rate: 0,
        volatility: 0,
        seasonality: false,
        projectedValue: history[0]?.value || 0,
        confidenceInterval: [history[0]?.value || 0, history[0]?.value || 0],
      };
    }

    const values = history.map((h) => h.value);
    const n = values.length;

    // Calculate linear regression
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const rate = Math.abs(slope);

    // Determine direction
    const isImproving = direction === 'HIGHER_IS_BETTER' ? slope > 0 : slope < 0;
    const trendDirection: TrendAnalysis['direction'] =
      Math.abs(slope) < 0.01 ? 'STABLE' : isImproving ? 'IMPROVING' : 'DECLINING';

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, v) => sum + Math.pow(v - yMean, 2), 0) / n;
    const volatility = Math.sqrt(variance);

    // Simple projection
    const projectedValue = yMean + slope * n;

    // Confidence interval (simplified 95%)
    const stdError = volatility / Math.sqrt(n);
    const confidenceInterval: [number, number] = [
      projectedValue - 1.96 * stdError,
      projectedValue + 1.96 * stdError,
    ];

    return {
      direction: trendDirection,
      rate,
      volatility,
      seasonality: false, // Would need more sophisticated analysis
      projectedValue,
      confidenceInterval,
    };
  }

  private generateForecast(history: MetricDataPoint[], direction: StrategicMetric['direction']): MetricForecast {
    const now = new Date();

    if (history.length < 3) {
      return {
        method: 'insufficient_data',
        periods: [],
        accuracy: 0,
        lastUpdated: now,
      };
    }

    const trend = this.analyzeTrend(history, direction);
    const periods = [];
    const lastValue = history[history.length - 1].value;

    // Generate 6 period forecast
    for (let i = 1; i <= 6; i++) {
      const predictedValue = lastValue + trend.rate * i * (trend.direction === 'IMPROVING' ? 1 : -1);
      periods.push({
        period: `Period +${i}`,
        predictedValue,
        confidenceLow: predictedValue - trend.volatility * 1.5,
        confidenceHigh: predictedValue + trend.volatility * 1.5,
      });
    }

    return {
      method: 'linear_regression',
      periods,
      accuracy: Math.max(0, 100 - trend.volatility * 10), // Simplified accuracy
      lastUpdated: now,
    };
  }

  private async checkThresholds(metric: StrategicMetric): Promise<void> {
    for (const threshold of metric.thresholds) {
      let breached = false;

      switch (threshold.operator) {
        case 'LESS_THAN':
          breached = metric.current < threshold.value;
          break;
        case 'LESS_THAN_OR_EQUAL':
          breached = metric.current <= threshold.value;
          break;
        case 'EQUAL':
          breached = metric.current === threshold.value;
          break;
        case 'GREATER_THAN_OR_EQUAL':
          breached = metric.current >= threshold.value;
          break;
        case 'GREATER_THAN':
          breached = metric.current > threshold.value;
          break;
      }

      if (breached && threshold.notification) {
        const existingAlert = Array.from(alertsStore.values()).find(
          (a) =>
            a.metricId === metric.id &&
            a.type === 'THRESHOLD_BREACH' &&
            !a.acknowledged,
        );

        if (!existingAlert) {
          const alert: DashboardAlert = {
            id: uuidv4(),
            metricId: metric.id,
            type: 'THRESHOLD_BREACH',
            severity: threshold.level === 'CRITICAL' ? 'CRITICAL' : threshold.level === 'WARNING' ? 'WARNING' : 'INFO',
            message: `${metric.name} is at ${threshold.level} level: ${metric.current} ${metric.unit}`,
            triggered: new Date(),
            acknowledged: false,
          };

          alertsStore.set(alert.id, alert);
          logger.warn({ alertId: alert.id, metricId: metric.id, level: threshold.level }, 'Threshold alert triggered');
        }
      }
    }
  }

  // ============================================================================
  // ALERTING
  // ============================================================================

  async getActiveAlerts(): Promise<DashboardAlert[]> {
    return Array.from(alertsStore.values())
      .filter((a) => !a.acknowledged)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  async acknowledgeAlert(alertId: string, userId: string, resolution?: string): Promise<DashboardAlert> {
    const alert = alertsStore.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    alert.resolution = resolution;

    alertsStore.set(alertId, alert);
    return alert;
  }

  // ============================================================================
  // PROGRESS REPORTING
  // ============================================================================

  async generateProgressReport(
    reportType: ProgressReport['reportType'],
    periodStart: Date,
    periodEnd: Date,
    userId: string,
  ): Promise<ProgressReport> {
    const span = tracer.startSpan('monitoringService.generateProgressReport');
    try {
      const now = new Date();
      const id = uuidv4();

      // Get strategic overview
      const overview = await strategicPlanningService.getStrategicOverview();
      const allGoals = await strategicPlanningService.getAllGoals();

      // Generate goal progress
      const goalProgress: GoalProgress[] = allGoals.map((goal) => ({
        goalId: goal.id,
        goalTitle: goal.title,
        previousProgress: Math.max(0, goal.progress - 5), // Simplified - would track actual history
        currentProgress: goal.progress,
        change: 5, // Simplified
        status: goal.status,
        healthScore: goal.healthScore,
        onTrack: goal.healthScore >= 70,
        blockers: goal.risks.slice(0, 3),
        achievements: goal.successCriteria.filter((c) => c.achieved).map((c) => c.criterion),
      }));

      // Generate initiative progress (simplified)
      const initiativeProgress: InitiativeProgress[] = [];

      // Generate metric summaries
      const metrics = await this.getAllMetrics();
      const metricSummaries: MetricSummary[] = metrics.slice(0, 10).map((m) => ({
        metricId: m.id,
        metricName: m.name,
        previousValue: m.previousPeriod,
        currentValue: m.current,
        change: m.current - m.previousPeriod,
        changePercent: m.previousPeriod !== 0
          ? ((m.current - m.previousPeriod) / m.previousPeriod) * 100
          : 0,
        target: m.target,
        attainment: m.target !== 0 ? (m.current / m.target) * 100 : 0,
        trend: m.trend.direction,
      }));

      const report: ProgressReport = {
        id,
        reportType,
        periodStart,
        periodEnd,
        goals: goalProgress,
        initiatives: initiativeProgress,
        metrics: metricSummaries,
        highlights: this.generateHighlights(goalProgress, metricSummaries),
        challenges: this.generateChallenges(goalProgress, metricSummaries),
        risks: [],
        decisions: [],
        nextPeriodFocus: this.generateNextPeriodFocus(goalProgress),
        executiveSummary: this.generateExecutiveSummary(overview, goalProgress, metricSummaries),
        detailedNarrative: '',
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      reportsStore.set(id, report);
      logger.info({ reportId: id, reportType }, 'Progress report generated');

      return report;
    } finally {
      span.end();
    }
  }

  async getReport(id: string): Promise<ProgressReport | null> {
    return reportsStore.get(id) || null;
  }

  async getAllReports(filters?: {
    reportType?: ProgressReport['reportType'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProgressReport[]> {
    let reports = Array.from(reportsStore.values());

    if (filters) {
      if (filters.reportType) reports = reports.filter((r) => r.reportType === filters.reportType);
      if (filters.startDate) reports = reports.filter((r) => r.periodStart >= filters.startDate!);
      if (filters.endDate) reports = reports.filter((r) => r.periodEnd <= filters.endDate!);
    }

    return reports.sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
  }

  private generateHighlights(goals: GoalProgress[], metrics: MetricSummary[]): string[] {
    const highlights: string[] = [];

    const completedGoals = goals.filter((g) => g.status === 'COMPLETED');
    if (completedGoals.length > 0) {
      highlights.push(`${completedGoals.length} goal(s) completed`);
    }

    const improvingMetrics = metrics.filter((m) => m.trend === 'IMPROVING');
    if (improvingMetrics.length > 0) {
      highlights.push(`${improvingMetrics.length} metric(s) showing positive trend`);
    }

    const exceedingTargets = metrics.filter((m) => m.attainment >= 100);
    if (exceedingTargets.length > 0) {
      highlights.push(`${exceedingTargets.length} metric(s) exceeding targets`);
    }

    return highlights;
  }

  private generateChallenges(goals: GoalProgress[], metrics: MetricSummary[]): string[] {
    const challenges: string[] = [];

    const atRiskGoals = goals.filter((g) => !g.onTrack);
    if (atRiskGoals.length > 0) {
      challenges.push(`${atRiskGoals.length} goal(s) at risk or behind schedule`);
    }

    const decliningMetrics = metrics.filter((m) => m.trend === 'DECLINING');
    if (decliningMetrics.length > 0) {
      challenges.push(`${decliningMetrics.length} metric(s) showing negative trend`);
    }

    const blockedGoals = goals.filter((g) => g.blockers.length > 0);
    if (blockedGoals.length > 0) {
      challenges.push(`${blockedGoals.length} goal(s) have identified blockers`);
    }

    return challenges;
  }

  private generateNextPeriodFocus(goals: GoalProgress[]): string[] {
    const focus: string[] = [];

    const atRiskGoals = goals.filter((g) => !g.onTrack);
    for (const goal of atRiskGoals.slice(0, 3)) {
      focus.push(`Address blockers for: ${goal.goalTitle}`);
    }

    const highProgress = goals.filter((g) => g.currentProgress >= 80 && g.status === 'ACTIVE');
    for (const goal of highProgress.slice(0, 2)) {
      focus.push(`Complete final milestones for: ${goal.goalTitle}`);
    }

    return focus;
  }

  private generateExecutiveSummary(
    overview: Awaited<ReturnType<typeof strategicPlanningService.getStrategicOverview>>,
    goals: GoalProgress[],
    metrics: MetricSummary[],
  ): string {
    const onTrackCount = goals.filter((g) => g.onTrack).length;
    const totalGoals = goals.length;
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + g.currentProgress, 0) / goals.length)
      : 0;

    const improvingMetrics = metrics.filter((m) => m.trend === 'IMPROVING').length;

    return `Strategic Progress Summary: ${onTrackCount}/${totalGoals} goals on track with average progress of ${avgProgress}%. ` +
      `${improvingMetrics} key metrics showing improvement. ` +
      `Health Score: ${overview.averageHealthScore}%. Active initiatives: ${overview.activeGoals}.`;
  }

  // ============================================================================
  // STRATEGIC HEALTH DASHBOARD
  // ============================================================================

  async getStrategicHealthSummary(): Promise<{
    overallHealth: number;
    goalHealth: { healthy: number; warning: number; critical: number };
    metricHealth: { onTrack: number; atRisk: number; offTrack: number };
    alertCount: { critical: number; warning: number; info: number };
    recentChanges: Array<{ type: string; description: string; timestamp: Date }>;
  }> {
    const span = tracer.startSpan('monitoringService.getStrategicHealthSummary');
    try {
      const overview = await strategicPlanningService.getStrategicOverview();
      const metrics = await this.getAllMetrics();
      const alerts = await this.getActiveAlerts();

      // Goal health categorization
      const goals = await strategicPlanningService.getAllGoals();
      const goalHealth = {
        healthy: goals.filter((g) => g.healthScore >= 70).length,
        warning: goals.filter((g) => g.healthScore >= 40 && g.healthScore < 70).length,
        critical: goals.filter((g) => g.healthScore < 40).length,
      };

      // Metric health categorization
      const metricHealth = {
        onTrack: metrics.filter((m) => {
          const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
          return attainment >= 80;
        }).length,
        atRisk: metrics.filter((m) => {
          const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
          return attainment >= 50 && attainment < 80;
        }).length,
        offTrack: metrics.filter((m) => {
          const attainment = m.target !== 0 ? (m.current / m.target) * 100 : 0;
          return attainment < 50;
        }).length,
      };

      // Alert counts
      const alertCount = {
        critical: alerts.filter((a) => a.severity === 'CRITICAL').length,
        warning: alerts.filter((a) => a.severity === 'WARNING').length,
        info: alerts.filter((a) => a.severity === 'INFO').length,
      };

      // Recent changes (simplified - would track actual changes)
      const recentChanges: Array<{ type: string; description: string; timestamp: Date }> = [];

      return {
        overallHealth: overview.averageHealthScore,
        goalHealth,
        metricHealth,
        alertCount,
        recentChanges,
      };
    } finally {
      span.end();
    }
  }
}

export const strategicMonitoringService = StrategicMonitoringService.getInstance();
