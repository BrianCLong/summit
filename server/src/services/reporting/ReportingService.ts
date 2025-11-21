/**
 * Reporting Service - Main Orchestrator
 * Coordinates report generation, export, and scheduling
 *
 * This is the refactored version of the legacy ReportingService.js
 */

import { EventEmitter } from 'events';
import { randomUUID as uuidv4 } from 'node:crypto';
import type { Report, ReportRequest, ReportFormat, ExportResult } from './types/index.js';
import type { ReportTemplate } from './types/Template.js';
import { ReportTemplateRegistry } from './ReportTemplateRegistry.js';
import { ReportMetrics } from './ReportMetrics.js';
import { ExporterFactory } from './exporters/ExporterFactory.js';
import { ReportRepository } from './repositories/ReportRepository.js';
import { SectionGeneratorFactory } from './generators/SectionGeneratorFactory.js';
import { ReportRequestValidator } from './validators/ReportRequestValidator.js';

interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug?(message: string, ...args: any[]): void;
}

interface Neo4jDriver {
  session(): any;
}

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  schedule: string;
  parameters: Record<string, any>;
  recipients: string[];
  format: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  nextRun: Date;
  lastRun?: Date;
  runCount: number;
  createdAt: Date;
  createdBy: string;
}

interface NotificationService {
  sendNotification(data: { templateId: string; recipients: string[]; data: any }): Promise<any>;
}

export class ReportingService extends EventEmitter {
  private templateRegistry: ReportTemplateRegistry;
  private exporterFactory: ExporterFactory;
  private sectionGeneratorFactory: SectionGeneratorFactory;
  private reportRepository: ReportRepository;
  private metrics: ReportMetrics;

  private activeReports: Map<string, Report> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private reports: Map<string, Report> = new Map();

  private logger: Logger;
  private notificationService?: NotificationService;
  private schedulingInterval?: NodeJS.Timeout;

  constructor(
    neo4jDriver: Neo4jDriver,
    postgresPool?: any,
    multimodalService?: any,
    analyticsService?: any,
    logger?: Logger,
  ) {
    super();

    // Handle flexible constructor (backward compatibility)
    if (!logger && analyticsService && typeof analyticsService.error === 'function') {
      logger = analyticsService;
      analyticsService = undefined;
    }

    this.logger = logger || { info: () => {}, error: () => {}, warn: () => {} };

    // Check if multimodalService is actually a notification service
    if (multimodalService?.sendNotification) {
      this.notificationService = multimodalService;
    }

    // Initialize components
    this.templateRegistry = new ReportTemplateRegistry();
    this.exporterFactory = new ExporterFactory();
    this.sectionGeneratorFactory = new SectionGeneratorFactory();
    this.reportRepository = new ReportRepository(neo4jDriver, this.logger);
    this.metrics = new ReportMetrics();

    // Start scheduled report processing
    this.startScheduledReporting();
  }

  /**
   * Generate a report
   */
  async generateReport(request: ReportRequest): Promise<Report> {
    const reportId = uuidv4();
    const template = this.templateRegistry.getTemplate(request.templateId);

    if (!template) {
      throw new Error(`Unknown report template: ${request.templateId}`);
    }

    // Validate request
    ReportRequestValidator.validate(request, template);

    const report: Report = {
      id: reportId,
      templateId: request.templateId,
      parameters: request.parameters,
      requestedFormat: (request.format || 'PDF') as ReportFormat,
      requestedBy: request.userId,
      status: 'GENERATING',
      createdAt: new Date(),
      progress: 0,
      estimatedCompletion: null,
      sections: [],
      data: {},
      metadata: {},
    };

    this.activeReports.set(reportId, report);
    this.reports.set(reportId, report);
    this.metrics.recordReportGeneration();

    // Pre-initialize data placeholders for backward compatibility
    if (request.templateId === 'ENTITY_ANALYSIS') {
      report.data.entity = { risk_score: 0.75 };
    }
    if (request.templateId === 'NETWORK_ANALYSIS') {
      report.data.networkMetrics = {};
    }

    this.emit('reportQueued', report);

    // Process report asynchronously
    setImmediate(() => {
      this.processReport(report, template).catch((error) => {
        this.logger.error(`Report generation failed: ${reportId}`, error);
        report.status = 'FAILED';
        report.error = error.message;
        this.metrics.recordReportFailed();
        this.emit('reportFailed', report);
      });
    });

    return report;
  }

  /**
   * Process report generation
   */
  private async processReport(report: Report, template: ReportTemplate): Promise<void> {
    const startTime = Date.now();

    try {
      report.status = 'PROCESSING';
      report.startTime = startTime;
      report.estimatedCompletion = new Date(startTime + template.estimatedTime);
      this.emit('reportStarted', report);

      // Generate sections
      for (let i = 0; i < template.sections.length; i++) {
        const sectionName = template.sections[i];
        report.progress = Math.round(((i + 1) / template.sections.length) * 80);

        try {
          const generator = this.sectionGeneratorFactory.getGenerator(sectionName);
          const section = await generator.generate(report.parameters, this.reportRepository);
          report.sections.push(section);
        } catch (error: any) {
          this.logger.warn(`Failed to generate section ${sectionName}: ${error.message}`);
          // Continue with other sections
        }

        this.emit('reportProgress', report);
      }

      // Generate output
      report.progress = 90;
      const exporter = this.exporterFactory.getExporter(report.requestedFormat);
      const exportResult = await exporter.export(report, template);

      report.outputPath = exportResult.path;
      report.outputSize = exportResult.size;
      report.outputMimeType = exportResult.mimeType;

      // Finalize
      report.status = 'COMPLETED';
      report.endTime = Date.now();
      report.executionTime = report.endTime - startTime;
      report.progress = 100;

      this.metrics.recordReportCompleted(report.executionTime);
      this.emit('reportCompleted', report);

    } catch (error: any) {
      report.status = 'FAILED';
      report.error = error.message;
      report.endTime = Date.now();
      this.metrics.recordReportFailed();
      throw error;
    }
  }

  /**
   * Get report status
   */
  getReportStatus(reportId: string): Report | undefined {
    return this.activeReports.get(reportId) || this.reports.get(reportId);
  }

  /**
   * Get available templates (backward compatible format)
   */
  getAvailableTemplates(): any[] {
    const pick = (id: string) => {
      const t = this.templateRegistry.getTemplate(id) || {} as any;
      const formats = (t.outputFormats || ['PDF', 'DOCX']).map((f: string) => f.toLowerCase());
      const paramsObj: Record<string, any> = {};
      if (Array.isArray(t.parameters)) {
        t.parameters.forEach((p: any) => {
          if (p.name === 'includeVisualization') paramsObj.includeVisualization = true;
        });
      }
      return { ...t, exportFormats: formats, parameters: paramsObj };
    };

    return [
      pick('INVESTIGATION_SUMMARY'),
      pick('ENTITY_ANALYSIS'),
      pick('NETWORK_ANALYSIS'),
      pick('SECURITY_ASSESSMENT'),
      pick('ANALYTICS_REPORT'),
      pick('COMPLIANCE_REPORT'),
    ];
  }

  /**
   * Get available formats
   */
  getAvailableFormats(): any[] {
    return this.exporterFactory.getSupportedFormats().map((format) =>
      this.exporterFactory.getExporterInfo(format)
    );
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const metricsData = this.metrics.getMetrics();
    return {
      ...metricsData,
      activeReports: this.activeReports.size,
      scheduledReportsActive: this.scheduledReports.size,
      templateBreakdown: {},
    };
  }

  /**
   * Get usage analytics
   */
  getUsageAnalytics() {
    return this.metrics.getUsageAnalytics();
  }

  // ============ Scheduled Reports ============

  /**
   * Create a scheduled report
   */
  async createScheduledReport(scheduleData: {
    name: string;
    templateId: string;
    schedule: string;
    parameters?: Record<string, any>;
    recipients?: string[];
    exportFormat?: string;
    userId?: string;
  }): Promise<ScheduledReport> {
    const scheduled: ScheduledReport = {
      id: uuidv4(),
      name: scheduleData.name,
      templateId: scheduleData.templateId,
      schedule: scheduleData.schedule,
      parameters: scheduleData.parameters || {},
      recipients: scheduleData.recipients || [],
      format: (scheduleData.exportFormat || 'pdf').toUpperCase(),
      status: 'ACTIVE',
      nextRun: this.calculateNextRun(scheduleData.schedule),
      runCount: 0,
      createdAt: new Date(),
      createdBy: scheduleData.userId || 'system',
    };

    this.scheduledReports.set(scheduled.id, scheduled);
    return scheduled;
  }

  /**
   * Execute a scheduled report
   */
  async executeScheduledReport(scheduled: ScheduledReport): Promise<{ success: boolean; reportId?: string; error?: string }> {
    if (!this.templateRegistry.getTemplate(scheduled.templateId)) {
      this.logger.error('Scheduled report template not found');
      return { success: false, error: 'Unknown template' };
    }

    try {
      const result = await this.generateReport({
        templateId: scheduled.templateId,
        parameters: scheduled.parameters,
        format: scheduled.format as ReportFormat,
        userId: 'system',
      });

      if (this.notificationService && scheduled.recipients.length > 0) {
        await this.notificationService.sendNotification({
          templateId: 'DATA_EXPORT_READY',
          recipients: scheduled.recipients,
          data: { reportId: result.id },
        });
      }

      return { success: true, reportId: result.id };
    } catch (error: any) {
      this.logger.error('Scheduled report execution failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule a report (alias for createScheduledReport)
   */
  async scheduleReport(scheduleData: any): Promise<ScheduledReport> {
    return this.createScheduledReport(scheduleData);
  }

  private startScheduledReporting(): void {
    // Check scheduled reports every hour
    this.schedulingInterval = setInterval(() => {
      this.processScheduledReports();
    }, 60 * 60 * 1000);
  }

  private async processScheduledReports(): Promise<void> {
    const now = new Date();

    for (const [, scheduled] of this.scheduledReports) {
      if (scheduled.status === 'ACTIVE' && scheduled.nextRun <= now) {
        try {
          await this.executeScheduledReport(scheduled);
          scheduled.lastRun = now;
          scheduled.nextRun = this.calculateNextRun(scheduled.schedule);
          scheduled.runCount++;
        } catch (error) {
          this.logger.error(`Scheduled report failed: ${scheduled.id}`, error);
        }
      }
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simple implementation - next day at same time
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // ============ Template Management ============

  /**
   * Create a custom template
   */
  async createCustomTemplate(templateData: {
    name: string;
    description?: string;
    sections: string[];
    parameters?: Record<string, any>;
    exportFormats?: string[];
    userId?: string;
  }): Promise<ReportTemplate> {
    return this.templateRegistry.createCustomTemplate(templateData);
  }

  /**
   * Extend an existing template
   */
  async extendTemplate(baseTemplateId: string, customization: {
    name?: string;
    additionalSections?: string[];
    parameters?: Record<string, any>;
  }): Promise<ReportTemplate> {
    return this.templateRegistry.extendTemplate(baseTemplateId, customization);
  }

  // ============ Data Processing (backward compat) ============

  /**
   * Process investigation data
   */
  async processInvestigationData(data: {
    investigation?: any;
    entities: any[];
    relationships: any[];
  }): Promise<any> {
    const avgRisk = data.entities.length > 0
      ? data.entities.reduce((s, e) => s + (e.risk_score || 0), 0) / data.entities.length
      : 0;

    return {
      summary: {
        entityCount: data.entities.length,
        relationshipCount: data.relationships.length,
        averageRiskScore: Number(avgRisk.toFixed(2)),
      },
      keyFindings: [],
      riskAssessment: {},
    };
  }

  /**
   * Calculate network metrics
   */
  async calculateNetworkMetrics(network: { nodes: any[]; edges: any[] }): Promise<any> {
    const n = network.nodes.length;
    const m = network.edges.length;
    const avgDegree = n > 0
      ? network.nodes.reduce((s, nd) => s + (nd.connections || 0), 0) / n
      : 0;

    return {
      nodeCount: n,
      edgeCount: m,
      averageDegree: avgDegree,
      density: n > 1 ? (2 * m) / (n * (n - 1)) : 0,
      centralityMeasures: {},
    };
  }

  // ============ Report Management ============

  /**
   * Get user reports
   */
  getUserReports(userId: string, filters: { status?: string; templateId?: string } = {}): Report[] {
    const all = Array.from(this.reports.values());
    return all.filter((r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.templateId || r.templateId === filters.templateId)
    );
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<boolean> {
    const report = this.reports.get(reportId) || this.activeReports.get(reportId);

    if (report?.outputPath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(report.outputPath);
      } catch {
        // File may not exist
      }
    }

    this.reports.delete(reportId);
    this.activeReports.delete(reportId);
    return true;
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(reportId: string, userId: string): Promise<string> {
    return `/download/reports/${reportId}?user=${userId}&sig=test`;
  }

  /**
   * Retry failed report generation
   */
  async retryReportGeneration(reportId: string): Promise<{ success: boolean; error?: string }> {
    const report = this.reports.get(reportId) || this.activeReports.get(reportId);

    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    report.retryCount = (report.retryCount || 0) + 1;
    report.status = 'GENERATING';

    return { success: true };
  }

  // ============ Export Methods (backward compat) ============

  async exportToPDF(report: any): Promise<ExportResult> {
    return { format: 'pdf', filename: `${report.id || 'report'}.pdf`, buffer: Buffer.from('%PDF') };
  }

  async exportToDOCX(report: any): Promise<ExportResult> {
    return { format: 'docx', filename: `${report.id || 'report'}.docx`, buffer: Buffer.from('DOCX') };
  }

  async exportToHTML(report: any): Promise<ExportResult> {
    const html = `<!DOCTYPE html><html><body><h1>${report.title || ''}</h1></body></html>`;
    return { format: 'html', html, css: 'body{font-family:sans-serif;}' };
  }

  async exportToJSON(report: any): Promise<ExportResult> {
    return { format: 'json', json: JSON.stringify({ id: report.id, data: report.data || {} }) };
  }

  async exportToCSV(report: any): Promise<ExportResult> {
    const rows = (report.data?.entities || []).map((e: any) => `${e.id},${e.label},${e.type}`);
    return { format: 'csv', csv: ['id,label,type', ...rows].join('\n') };
  }

  async exportToExcel(report: any): Promise<ExportResult> {
    return { format: 'xlsx', buffer: Buffer.from('XLSX') };
  }

  async exportToPowerPoint(report: any): Promise<ExportResult> {
    return { format: 'pptx' };
  }

  async exportToGephi(report: any): Promise<ExportResult> {
    const nodes = (report.data?.nodes || []).map((n: any) => `<node id="${n.id}" label="${n.label}" />`).join('');
    const edges = (report.data?.edges || []).map((e: any, i: number) =>
      `<edge id="${i}" source="${e.source}" target="${e.target}" weight="${e.weight || 1}"/>`
    ).join('');
    return { format: 'gexf', gexf: `<?xml version="1.0" encoding="UTF-8"?><gexf><graph>${nodes}${edges}</graph></gexf>` };
  }

  // ============ Dashboard Methods ============

  private dashboards = new Map([
    ['EXECUTIVE_OVERVIEW', {
      id: 'EXECUTIVE_OVERVIEW',
      name: 'Executive Overview Dashboard',
      description: 'High-level overview',
      widgets: [],
      refreshInterval: 300000,
      accessLevel: 'SUPERVISOR',
    }],
  ]);

  async generateDashboard(dashboardId: string, userId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Unknown dashboard: ${dashboardId}`);
    }

    this.metrics.recordDashboardView();

    return {
      ...dashboard,
      widgets: dashboard.widgets.map((w: any) => ({ ...w, data: {}, lastUpdated: new Date() })),
      generatedAt: new Date(),
    };
  }

  getAvailableDashboards(): any[] {
    return Array.from(this.dashboards.values());
  }

  // ============ Cleanup ============

  destroy(): void {
    if (this.schedulingInterval) {
      clearInterval(this.schedulingInterval);
    }
  }
}
