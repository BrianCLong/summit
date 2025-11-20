/**
 * Alert System - Comprehensive alert management and notification
 * Handles alert generation, routing, escalation, and acknowledgment tracking
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Alert,
  AlertSeverity,
  AlertPriority,
  AlertStatus,
  AlertChannel,
  AlertRule,
  AlertCondition,
  Recipient,
  Acknowledgment,
  Escalation,
  WarningSignal,
  Prediction,
  CrisisScenario,
  WarningIndicator,
  CrisisType,
  EarlyWarningEvents
} from '../types/index.js';

interface AlertSystemConfig {
  enabled: boolean;
  channels: AlertChannel[];
  minSeverity: AlertSeverity;
  enableEscalation: boolean;
  escalationTimeoutMinutes: number;
  maxAlertsPerHour: number;
  deduplicationWindow: number; // minutes
  retryAttempts: number;
  retryDelaySeconds: number;
}

export class AlertSystem extends EventEmitter {
  private config: AlertSystemConfig;
  private alerts: Map<string, Alert>;
  private rules: Map<string, AlertRule>;
  private recipients: Map<string, Recipient>;
  private alertHistory: Alert[];
  private escalationTimers: Map<string, NodeJS.Timeout>;
  private alertCounts: Map<string, number>; // For rate limiting
  private lastAlertsByKey: Map<string, Date>; // For deduplication

  constructor(config: AlertSystemConfig) {
    super();
    this.config = config;
    this.alerts = new Map();
    this.rules = new Map();
    this.recipients = new Map();
    this.alertHistory = [];
    this.escalationTimers = new Map();
    this.alertCounts = new Map();
    this.lastAlertsByKey = new Map();
  }

  // ========================================================================
  // Alert Generation
  // ========================================================================

  /**
   * Generate early warning alert
   */
  async generateWarning(options: {
    title: string;
    message: string;
    severity: AlertSeverity;
    priority: AlertPriority;
    crisisType?: CrisisType;
    affectedCountries?: string[];
    affectedRegions?: string[];
    source: { type: 'MODEL' | 'INDICATOR' | 'ANALYST' | 'SYSTEM'; id: string };
    recommendedActions?: string[];
    requiredActions?: string[];
    deadline?: Date;
    tags?: string[];
  }): Promise<Alert> {
    if (!this.config.enabled) {
      console.log('Alert system is disabled');
      throw new Error('Alert system is disabled');
    }

    // Check severity threshold
    if (!this.meetsMinimumSeverity(options.severity)) {
      console.log(`Alert severity ${options.severity} below threshold ${this.config.minSeverity}`);
      throw new Error('Alert severity below minimum threshold');
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      console.log('Alert rate limit exceeded');
      throw new Error('Alert rate limit exceeded');
    }

    // Check for duplicate alerts
    const deduplicationKey = this.generateDeduplicationKey(options);
    if (this.isDuplicateAlert(deduplicationKey)) {
      console.log('Duplicate alert detected, skipping');
      throw new Error('Duplicate alert within deduplication window');
    }

    // Create alert
    const alert: Alert = {
      id: uuidv4(),
      type: 'WARNING',
      severity: options.severity,
      priority: options.priority,
      title: options.title,
      message: options.message,
      summary: this.generateSummary(options.message),
      details: options.message,
      crisisType: options.crisisType,
      affectedCountries: options.affectedCountries || [],
      affectedRegions: options.affectedRegions || [],
      sourceType: options.source.type,
      sourceId: options.source.id,
      recipients: this.selectRecipients(options.severity, options.priority),
      channels: this.selectChannels(options.severity, options.priority),
      createdAt: new Date(),
      expiresAt: options.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      recommendedActions: options.recommendedActions || [],
      requiredActions: options.requiredActions,
      deadline: options.deadline,
      status: 'PENDING',
      acknowledgments: [],
      escalations: [],
      tags: options.tags || [],
      metadata: {}
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Update deduplication tracking
    this.lastAlertsByKey.set(deduplicationKey, new Date());

    // Increment rate limit counter
    this.incrementAlertCount();

    // Emit event
    this.emit('alert-created', alert);

    // Send alert
    await this.sendAlert(alert);

    // Setup escalation if enabled
    if (this.config.enableEscalation) {
      this.setupEscalation(alert);
    }

    console.log(`Alert generated: ${alert.id} - ${alert.title}`);

    return alert;
  }

  /**
   * Generate alert from prediction
   */
  async generatePredictionAlert(prediction: Prediction): Promise<Alert> {
    const severity = this.determineSeverityFromProbability(prediction.probability);
    const priority = this.determinePriorityFromHorizon(prediction.predictionHorizon);

    return this.generateWarning({
      title: `Crisis Predicted: ${prediction.crisisType}`,
      message: `${prediction.crisisType} predicted with ${(prediction.probability * 100).toFixed(1)}% probability ` +
               `within ${prediction.predictionHorizon} days. Confidence: ${(prediction.confidence.overall * 100).toFixed(1)}%`,
      severity,
      priority,
      crisisType: prediction.crisisType,
      source: { type: 'MODEL', id: prediction.modelId },
      recommendedActions: this.generateRecommendedActions(prediction),
      tags: ['prediction', prediction.crisisType.toLowerCase()]
    });
  }

  /**
   * Generate alert from warning signal
   */
  async generateSignalAlert(signal: WarningSignal): Promise<Alert> {
    return this.generateWarning({
      title: signal.title,
      message: signal.description,
      severity: this.mapSignalSeverityToAlertSeverity(signal.severity),
      priority: signal.priority,
      source: { type: 'INDICATOR', id: signal.id },
      recommendedActions: [`Investigate warning signal`, `Review triggered indicators`],
      tags: ['signal', ...signal.indicators]
    });
  }

  /**
   * Generate alert from scenario
   */
  async generateScenarioAlert(scenario: CrisisScenario): Promise<Alert> {
    return this.generateWarning({
      title: `Crisis Scenario: ${scenario.title}`,
      message: scenario.description,
      severity: this.mapCrisisSeverityToAlertSeverity(scenario.severity),
      priority: this.determinePriorityFromProbability(scenario.probability),
      crisisType: scenario.type,
      affectedCountries: scenario.countries,
      affectedRegions: scenario.regions,
      source: { type: 'SYSTEM', id: scenario.id },
      recommendedActions: this.generateScenarioActions(scenario),
      tags: ['scenario', scenario.type.toLowerCase()]
    });
  }

  // ========================================================================
  // Alert Routing and Notification
  // ========================================================================

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    console.log(`Sending alert ${alert.id} through ${alert.channels.length} channels`);

    const sendPromises: Promise<void>[] = [];

    for (const channel of alert.channels) {
      sendPromises.push(this.sendToChannel(alert, channel));
    }

    try {
      await Promise.all(sendPromises);
      alert.status = 'SENT';
      alert.sentAt = new Date();
      this.emit('alert-sent', alert);
    } catch (error) {
      console.error(`Error sending alert ${alert.id}:`, error);
      // Retry logic would go here
      this.retryAlert(alert);
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    console.log(`Sending to ${channel}...`);

    switch (channel) {
      case AlertChannel.EMAIL:
        await this.sendEmail(alert);
        break;

      case AlertChannel.SMS:
        await this.sendSMS(alert);
        break;

      case AlertChannel.PHONE:
        await this.makePhoneCall(alert);
        break;

      case AlertChannel.PUSH_NOTIFICATION:
        await this.sendPushNotification(alert);
        break;

      case AlertChannel.SLACK:
        await this.sendSlackMessage(alert);
        break;

      case AlertChannel.TEAMS:
        await this.sendTeamsMessage(alert);
        break;

      case AlertChannel.WEBHOOK:
        await this.sendWebhook(alert);
        break;

      case AlertChannel.DASHBOARD:
        await this.updateDashboard(alert);
        break;

      default:
        console.warn(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Retry sending alert
   */
  private async retryAlert(alert: Alert, attempt: number = 1): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      console.error(`Max retry attempts reached for alert ${alert.id}`);
      alert.status = 'EXPIRED';
      return;
    }

    console.log(`Retrying alert ${alert.id}, attempt ${attempt}/${this.config.retryAttempts}`);

    await new Promise(resolve => setTimeout(resolve, this.config.retryDelaySeconds * 1000));

    try {
      await this.sendAlert(alert);
    } catch (error) {
      await this.retryAlert(alert, attempt + 1);
    }
  }

  // ========================================================================
  // Escalation Logic
  // ========================================================================

  /**
   * Setup escalation timer for alert
   */
  private setupEscalation(alert: Alert): void {
    const timeoutMs = this.config.escalationTimeoutMinutes * 60 * 1000;

    const timer = setTimeout(() => {
      this.escalateAlert(alert);
    }, timeoutMs);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * Escalate alert
   */
  async escalateAlert(alert: Alert, reason?: string): Promise<void> {
    console.log(`Escalating alert ${alert.id}`);

    // Determine new severity
    const newSeverity = this.escalateSeverity(alert.severity);

    // Create escalation record
    const escalation: Escalation = {
      id: uuidv4(),
      reason: reason || 'No acknowledgment received within timeout period',
      escalatedFrom: alert.severity,
      escalatedTo: newSeverity,
      escalatedAt: new Date(),
      escalatedBy: 'SYSTEM',
      additionalRecipients: this.getEscalationRecipients(newSeverity)
    };

    // Update alert
    alert.severity = newSeverity;
    alert.escalations.push(escalation);
    alert.status = 'ESCALATED';

    // Add additional recipients
    for (const recipientId of escalation.additionalRecipients) {
      const recipient = this.recipients.get(recipientId);
      if (recipient && !alert.recipients.find(r => r.id === recipientId)) {
        alert.recipients.push(recipient);
      }
    }

    // Re-send alert
    await this.sendAlert(alert);

    // Emit event
    this.emit('alert-escalated', alert, escalation);

    // Setup next escalation if not at max severity
    if (newSeverity !== AlertSeverity.EMERGENCY) {
      this.setupEscalation(alert);
    }
  }

  /**
   * Increase alert severity by one level
   */
  private escalateSeverity(currentSeverity: AlertSeverity): AlertSeverity {
    const severityOrder = [
      AlertSeverity.INFO,
      AlertSeverity.LOW,
      AlertSeverity.MEDIUM,
      AlertSeverity.HIGH,
      AlertSeverity.CRITICAL,
      AlertSeverity.EMERGENCY
    ];

    const currentIndex = severityOrder.indexOf(currentSeverity);
    const nextIndex = Math.min(currentIndex + 1, severityOrder.length - 1);

    return severityOrder[nextIndex];
  }

  // ========================================================================
  // Alert Acknowledgment
  // ========================================================================

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    recipientId: string,
    response?: string,
    action?: string
  ): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    // Create acknowledgment
    const acknowledgment: Acknowledgment = {
      id: uuidv4(),
      recipientId,
      acknowledgedAt: new Date(),
      response,
      action
    };

    // Update alert
    alert.acknowledgments.push(acknowledgment);
    alert.status = 'ACKNOWLEDGED';

    // Update recipient
    const recipient = alert.recipients.find(r => r.id === recipientId);
    if (recipient) {
      recipient.acknowledged = true;
      recipient.acknowledgedAt = new Date();
    }

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Emit event
    this.emit('alert-acknowledged', alert, acknowledgment);

    console.log(`Alert ${alertId} acknowledged by ${recipientId}`);
  }

  /**
   * Mark alert as resolved
   */
  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'RESOLVED';
    alert.metadata.resolution = resolution;
    alert.metadata.resolvedAt = new Date();

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    console.log(`Alert ${alertId} resolved: ${resolution}`);
  }

  /**
   * Cancel alert
   */
  async cancelAlert(alertId: string, reason: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'CANCELLED';
    alert.metadata.cancellationReason = reason;
    alert.metadata.cancelledAt = new Date();

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    console.log(`Alert ${alertId} cancelled: ${reason}`);
  }

  // ========================================================================
  // Alert Rules Management
  // ========================================================================

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    console.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    console.log(`Removed alert rule: ${ruleId}`);
  }

  /**
   * Evaluate alert rules
   */
  async evaluateRules(context: {
    indicators?: WarningIndicator[];
    predictions?: Prediction[];
    scenarios?: CrisisScenario[];
  }): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check if rule conditions are met
      const conditionsMet = this.evaluateConditions(rule, context);

      if (conditionsMet) {
        // Check cooldown period
        if (this.isInCooldown(rule.id)) {
          continue;
        }

        // Generate alert from rule
        const alert = await this.generateRuleAlert(rule, context);
        triggeredAlerts.push(alert);

        // Update cooldown
        this.updateCooldown(rule.id);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(
    rule: AlertRule,
    context: any
  ): boolean {
    if (rule.conditions.length === 0) {
      return false;
    }

    const results = rule.conditions.map(condition =>
      this.evaluateCondition(condition, context)
    );

    if (rule.logicalOperator === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: AlertCondition, context: any): boolean {
    // Simplified condition evaluation
    // In production, this would be more sophisticated
    return Math.random() > 0.5; // Placeholder
  }

  // ========================================================================
  // Recipient Management
  // ========================================================================

  /**
   * Add recipient
   */
  addRecipient(recipient: Recipient): void {
    this.recipients.set(recipient.id, recipient);
    console.log(`Added recipient: ${recipient.name}`);
  }

  /**
   * Remove recipient
   */
  removeRecipient(recipientId: string): void {
    this.recipients.delete(recipientId);
    console.log(`Removed recipient: ${recipientId}`);
  }

  /**
   * Get recipients by priority
   */
  getRecipientsByPriority(priority: AlertPriority): Recipient[] {
    return Array.from(this.recipients.values()).filter(r => r.priority === priority);
  }

  // ========================================================================
  // Query and Statistics
  // ========================================================================

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert =>
      alert.status !== 'RESOLVED' &&
      alert.status !== 'CANCELLED' &&
      alert.status !== 'EXPIRED'
    );
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by status
   */
  getAlertsByStatus(status: AlertStatus): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === status);
  }

  /**
   * Get alert statistics
   */
  getStatistics(): AlertStatistics {
    const alerts = Array.from(this.alerts.values());

    return {
      total: alerts.length,
      active: this.getActiveAlerts().length,
      bySeverity: this.countBySeverity(alerts),
      byStatus: this.countByStatus(alerts),
      byPriority: this.countByPriority(alerts),
      acknowledgmentRate: this.calculateAcknowledgmentRate(alerts),
      averageResponseTime: this.calculateAverageResponseTime(alerts),
      escalationRate: this.calculateEscalationRate(alerts)
    };
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private meetsMinimumSeverity(severity: AlertSeverity): boolean {
    const severityOrder = [
      AlertSeverity.INFO,
      AlertSeverity.LOW,
      AlertSeverity.MEDIUM,
      AlertSeverity.HIGH,
      AlertSeverity.CRITICAL,
      AlertSeverity.EMERGENCY
    ];

    const minIndex = severityOrder.indexOf(this.config.minSeverity);
    const alertIndex = severityOrder.indexOf(severity);

    return alertIndex >= minIndex;
  }

  private checkRateLimit(): boolean {
    const currentHour = new Date().getHours();
    const count = this.alertCounts.get(currentHour.toString()) || 0;
    return count < this.config.maxAlertsPerHour;
  }

  private incrementAlertCount(): void {
    const currentHour = new Date().getHours();
    const key = currentHour.toString();
    const count = this.alertCounts.get(key) || 0;
    this.alertCounts.set(key, count + 1);
  }

  private generateDeduplicationKey(options: any): string {
    return `${options.severity}-${options.crisisType}-${options.title}`;
  }

  private isDuplicateAlert(key: string): boolean {
    const lastAlert = this.lastAlertsByKey.get(key);
    if (!lastAlert) return false;

    const minutesSinceLastAlert = (Date.now() - lastAlert.getTime()) / (60 * 1000);
    return minutesSinceLastAlert < this.config.deduplicationWindow;
  }

  private generateSummary(message: string): string {
    return message.length > 200 ? message.substring(0, 197) + '...' : message;
  }

  private selectRecipients(severity: AlertSeverity, priority: AlertPriority): Recipient[] {
    // Select recipients based on severity and priority
    const recipients = Array.from(this.recipients.values()).filter(recipient => {
      // Match priority or higher severity recipients get lower priority alerts
      return true; // Simplified - would implement proper matching
    });

    return recipients.map(r => ({ ...r, acknowledged: false }));
  }

  private selectChannels(severity: AlertSeverity, priority: AlertPriority): AlertChannel[] {
    // Select channels based on severity
    if (severity === AlertSeverity.EMERGENCY || severity === AlertSeverity.CRITICAL) {
      return this.config.channels; // Use all channels
    } else if (severity === AlertSeverity.HIGH) {
      return [AlertChannel.EMAIL, AlertChannel.PUSH_NOTIFICATION, AlertChannel.DASHBOARD];
    } else {
      return [AlertChannel.EMAIL, AlertChannel.DASHBOARD];
    }
  }

  private determineSeverityFromProbability(probability: number): AlertSeverity {
    if (probability >= 0.9) return AlertSeverity.CRITICAL;
    if (probability >= 0.7) return AlertSeverity.HIGH;
    if (probability >= 0.5) return AlertSeverity.MEDIUM;
    if (probability >= 0.3) return AlertSeverity.LOW;
    return AlertSeverity.INFO;
  }

  private determinePriorityFromHorizon(horizonDays: number): AlertPriority {
    if (horizonDays <= 7) return AlertPriority.P1;
    if (horizonDays <= 30) return AlertPriority.P2;
    if (horizonDays <= 90) return AlertPriority.P3;
    return AlertPriority.P4;
  }

  private determinePriorityFromProbability(probability: number): AlertPriority {
    if (probability >= 0.8) return AlertPriority.P1;
    if (probability >= 0.6) return AlertPriority.P2;
    if (probability >= 0.4) return AlertPriority.P3;
    return AlertPriority.P4;
  }

  private mapSignalSeverityToAlertSeverity(severity: AlertSeverity): AlertSeverity {
    return severity; // Already same type
  }

  private mapCrisisSeverityToAlertSeverity(severity: string): AlertSeverity {
    const mapping: Record<string, AlertSeverity> = {
      'LOW': AlertSeverity.LOW,
      'MODERATE': AlertSeverity.MEDIUM,
      'HIGH': AlertSeverity.HIGH,
      'SEVERE': AlertSeverity.CRITICAL,
      'CRITICAL': AlertSeverity.CRITICAL,
      'CATASTROPHIC': AlertSeverity.EMERGENCY
    };
    return mapping[severity] || AlertSeverity.MEDIUM;
  }

  private generateRecommendedActions(prediction: Prediction): string[] {
    return [
      'Review prediction details and confidence metrics',
      'Assess triggering indicators',
      'Consult with regional experts',
      'Prepare contingency plans'
    ];
  }

  private generateScenarioActions(scenario: CrisisScenario): string[] {
    return [
      `Evaluate ${scenario.type} scenario probability`,
      'Review impact assessment',
      'Coordinate with stakeholders',
      'Activate response protocols if necessary'
    ];
  }

  private getEscalationRecipients(severity: AlertSeverity): string[] {
    // Return IDs of recipients who should be notified at this severity level
    return [];
  }

  private isInCooldown(ruleId: string): boolean {
    // Check if rule is in cooldown period
    return false; // Placeholder
  }

  private updateCooldown(ruleId: string): void {
    // Update cooldown timestamp
  }

  private async generateRuleAlert(rule: AlertRule, context: any): Promise<Alert> {
    return this.generateWarning({
      title: `Rule Triggered: ${rule.name}`,
      message: rule.description,
      severity: rule.severity,
      priority: rule.priority,
      source: { type: 'SYSTEM', id: rule.id },
      tags: ['rule', rule.id]
    });
  }

  private async sendEmail(alert: Alert): Promise<void> {
    // Placeholder for email sending logic
    console.log(`Sending email for alert ${alert.id}`);
  }

  private async sendSMS(alert: Alert): Promise<void> {
    // Placeholder for SMS sending logic
    console.log(`Sending SMS for alert ${alert.id}`);
  }

  private async makePhoneCall(alert: Alert): Promise<void> {
    // Placeholder for phone call logic
    console.log(`Making phone call for alert ${alert.id}`);
  }

  private async sendPushNotification(alert: Alert): Promise<void> {
    // Placeholder for push notification logic
    console.log(`Sending push notification for alert ${alert.id}`);
  }

  private async sendSlackMessage(alert: Alert): Promise<void> {
    // Placeholder for Slack integration
    console.log(`Sending Slack message for alert ${alert.id}`);
  }

  private async sendTeamsMessage(alert: Alert): Promise<void> {
    // Placeholder for Teams integration
    console.log(`Sending Teams message for alert ${alert.id}`);
  }

  private async sendWebhook(alert: Alert): Promise<void> {
    // Placeholder for webhook logic
    console.log(`Sending webhook for alert ${alert.id}`);
  }

  private async updateDashboard(alert: Alert): Promise<void> {
    // Placeholder for dashboard update
    console.log(`Updating dashboard for alert ${alert.id}`);
  }

  private countBySeverity(alerts: Alert[]): Record<AlertSeverity, number> {
    const counts = {} as Record<AlertSeverity, number>;
    for (const severity of Object.values(AlertSeverity)) {
      counts[severity] = alerts.filter(a => a.severity === severity).length;
    }
    return counts;
  }

  private countByStatus(alerts: Alert[]): Record<AlertStatus, number> {
    const counts = {} as Record<AlertStatus, number>;
    for (const status of Object.values(AlertStatus)) {
      counts[status] = alerts.filter(a => a.status === status).length;
    }
    return counts;
  }

  private countByPriority(alerts: Alert[]): Record<AlertPriority, number> {
    const counts = {} as Record<AlertPriority, number>;
    for (const priority of Object.values(AlertPriority)) {
      counts[priority] = alerts.filter(a => a.priority === priority).length;
    }
    return counts;
  }

  private calculateAcknowledgmentRate(alerts: Alert[]): number {
    const acknowledged = alerts.filter(a => a.acknowledgments.length > 0).length;
    return alerts.length > 0 ? acknowledged / alerts.length : 0;
  }

  private calculateAverageResponseTime(alerts: Alert[]): number {
    const responseTimes = alerts
      .filter(a => a.acknowledgments.length > 0)
      .map(a => {
        const firstAck = a.acknowledgments[0];
        return firstAck.acknowledgedAt.getTime() - a.createdAt.getTime();
      });

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length / (60 * 1000) // minutes
      : 0;
  }

  private calculateEscalationRate(alerts: Alert[]): number {
    const escalated = alerts.filter(a => a.escalations.length > 0).length;
    return alerts.length > 0 ? escalated / alerts.length : 0;
  }
}

// ============================================================================
// Supporting Interfaces
// ============================================================================

interface AlertStatistics {
  total: number;
  active: number;
  bySeverity: Record<AlertSeverity, number>;
  byStatus: Record<AlertStatus, number>;
  byPriority: Record<AlertPriority, number>;
  acknowledgmentRate: number;
  averageResponseTime: number; // minutes
  escalationRate: number;
}
