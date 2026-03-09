/**
 * Audit Dashboard and Analytics for IntelGraph
 * Real-time audit monitoring, compliance reporting, and security analytics
 */

import { EventEmitter } from 'events';
import { AdvancedAuditLogger, AuditEvent } from './AuditLogger';

export interface DashboardMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  failureRate: number;
  topUsers: { userId: string; count: number; riskScore: number }[];
  topResources: { resource: string; count: number }[];
  anomalies: AnomalyAlert[];
  complianceStatus: ComplianceReport;
  systemHealth: SystemHealthMetrics;
}

export interface AnomalyAlert {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedUser?: string;
  affectedResource?: string;
  confidence: number;
  details: Record<string, any>;
}

export interface ComplianceReport {
  gdpr: {
    compliant: boolean;
    violations: number;
    dataRetentionCompliance: number;
  };
  sox: {
    compliant: boolean;
    auditTrailCompleteness: number;
    accessControlCompliance: number;
  };
  pci: {
    compliant: boolean;
    cardholderDataAccess: number;
    securityViolations: number;
  };
  hipaa: {
    compliant: boolean;
    phiAccessCompliance: number;
    minimumNecessaryCompliance: number;
  };
}

export interface SystemHealthMetrics {
  auditLoggerHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  storageHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  siemConnectivity: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  processingLatency: number;
  errorRate: number;
  throughput: number;
}

export interface DashboardQuery {
  timeRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
  severities?: string[];
  users?: string[];
  resources?: string[];
  outcomes?: string[];
  limit?: number;
  offset?: number;
}

export class AuditDashboard extends EventEmitter {
  private auditLogger: AdvancedAuditLogger;
  private metricsCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(auditLogger: AdvancedAuditLogger) {
    super();
    this.auditLogger = auditLogger;
    this.setupEventListeners();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<DashboardMetrics> {
    const cacheKey = `metrics-${timeRange.start.toISOString()}-${timeRange.end.toISOString()}`;
    const cached = this.getCachedData(cacheKey);

    if (cached) {
      return cached;
    }

    const events = await this.queryEvents({ timeRange });
    const metrics = this.calculateMetrics(events, timeRange);

    this.setCachedData(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get real-time security alerts
   */
  async getSecurityAlerts(limit = 50): Promise<AnomalyAlert[]> {
    const recentEvents = await this.queryEvents({
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      },
      severities: ['HIGH', 'CRITICAL'],
      limit,
    });

    return this.generateSecurityAlerts(recentEvents);
  }

  /**
   * Generate compliance report
   */
  async getComplianceReport(timeRange: {
    start: Date;
    end: Date;
  }): Promise<ComplianceReport> {
    const events = await this.queryEvents({ timeRange });
    return this.generateComplianceReport(events);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const recentEvents = await this.queryEvents({
      timeRange: {
        start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        end: new Date(),
      },
    });

    return this.calculateSystemHealth(recentEvents);
  }

  /**
   * Get user risk analysis
   */
  async getUserRiskAnalysis(userId?: string, days = 30): Promise<any> {
    const timeRange = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const events = await this.queryEvents({
      timeRange,
      users: userId ? [userId] : undefined,
    });

    return this.analyzeUserRisk(events, userId);
  }

  /**
   * Get resource access patterns
   */
  async getResourceAnalysis(resource?: string, days = 30): Promise<any> {
    const timeRange = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const events = await this.queryEvents({
      timeRange,
      resources: resource ? [resource] : undefined,
    });

    return this.analyzeResourceAccess(events, resource);
  }

  /**
   * Search and filter audit events
   */
  async searchEvents(query: DashboardQuery): Promise<{
    events: AuditEvent[];
    total: number;
    aggregations: any;
  }> {
    const events = await this.queryEvents(query);
    const total = await this.countEvents(query);
    const aggregations = this.calculateAggregations(events);

    return { events, total, aggregations };
  }

  /**
   * Export audit data for compliance
   */
  async exportComplianceReport(
    format: 'JSON' | 'CSV' | 'PDF' | 'XLSX',
    timeRange: { start: Date; end: Date },
    includeDetails = false,
  ): Promise<Buffer> {
    const events = await this.queryEvents({ timeRange });
    const complianceReport = this.generateComplianceReport(events);

    switch (format) {
      case 'JSON':
        return Buffer.from(
          JSON.stringify(
            {
              report: complianceReport,
              events: includeDetails ? events : events.length,
              generated: new Date(),
              timeRange,
            },
            null,
            2,
          ),
        );

      case 'CSV':
        return this.generateCSVReport(events, complianceReport);

      case 'PDF':
        return this.generatePDFReport(events, complianceReport, timeRange);

      case 'XLSX':
        return this.generateExcelReport(events, complianceReport, timeRange);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get trending analysis
   */
  async getTrendAnalysis(metric: string, days = 30): Promise<any> {
    const timeRange = {
      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const events = await this.queryEvents({ timeRange });
    return this.calculateTrends(events, metric, days);
  }

  /**
   * Set up event listeners for real-time updates
   */
  private setupEventListeners(): void {
    this.auditLogger.on('audit_event', (event: AuditEvent) => {
      this.processRealTimeEvent(event);
    });

    this.auditLogger.on('anomaly_detected', (data: any) => {
      this.emit('security_alert', data);
    });

    this.auditLogger.on('alert', (alert: any) => {
      this.emit('system_alert', alert);
    });
  }

  /**
   * Process real-time events for dashboard updates
   */
  private processRealTimeEvent(event: AuditEvent): void {
    // Update real-time metrics
    this.emit('real_time_update', {
      type: 'audit_event',
      event,
      timestamp: new Date(),
    });

    // Check for immediate alerts
    if (event.severity === 'CRITICAL') {
      this.emit('critical_alert', event);
    }

    // Update dashboard counters
    this.updateRealTimeCounters(event);
  }

  /**
   * Calculate comprehensive metrics from events
   */
  private calculateMetrics(
    events: AuditEvent[],
    timeRange: { start: Date; end: Date },
  ): DashboardMetrics {
    const eventsByCategory = this.groupBy(events, 'category');
    const eventsBySeverity = this.groupBy(events, 'severity');

    const failedEvents = events.filter((e) => e.outcome === 'FAILURE');
    const failureRate =
      events.length > 0 ? (failedEvents.length / events.length) * 100 : 0;

    const userStats = this.calculateUserStats(events);
    const resourceStats = this.calculateResourceStats(events);
    const anomalies = this.detectAnomalies(events);
    const complianceStatus = this.generateComplianceReport(events);
    const systemHealth = this.calculateSystemHealth(events);

    return {
      timeRange,
      totalEvents: events.length,
      eventsByCategory: Object.fromEntries(
        Object.entries(eventsByCategory).map(([k, v]) => [k, v.length]),
      ),
      eventsBySeverity: Object.fromEntries(
        Object.entries(eventsBySeverity).map(([k, v]) => [k, v.length]),
      ),
      failureRate,
      topUsers: userStats.slice(0, 10),
      topResources: resourceStats.slice(0, 10),
      anomalies,
      complianceStatus,
      systemHealth,
    };
  }

  /**
   * Generate security alerts from events
   */
  private generateSecurityAlerts(events: AuditEvent[]): AnomalyAlert[] {
    const alerts: AnomalyAlert[] = [];

    // Failed authentication patterns
    const failedAuth = events.filter(
      (e) => e.category === 'AUTHENTICATION' && e.outcome === 'FAILURE',
    );

    if (failedAuth.length > 10) {
      alerts.push({
        id: `alert-${Date.now()}-auth`,
        timestamp: new Date(),
        type: 'MULTIPLE_FAILED_AUTH',
        severity: 'HIGH',
        description: `${failedAuth.length} failed authentication attempts detected`,
        confidence: 0.9,
        details: { failedAttempts: failedAuth.length },
      });
    }

    // Privilege escalation detection
    const privEscalation = events.filter(
      (e) =>
        e.action.includes('ROLE_CHANGE') ||
        e.action.includes('PERMISSION_GRANT'),
    );

    if (privEscalation.length > 0) {
      alerts.push({
        id: `alert-${Date.now()}-priv`,
        timestamp: new Date(),
        type: 'PRIVILEGE_ESCALATION',
        severity: 'CRITICAL',
        description: 'Potential privilege escalation detected',
        confidence: 0.8,
        details: { events: privEscalation.length },
      });
    }

    return alerts;
  }

  /**
   * Generate compliance report from events
   */
  private generateComplianceReport(events: AuditEvent[]): ComplianceReport {
    const dataAccessEvents = events.filter((e) => e.category === 'DATA_ACCESS');
    const authEvents = events.filter((e) => e.category === 'AUTHENTICATION');

    return {
      gdpr: {
        compliant: this.checkGDPRCompliance(events),
        violations: this.countGDPRViolations(events),
        dataRetentionCompliance: this.calculateDataRetentionCompliance(events),
      },
      sox: {
        compliant: this.checkSOXCompliance(events),
        auditTrailCompleteness: this.calculateAuditTrailCompleteness(events),
        accessControlCompliance: this.calculateAccessControlCompliance(events),
      },
      pci: {
        compliant: this.checkPCICompliance(events),
        cardholderDataAccess: dataAccessEvents.filter(
          (e) => e.details.dataClassification === 'PCI',
        ).length,
        securityViolations: this.countPCIViolations(events),
      },
      hipaa: {
        compliant: this.checkHIPAACompliance(events),
        phiAccessCompliance: dataAccessEvents.filter(
          (e) => e.details.dataClassification === 'PHI',
        ).length,
        minimumNecessaryCompliance:
          this.calculateMinimumNecessaryCompliance(events),
      },
    };
  }

  /**
   * Calculate system health metrics
   */
  private calculateSystemHealth(events: AuditEvent[]): SystemHealthMetrics {
    const systemEvents = events.filter((e) => e.category === 'SYSTEM');
    const errorEvents = events.filter((e) => e.outcome === 'FAILURE');

    const errorRate =
      events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
    const avgProcessingTime = this.calculateAverageProcessingTime(events);
    const throughput = this.calculateThroughput(events);

    return {
      auditLoggerHealth:
        errorRate < 5 ? 'HEALTHY' : errorRate < 15 ? 'DEGRADED' : 'CRITICAL',
      storageHealth: this.assessStorageHealth(systemEvents),
      siemConnectivity: this.assessSIEMConnectivity(systemEvents),
      processingLatency: avgProcessingTime,
      errorRate,
      throughput,
    };
  }

  /**
   * Helper methods for calculations
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
      },
      {} as Record<string, T[]>,
    );
  }

  private calculateUserStats(events: AuditEvent[]) {
    const userGroups = this.groupBy(
      events.filter((e) => e.userId),
      'userId',
    );
    return Object.entries(userGroups)
      .map(([userId, userEvents]) => ({
        userId,
        count: userEvents.length,
        riskScore: this.calculateUserRiskScore(userEvents),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateResourceStats(events: AuditEvent[]) {
    const resourceGroups = this.groupBy(events, 'resource');
    return Object.entries(resourceGroups)
      .map(([resource, resourceEvents]) => ({
        resource,
        count: resourceEvents.length,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private calculateUserRiskScore(events: AuditEvent[]): number {
    const failedEvents = events.filter((e) => e.outcome === 'FAILURE').length;
    const criticalEvents = events.filter(
      (e) => e.severity === 'CRITICAL',
    ).length;
    const baseScore = events.length * 0.1;
    const failureBonus = failedEvents * 5;
    const criticalBonus = criticalEvents * 10;

    return Math.min(100, Math.round(baseScore + failureBonus + criticalBonus));
  }

  private detectAnomalies(events: AuditEvent[]): AnomalyAlert[] {
    // Simplified anomaly detection
    return [];
  }

  // Compliance check methods (simplified implementations)
  private checkGDPRCompliance(events: AuditEvent[]): boolean {
    return events.every((e) => e.details.gdprCompliant !== false);
  }

  private countGDPRViolations(events: AuditEvent[]): number {
    return events.filter((e) => e.details.gdprViolation === true).length;
  }

  private calculateDataRetentionCompliance(events: AuditEvent[]): number {
    return 95; // Placeholder percentage
  }

  private checkSOXCompliance(events: AuditEvent[]): boolean {
    return true; // Placeholder
  }

  private calculateAuditTrailCompleteness(events: AuditEvent[]): number {
    return 98; // Placeholder percentage
  }

  private calculateAccessControlCompliance(events: AuditEvent[]): number {
    return 97; // Placeholder percentage
  }

  private checkPCICompliance(events: AuditEvent[]): boolean {
    return true; // Placeholder
  }

  private countPCIViolations(events: AuditEvent[]): number {
    return 0; // Placeholder
  }

  private checkHIPAACompliance(events: AuditEvent[]): boolean {
    return true; // Placeholder
  }

  private calculateMinimumNecessaryCompliance(events: AuditEvent[]): number {
    return 96; // Placeholder percentage
  }

  private assessStorageHealth(
    events: AuditEvent[],
  ): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    return 'HEALTHY'; // Placeholder
  }

  private assessSIEMConnectivity(
    events: AuditEvent[],
  ): 'CONNECTED' | 'DISCONNECTED' | 'ERROR' {
    return 'CONNECTED'; // Placeholder
  }

  private calculateAverageProcessingTime(events: AuditEvent[]): number {
    return 50; // Placeholder milliseconds
  }

  private calculateThroughput(events: AuditEvent[]): number {
    return events.length; // Events per time period
  }

  // Cache management
  private getCachedData(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.metricsCache.set(key, { data, timestamp: new Date() });
  }

  private updateRealTimeCounters(event: AuditEvent): void {
    // Update real-time dashboard counters
    this.emit('counter_update', {
      category: event.category,
      severity: event.severity,
      outcome: event.outcome,
      timestamp: event.timestamp,
    });
  }

  // Data export methods (simplified implementations)
  private generateCSVReport(
    events: AuditEvent[],
    report: ComplianceReport,
  ): Buffer {
    const csv =
      'timestamp,user,action,resource,outcome,severity\n' +
      events
        .map(
          (e) =>
            `${e.timestamp.toISOString()},${e.userId || 'N/A'},${e.action},${e.resource},${e.outcome},${e.severity}`,
        )
        .join('\n');
    return Buffer.from(csv);
  }

  private generatePDFReport(
    events: AuditEvent[],
    report: ComplianceReport,
    timeRange: any,
  ): Buffer {
    // PDF generation would use a library like PDFKit
    return Buffer.from('PDF Report Placeholder');
  }

  private generateExcelReport(
    events: AuditEvent[],
    report: ComplianceReport,
    timeRange: any,
  ): Buffer {
    // Excel generation would use a library like ExcelJS
    return Buffer.from('Excel Report Placeholder');
  }

  private calculateTrends(
    events: AuditEvent[],
    metric: string,
    days: number,
  ): any {
    // Trend calculation implementation
    return { trend: 'stable', change: 0 };
  }

  private analyzeUserRisk(events: AuditEvent[], userId?: string): any {
    // User risk analysis implementation
    return { riskLevel: 'LOW', score: 25 };
  }

  private analyzeResourceAccess(events: AuditEvent[], resource?: string): any {
    // Resource access analysis implementation
    return { accessPattern: 'normal', unusualActivity: false };
  }

  private calculateAggregations(events: AuditEvent[]): any {
    return {
      byHour: this.aggregateByTimeInterval(events, 'hour'),
      byDay: this.aggregateByTimeInterval(events, 'day'),
      byCategory: this.groupBy(events, 'category'),
      bySeverity: this.groupBy(events, 'severity'),
    };
  }

  private aggregateByTimeInterval(
    events: AuditEvent[],
    interval: 'hour' | 'day',
  ): any {
    // Time interval aggregation
    return {};
  }

  // Abstract methods to be implemented based on storage backend
  private async queryEvents(query: DashboardQuery): Promise<AuditEvent[]> {
    // This would query the actual audit storage
    return [];
  }

  private async countEvents(query: DashboardQuery): Promise<number> {
    // This would count events in the actual audit storage
    return 0;
  }
}

export default AuditDashboard;
