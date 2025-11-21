/**
 * Reporting Service
 * Manages reports, dashboards, and forecasting
 */

import { EventEmitter } from 'events';
import type {
  Report,
  ReportType,
  ReportCategory,
  ReportConfig,
  DateRange,
  Dashboard,
  DashboardWidget,
  Forecast,
  ForecastPeriod,
  ForecastQuota,
  ForecastCategory,
  FilterGroup,
} from '../models/types';

export interface ReportCreateInput {
  name: string;
  description?: string;
  type: ReportType;
  category: ReportCategory;
  config: ReportConfig;
  filters?: FilterGroup;
  ownerId: string;
  isShared?: boolean;
}

export interface ReportResult {
  reportId: string;
  generatedAt: Date;
  data: ReportData;
  summary: ReportSummary;
}

export interface ReportData {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  aggregation?: string;
}

export interface ReportSummary {
  totalRows: number;
  dateRange: { start: Date; end: Date };
  highlights: ReportHighlight[];
}

export interface ReportHighlight {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

export interface DashboardCreateInput {
  name: string;
  description?: string;
  widgets: Omit<DashboardWidget, 'id'>[];
  ownerId: string;
  isShared?: boolean;
}

export interface ForecastCreateInput {
  name: string;
  period: ForecastPeriod;
  startDate: Date;
  endDate: Date;
  pipelineId: string;
  ownerId: string;
}

export interface SalesMetrics {
  revenue: MetricValue;
  deals: MetricValue;
  avgDealSize: MetricValue;
  winRate: MetricValue;
  salesCycle: MetricValue;
  pipeline: MetricValue;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  target?: number;
  targetPercent?: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  value: number;
  deals: number;
  quota?: number;
  quotaPercent?: number;
}

export class ReportingService extends EventEmitter {
  private reports: Map<string, Report> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private forecasts: Map<string, Forecast> = new Map();

  constructor() {
    super();
    this.initializeDefaultDashboard();
  }

  private initializeDefaultDashboard(): void {
    const dashboard: Dashboard = {
      id: 'dashboard_default',
      name: 'Sales Dashboard',
      description: 'Overview of sales performance',
      widgets: [
        {
          id: 'w1',
          type: 'metric',
          config: {
            title: 'Revenue (This Month)',
            metric: 'revenue',
            aggregation: 'sum',
            showTrend: true,
            dateRange: { type: 'relative', period: 'this_month' },
          },
          position: { x: 0, y: 0, width: 3, height: 2 },
        },
        {
          id: 'w2',
          type: 'metric',
          config: {
            title: 'Deals Won',
            metric: 'deals_won',
            aggregation: 'count',
            showTrend: true,
            dateRange: { type: 'relative', period: 'this_month' },
          },
          position: { x: 3, y: 0, width: 3, height: 2 },
        },
        {
          id: 'w3',
          type: 'metric',
          config: {
            title: 'Win Rate',
            metric: 'win_rate',
            aggregation: 'avg',
            displayFormat: 'percentage',
            showTrend: true,
            dateRange: { type: 'relative', period: 'this_month' },
          },
          position: { x: 6, y: 0, width: 3, height: 2 },
        },
        {
          id: 'w4',
          type: 'metric',
          config: {
            title: 'Pipeline Value',
            metric: 'pipeline_value',
            aggregation: 'sum',
            showTrend: true,
          },
          position: { x: 9, y: 0, width: 3, height: 2 },
        },
        {
          id: 'w5',
          type: 'pipeline',
          config: { title: 'Pipeline Overview' },
          position: { x: 0, y: 2, width: 8, height: 4 },
        },
        {
          id: 'w6',
          type: 'leaderboard',
          config: {
            title: 'Top Performers',
            metric: 'revenue',
            dateRange: { type: 'relative', period: 'this_month' },
          },
          position: { x: 8, y: 2, width: 4, height: 4 },
        },
        {
          id: 'w7',
          type: 'chart',
          config: {
            title: 'Revenue Trend',
            metric: 'revenue',
            dateRange: { type: 'relative', period: 'last_quarter' },
          },
          position: { x: 0, y: 6, width: 6, height: 4 },
        },
        {
          id: 'w8',
          type: 'forecast',
          config: { title: 'Forecast' },
          position: { x: 6, y: 6, width: 6, height: 4 },
        },
      ],
      layout: { columns: 12, rowHeight: 60 },
      isDefault: true,
      ownerId: 'system',
      isShared: true,
      sharedWith: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboard.id, dashboard);
  }

  // Report Management

  /**
   * Create report
   */
  async createReport(input: ReportCreateInput): Promise<Report> {
    const id = this.generateId('rpt');
    const now = new Date();

    const report: Report = {
      id,
      name: input.name,
      description: input.description,
      type: input.type,
      category: input.category,
      config: input.config,
      filters: input.filters || { operator: 'and', conditions: [] },
      ownerId: input.ownerId,
      isShared: input.isShared || false,
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
    };

    this.reports.set(id, report);
    return report;
  }

  /**
   * Get report by ID
   */
  async getReport(id: string): Promise<Report | null> {
    return this.reports.get(id) || null;
  }

  /**
   * Get all reports
   */
  async getReports(ownerId?: string, category?: ReportCategory): Promise<Report[]> {
    let reports = Array.from(this.reports.values());

    if (ownerId) {
      reports = reports.filter((r) => r.ownerId === ownerId || r.isShared);
    }
    if (category) {
      reports = reports.filter((r) => r.category === category);
    }

    return reports;
  }

  /**
   * Run report
   */
  async runReport(reportId: string): Promise<ReportResult> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // Calculate date range
    const dateRange = this.resolveDateRange(report.config.dateRange);

    // Generate mock data based on report type
    const data = this.generateReportData(report, dateRange);

    // Update last run time
    report.lastRunAt = new Date();
    this.reports.set(reportId, report);

    return {
      reportId,
      generatedAt: new Date(),
      data,
      summary: {
        totalRows: data.rows.length,
        dateRange,
        highlights: this.generateHighlights(data, report.config.compareToRange),
      },
    };
  }

  /**
   * Delete report
   */
  async deleteReport(id: string): Promise<void> {
    this.reports.delete(id);
  }

  // Dashboard Management

  /**
   * Create dashboard
   */
  async createDashboard(input: DashboardCreateInput): Promise<Dashboard> {
    const id = this.generateId('dash');
    const now = new Date();

    const widgets: DashboardWidget[] = input.widgets.map((w, index) => ({
      ...w,
      id: `widget_${index}`,
    }));

    const dashboard: Dashboard = {
      id,
      name: input.name,
      description: input.description,
      widgets,
      layout: { columns: 12, rowHeight: 60 },
      isDefault: false,
      ownerId: input.ownerId,
      isShared: input.isShared || false,
      sharedWith: [],
      createdAt: now,
      updatedAt: now,
    };

    this.dashboards.set(id, dashboard);
    return dashboard;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(id: string): Promise<Dashboard | null> {
    return this.dashboards.get(id) || null;
  }

  /**
   * Get all dashboards
   */
  async getDashboards(ownerId?: string): Promise<Dashboard[]> {
    let dashboards = Array.from(this.dashboards.values());

    if (ownerId) {
      dashboards = dashboards.filter((d) => d.ownerId === ownerId || d.isShared);
    }

    return dashboards;
  }

  /**
   * Get default dashboard
   */
  async getDefaultDashboard(): Promise<Dashboard | null> {
    return Array.from(this.dashboards.values()).find((d) => d.isDefault) || null;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    id: string,
    updates: Partial<Omit<Dashboard, 'id' | 'createdAt'>>
  ): Promise<Dashboard> {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      throw new Error(`Dashboard ${id} not found`);
    }

    const updated = { ...dashboard, ...updates, updatedAt: new Date() };
    this.dashboards.set(id, updated);
    return updated;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(id: string): Promise<void> {
    this.dashboards.delete(id);
  }

  // Forecasting

  /**
   * Create forecast
   */
  async createForecast(input: ForecastCreateInput): Promise<Forecast> {
    const id = this.generateId('fcst');
    const now = new Date();

    const forecast: Forecast = {
      id,
      name: input.name,
      period: input.period,
      startDate: input.startDate,
      endDate: input.endDate,
      pipelineId: input.pipelineId,
      quotas: [],
      categories: [
        { name: 'commit', amount: 0, dealIds: [] },
        { name: 'best_case', amount: 0, dealIds: [] },
        { name: 'pipeline', amount: 0, dealIds: [] },
        { name: 'omitted', amount: 0, dealIds: [] },
      ],
      status: 'draft',
      ownerId: input.ownerId,
      createdAt: now,
      updatedAt: now,
    };

    this.forecasts.set(id, forecast);
    return forecast;
  }

  /**
   * Get forecast by ID
   */
  async getForecast(id: string): Promise<Forecast | null> {
    return this.forecasts.get(id) || null;
  }

  /**
   * Update forecast categories
   */
  async updateForecastCategories(
    id: string,
    categories: ForecastCategory[]
  ): Promise<Forecast> {
    const forecast = this.forecasts.get(id);
    if (!forecast) {
      throw new Error(`Forecast ${id} not found`);
    }

    forecast.categories = categories;
    forecast.updatedAt = new Date();
    this.forecasts.set(id, forecast);

    return forecast;
  }

  /**
   * Set quota for user
   */
  async setQuota(forecastId: string, userId: string, amount: number): Promise<Forecast> {
    const forecast = this.forecasts.get(forecastId);
    if (!forecast) {
      throw new Error(`Forecast ${forecastId} not found`);
    }

    const existingQuota = forecast.quotas.find((q) => q.userId === userId);
    if (existingQuota) {
      existingQuota.amount = amount;
    } else {
      forecast.quotas.push({
        userId,
        amount,
        achieved: 0,
        percentage: 0,
      });
    }

    forecast.updatedAt = new Date();
    this.forecasts.set(forecastId, forecast);

    return forecast;
  }

  /**
   * Submit forecast for approval
   */
  async submitForecast(id: string): Promise<Forecast> {
    const forecast = this.forecasts.get(id);
    if (!forecast) {
      throw new Error(`Forecast ${id} not found`);
    }

    forecast.status = 'submitted';
    forecast.submittedAt = new Date();
    forecast.updatedAt = new Date();
    this.forecasts.set(id, forecast);

    this.emit('forecast:submitted', forecast);

    return forecast;
  }

  /**
   * Approve forecast
   */
  async approveForecast(id: string, approverId: string): Promise<Forecast> {
    const forecast = this.forecasts.get(id);
    if (!forecast) {
      throw new Error(`Forecast ${id} not found`);
    }

    forecast.status = 'approved';
    forecast.approvedAt = new Date();
    forecast.approvedById = approverId;
    forecast.updatedAt = new Date();
    this.forecasts.set(id, forecast);

    this.emit('forecast:approved', forecast);

    return forecast;
  }

  // Metrics & Analytics

  /**
   * Get sales metrics
   */
  async getSalesMetrics(
    userId?: string,
    dateRange?: DateRange
  ): Promise<SalesMetrics> {
    const range = dateRange || { type: 'relative', period: 'this_month' };
    const { start, end } = this.resolveDateRange(range);

    // Calculate previous period for comparison
    const periodMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodMs);
    const prevEnd = new Date(end.getTime() - periodMs);

    // Mock data - would pull from actual services
    const current = {
      revenue: 125000,
      deals: 15,
      avgDealSize: 8333,
      winRate: 32,
      salesCycle: 28,
      pipeline: 450000,
    };

    const previous = {
      revenue: 110000,
      deals: 12,
      avgDealSize: 9166,
      winRate: 28,
      salesCycle: 32,
      pipeline: 380000,
    };

    const createMetric = (current: number, previous: number, target?: number): MetricValue => ({
      current,
      previous,
      change: current - previous,
      changePercent: previous > 0 ? ((current - previous) / previous) * 100 : 0,
      target,
      targetPercent: target ? (current / target) * 100 : undefined,
    });

    return {
      revenue: createMetric(current.revenue, previous.revenue, 150000),
      deals: createMetric(current.deals, previous.deals, 20),
      avgDealSize: createMetric(current.avgDealSize, previous.avgDealSize),
      winRate: createMetric(current.winRate, previous.winRate, 35),
      salesCycle: createMetric(current.salesCycle, previous.salesCycle),
      pipeline: createMetric(current.pipeline, previous.pipeline),
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    metric: 'revenue' | 'deals' | 'activities',
    dateRange?: DateRange,
    limit = 10
  ): Promise<LeaderboardEntry[]> {
    // Mock leaderboard data
    const leaders: LeaderboardEntry[] = [
      { userId: 'user1', userName: 'Alice Johnson', rank: 1, value: 45000, deals: 6, quota: 50000, quotaPercent: 90 },
      { userId: 'user2', userName: 'Bob Smith', rank: 2, value: 38000, deals: 5, quota: 45000, quotaPercent: 84 },
      { userId: 'user3', userName: 'Carol Williams', rank: 3, value: 32000, deals: 4, quota: 40000, quotaPercent: 80 },
      { userId: 'user4', userName: 'David Brown', rank: 4, value: 28000, deals: 4, quota: 35000, quotaPercent: 80 },
      { userId: 'user5', userName: 'Eve Davis', rank: 5, value: 22000, deals: 3, quota: 30000, quotaPercent: 73 },
    ];

    return leaders.slice(0, limit);
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(
    userId?: string,
    dateRange?: DateRange
  ): Promise<{
    calls: MetricValue;
    emails: MetricValue;
    meetings: MetricValue;
    tasks: MetricValue;
  }> {
    // Mock activity data
    return {
      calls: { current: 45, previous: 38, change: 7, changePercent: 18.4 },
      emails: { current: 120, previous: 105, change: 15, changePercent: 14.3 },
      meetings: { current: 12, previous: 10, change: 2, changePercent: 20 },
      tasks: { current: 35, previous: 40, change: -5, changePercent: -12.5 },
    };
  }

  /**
   * Get conversion funnel
   */
  async getConversionFunnel(
    pipelineId: string,
    dateRange?: DateRange
  ): Promise<{
    stages: { name: string; count: number; value: number; conversionRate: number }[];
    overallConversion: number;
  }> {
    // Mock funnel data
    const stages = [
      { name: 'Lead', count: 100, value: 500000, conversionRate: 100 },
      { name: 'Qualified', count: 60, value: 350000, conversionRate: 60 },
      { name: 'Proposal', count: 35, value: 220000, conversionRate: 58 },
      { name: 'Negotiation', count: 20, value: 150000, conversionRate: 57 },
      { name: 'Won', count: 12, value: 95000, conversionRate: 60 },
    ];

    return {
      stages,
      overallConversion: 12, // 12% of leads converted to won
    };
  }

  // Helper Methods

  private resolveDateRange(range: DateRange): { start: Date; end: Date } {
    if (range.type === 'absolute' && range.startDate && range.endDate) {
      return { start: range.startDate, end: range.endDate };
    }

    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (range.period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'yesterday':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'this_week':
        const dayOfWeek = now.getDay();
        start = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        break;
      case 'last_week':
        const lastWeekEnd = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        lastWeekEnd.setHours(0, 0, 0, 0);
        end = lastWeekEnd;
        start = new Date(lastWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const q = lastQuarter < 0 ? 3 : lastQuarter;
        start = new Date(year, q * 3, 1);
        end = new Date(year, q * 3 + 3, 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private generateReportData(
    report: Report,
    dateRange: { start: Date; end: Date }
  ): ReportData {
    // Generate mock data based on report category
    const columns: ReportColumn[] = [];
    const rows: Record<string, unknown>[] = [];

    switch (report.category) {
      case 'deals':
        columns.push(
          { field: 'name', label: 'Deal Name', type: 'string' },
          { field: 'value', label: 'Value', type: 'currency' },
          { field: 'stage', label: 'Stage', type: 'string' },
          { field: 'owner', label: 'Owner', type: 'string' },
          { field: 'closeDate', label: 'Close Date', type: 'date' }
        );
        // Add mock rows
        for (let i = 0; i < 10; i++) {
          rows.push({
            name: `Deal ${i + 1}`,
            value: Math.floor(Math.random() * 50000) + 5000,
            stage: ['Lead', 'Qualified', 'Proposal', 'Negotiation'][Math.floor(Math.random() * 4)],
            owner: ['Alice', 'Bob', 'Carol'][Math.floor(Math.random() * 3)],
            closeDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
          });
        }
        break;

      case 'activities':
        columns.push(
          { field: 'type', label: 'Type', type: 'string' },
          { field: 'subject', label: 'Subject', type: 'string' },
          { field: 'contact', label: 'Contact', type: 'string' },
          { field: 'date', label: 'Date', type: 'date' },
          { field: 'outcome', label: 'Outcome', type: 'string' }
        );
        break;

      case 'contacts':
        columns.push(
          { field: 'name', label: 'Name', type: 'string' },
          { field: 'email', label: 'Email', type: 'string' },
          { field: 'company', label: 'Company', type: 'string' },
          { field: 'score', label: 'Lead Score', type: 'number' },
          { field: 'status', label: 'Status', type: 'string' }
        );
        break;

      default:
        columns.push(
          { field: 'metric', label: 'Metric', type: 'string' },
          { field: 'value', label: 'Value', type: 'number' }
        );
    }

    return { columns, rows };
  }

  private generateHighlights(
    data: ReportData,
    compareRange?: DateRange
  ): ReportHighlight[] {
    const highlights: ReportHighlight[] = [];

    if (data.rows.length > 0) {
      // Calculate totals for numeric columns
      for (const col of data.columns) {
        if (col.type === 'number' || col.type === 'currency') {
          const total = data.rows.reduce((sum, row) => {
            const val = row[col.field];
            return sum + (typeof val === 'number' ? val : 0);
          }, 0);

          highlights.push({
            label: `Total ${col.label}`,
            value: total,
            change: Math.floor(Math.random() * 20) - 10,
            changeType: Math.random() > 0.5 ? 'increase' : 'decrease',
          });
        }
      }
    }

    return highlights.slice(0, 4);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const reportingService = new ReportingService();
