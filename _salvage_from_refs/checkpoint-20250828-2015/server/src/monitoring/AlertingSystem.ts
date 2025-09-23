import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { StreamingSLOManager } from '../streaming/StreamingSLO';

interface Alert {
  id: string;
  type: 'consumer_lag' | 'websocket_backlog' | 'model_drift' | 'security_incident' | 'slo_violation' | 'system_health';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  
  // Context data
  context: {
    tenant_id?: string;
    user_id?: string;
    investigation_id?: string;
    component: string;
    environment: 'development' | 'staging' | 'production';
  };
  
  // Metrics
  metrics: Record<string, number>;
  
  // Alert state
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
  resolution_note?: string;
  
  // Escalation
  escalation_level: 0 | 1 | 2 | 3; // 0=initial, 1=team_lead, 2=manager, 3=executive
  escalated_at?: Date;
  next_escalation_at?: Date;
  
  // Notification
  notifications_sent: Array<{
    channel: 'email' | 'slack' | 'pagerduty' | 'webhook';
    recipient: string;
    sent_at: Date;
    success: boolean;
  }>;
  
  // Auto-resolution
  auto_resolve: boolean;
  resolution_criteria?: {
    metric_threshold?: number;
    duration_minutes?: number;
    custom_condition?: string;
  };
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Trigger conditions
  conditions: {
    metric_name: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
    threshold: number;
    duration_seconds: number; // How long condition must persist
    evaluation_interval_seconds: number;
  }[];
  
  // Alert configuration
  alert_config: {
    severity: Alert['severity'];
    type: Alert['type'];
    title_template: string;
    description_template: string;
    auto_resolve: boolean;
    suppression_duration_minutes?: number;
  };
  
  // Notification settings
  notifications: {
    channels: ('email' | 'slack' | 'pagerduty' | 'webhook')[];
    recipients: string[];
    escalation_policy?: {
      initial_delay_minutes: number;
      escalation_delays_minutes: number[];
      recipients_by_level: string[][];
    };
  };
  
  // Scope
  scope: {
    environment?: string[];
    tenant_ids?: string[];
    components?: string[];
  };
}

/**
 * Comprehensive Alerting System
 * Monitors consumer lag, WebSocket backpressure, model drift, and system health
 */
export class AlertingSystem extends EventEmitter {
  private redis: Redis;
  private sloManager: StreamingSLOManager;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private evaluationIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Metrics storage for evaluation
  private metricsBuffer: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();
  
  // Alert suppression tracking
  private suppressedAlerts: Map<string, Date> = new Map();

  constructor(redis: Redis, sloManager: StreamingSLOManager) {
    super();
    this.redis = redis;
    this.sloManager = sloManager;
    
    this.initializeDefaultRules();
    this.startMetricsCollection();
    this.startAlertEvaluation();
    this.startEscalationProcessor();
  }

  /**
   * Initialize default alerting rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'consumer_lag_critical',
        name: 'Kafka Consumer Lag Critical',
        description: 'Consumer lag exceeds critical threshold',
        enabled: true,
        conditions: [{
          metric_name: 'kafka_consumer_lag_max',
          operator: '>',
          threshold: 1000,
          duration_seconds: 300, // 5 minutes
          evaluation_interval_seconds: 60
        }],
        alert_config: {
          severity: 'critical',
          type: 'consumer_lag',
          title_template: 'Critical Kafka Consumer Lag: {{value}} messages',
          description_template: 'Consumer lag has exceeded {{threshold}} messages for {{duration}} minutes. This may impact real-time processing.',
          auto_resolve: true,
          suppression_duration_minutes: 30
        },
        notifications: {
          channels: ['email', 'slack', 'pagerduty'],
          recipients: ['ops-team@intelgraph.com', '#alerts'],
          escalation_policy: {
            initial_delay_minutes: 15,
            escalation_delays_minutes: [30, 60],
            recipients_by_level: [
              ['team-lead@intelgraph.com'],
              ['manager@intelgraph.com'],
              ['director@intelgraph.com']
            ]
          }
        },
        scope: {
          environment: ['production'],
          components: ['kafka-consumer']
        }
      },
      {
        id: 'websocket_backlog_high',
        name: 'WebSocket Backlog High',
        description: 'WebSocket message backlog is accumulating',
        enabled: true,
        conditions: [{
          metric_name: 'websocket_backlog_max',
          operator: '>',
          threshold: 100,
          duration_seconds: 180, // 3 minutes
          evaluation_interval_seconds: 30
        }],
        alert_config: {
          severity: 'warning',
          type: 'websocket_backlog',
          title_template: 'WebSocket Backlog High: {{value}} messages queued',
          description_template: 'WebSocket connections have {{value}} messages queued, exceeding threshold of {{threshold}}.',
          auto_resolve: true,
          suppression_duration_minutes: 15
        },
        notifications: {
          channels: ['slack'],
          recipients: ['#platform-alerts']
        },
        scope: {
          environment: ['production', 'staging'],
          components: ['websocket-server']
        }
      },
      {
        id: 'alert_latency_slo_violation',
        name: 'Alert Latency SLO Violation',
        description: 'End-to-end alert latency exceeds SLO',
        enabled: true,
        conditions: [{
          metric_name: 'alert_latency_p95_ms',
          operator: '>',
          threshold: 2000,
          duration_seconds: 600, // 10 minutes
          evaluation_interval_seconds: 120
        }],
        alert_config: {
          severity: 'error',
          type: 'slo_violation',
          title_template: 'Alert Latency SLO Breach: {{value}}ms (p95)',
          description_template: 'Alert processing latency p95 is {{value}}ms, exceeding SLO of {{threshold}}ms.',
          auto_resolve: true,
          suppression_duration_minutes: 60
        },
        notifications: {
          channels: ['email', 'slack'],
          recipients: ['sre-team@intelgraph.com', '#slo-alerts']
        },
        scope: {
          environment: ['production'],
          components: ['streaming-pipeline']
        }
      },
      {
        id: 'model_drift_detected',
        name: 'ML Model Drift Detected',
        description: 'Significant model drift detected',
        enabled: true,
        conditions: [{
          metric_name: 'model_drift_score',
          operator: '>',
          threshold: 0.3,
          duration_seconds: 1800, // 30 minutes
          evaluation_interval_seconds: 300
        }],
        alert_config: {
          severity: 'warning',
          type: 'model_drift',
          title_template: 'Model Drift Alert: {{model_id}} (score: {{value}})',
          description_template: 'Model {{model_id}} showing drift score of {{value}}, indicating potential performance degradation.',
          auto_resolve: false, // Requires manual intervention
          suppression_duration_minutes: 120
        },
        notifications: {
          channels: ['email', 'slack'],
          recipients: ['ml-team@intelgraph.com', '#ml-alerts']
        },
        scope: {
          environment: ['production'],
          components: ['mlops']
        }
      },
      {
        id: 'security_incident_high',
        name: 'High Severity Security Incident',
        description: 'High severity security incident detected',
        enabled: true,
        conditions: [{
          metric_name: 'security_incident_count',
          operator: '>',
          threshold: 5,
          duration_seconds: 300, // 5 minutes
          evaluation_interval_seconds: 60
        }],
        alert_config: {
          severity: 'critical',
          type: 'security_incident',
          title_template: 'Security Alert: {{value}} incidents in 5 minutes',
          description_template: 'Multiple security incidents detected: {{value}} incidents in the last 5 minutes.',
          auto_resolve: false, // Requires security team review
          suppression_duration_minutes: 60
        },
        notifications: {
          channels: ['email', 'pagerduty'],
          recipients: ['security-team@intelgraph.com'],
          escalation_policy: {
            initial_delay_minutes: 5,
            escalation_delays_minutes: [15, 30],
            recipients_by_level: [
              ['security-lead@intelgraph.com'],
              ['ciso@intelgraph.com']
            ]
          }
        },
        scope: {
          environment: ['production'],
          components: ['security']
        }
      },
      {
        id: 'system_health_degraded',
        name: 'System Health Degraded',
        description: 'Overall system health has degraded',
        enabled: true,
        conditions: [
          {
            metric_name: 'system_cpu_usage',
            operator: '>',
            threshold: 80,
            duration_seconds: 600,
            evaluation_interval_seconds: 60
          },
          {
            metric_name: 'system_memory_usage',
            operator: '>',
            threshold: 85,
            duration_seconds: 600,
            evaluation_interval_seconds: 60
          }
        ],
        alert_config: {
          severity: 'warning',
          type: 'system_health',
          title_template: 'System Resources High: CPU {{cpu}}%, Memory {{memory}}%',
          description_template: 'System resource utilization is high - CPU: {{cpu}}%, Memory: {{memory}}%',
          auto_resolve: true,
          suppression_duration_minutes: 30
        },
        notifications: {
          channels: ['slack'],
          recipients: ['#infrastructure']
        },
        scope: {
          environment: ['production'],
          components: ['infrastructure']
        }
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
      this.startRuleEvaluation(rule);
    });

    console.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    
    if (rule.enabled) {
      this.startRuleEvaluation(rule);
    }
    
    console.log(`Added alert rule: ${rule.name}`);
  }

  /**
   * Update existing alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    
    // Restart evaluation if enabled
    if (updatedRule.enabled) {
      this.stopRuleEvaluation(ruleId);
      this.startRuleEvaluation(updatedRule);
    } else {
      this.stopRuleEvaluation(ruleId);
    }
    
    console.log(`Updated alert rule: ${rule.name}`);
  }

  /**
   * Record metric value for alert evaluation
   */
  recordMetric(metricName: string, value: number, context?: {
    component?: string;
    environment?: string;
    tenant_id?: string;
  }): void {
    const timestamp = new Date();
    const key = this.buildMetricKey(metricName, context);
    
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }
    
    const buffer = this.metricsBuffer.get(key)!;
    buffer.push({ timestamp, value });
    
    // Keep only last 1000 data points
    if (buffer.length > 1000) {
      buffer.shift();
    }
    
    // Also store in Redis for persistence
    this.redis.zadd(`metrics:${key}`, timestamp.getTime(), JSON.stringify({ value, timestamp }));
    this.redis.expire(`metrics:${key}`, 24 * 60 * 60); // 24 hour retention
  }

  /**
   * Create alert manually
   */
  createAlert(alertData: Partial<Alert>): Alert {
    const alert: Alert = {
      id: alertData.id || this.generateAlertId(),
      type: alertData.type!,
      severity: alertData.severity!,
      title: alertData.title!,
      description: alertData.description!,
      source: alertData.source || 'manual',
      timestamp: new Date(),
      context: alertData.context!,
      metrics: alertData.metrics || {},
      status: 'active',
      escalation_level: 0,
      notifications_sent: [],
      auto_resolve: alertData.auto_resolve || false,
      resolution_criteria: alertData.resolution_criteria
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Send notifications
    this.processAlert(alert);
    
    console.log(`Created alert: ${alert.title} (${alert.id})`);
    return alert;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'acknowledged';
    alert.acknowledged_by = acknowledgedBy;
    alert.acknowledged_at = new Date();
    
    if (note) {
      alert.resolution_note = note;
    }

    this.emit('alert_acknowledged', {
      alert_id: alertId,
      acknowledged_by: acknowledgedBy,
      timestamp: new Date()
    });

    console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolutionNote: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    alert.status = 'resolved';
    alert.resolved_at = new Date();
    alert.resolution_note = resolutionNote;
    
    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    this.emit('alert_resolved', {
      alert_id: alertId,
      resolved_by: resolvedBy,
      resolution_note: resolutionNote,
      timestamp: new Date()
    });

    console.log(`Alert ${alertId} resolved by ${resolvedBy}: ${resolutionNote}`);
  }

  /**
   * Get current alert status
   */
  getAlertStatus(): {
    active_alerts: number;
    alerts_by_severity: Record<string, number>;
    alerts_by_type: Record<string, number>;
    escalated_alerts: number;
    unacknowledged_alerts: number;
  } {
    const activeAlerts = Array.from(this.activeAlerts.values());
    
    const severityCounts = activeAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = activeAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      active_alerts: activeAlerts.length,
      alerts_by_severity: severityCounts,
      alerts_by_type: typeCounts,
      escalated_alerts: activeAlerts.filter(a => a.escalation_level > 0).length,
      unacknowledged_alerts: activeAlerts.filter(a => a.status === 'active').length
    };
  }

  /**
   * Start metrics collection from various sources
   */
  private startMetricsCollection(): void {
    // Collect SLO metrics
    setInterval(async () => {
      try {
        const sloStatus = await this.sloManager.getSLOStatus();
        
        this.recordMetric('alert_latency_p95_ms', sloStatus.alertLatencyP95);
        this.recordMetric('kafka_consumer_lag_max', sloStatus.kafkaLagMax);
        this.recordMetric('websocket_backlog_max', sloStatus.websocketBacklogMax);
        this.recordMetric('dlq_rate_percent', sloStatus.dlqRate * 100);
        
      } catch (error) {
        console.error('Failed to collect SLO metrics:', error);
      }
    }, 30000); // Every 30 seconds

    // Collect system metrics (mock)
    setInterval(() => {
      this.recordMetric('system_cpu_usage', 60 + Math.random() * 30);
      this.recordMetric('system_memory_usage', 70 + Math.random() * 20);
      this.recordMetric('system_disk_usage', 50 + Math.random() * 40);
    }, 60000); // Every minute
  }

  /**
   * Start evaluation for specific alert rule
   */
  private startRuleEvaluation(rule: AlertRule): void {
    if (!rule.enabled) return;

    const intervalMs = Math.min(...rule.conditions.map(c => c.evaluation_interval_seconds)) * 1000;
    
    const evaluate = async () => {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        console.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    };

    const intervalId = setInterval(evaluate, intervalMs);
    this.evaluationIntervals.set(rule.id, intervalId);
  }

  /**
   * Stop evaluation for specific alert rule
   */
  private stopRuleEvaluation(ruleId: string): void {
    const intervalId = this.evaluationIntervals.get(ruleId);
    if (intervalId) {
      clearInterval(intervalId);
      this.evaluationIntervals.delete(ruleId);
    }
  }

  /**
   * Evaluate alert rule conditions
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    let conditionsMet = 0;
    const conditionResults: any[] = [];

    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(condition, rule.scope);
      conditionResults.push(result);
      
      if (result.met) {
        conditionsMet++;
      }
    }

    // Check if alert should trigger (all conditions must be met)
    if (conditionsMet === rule.conditions.length) {
      await this.triggerAlert(rule, conditionResults);
    } else {
      // Check for auto-resolution
      await this.checkAutoResolution(rule);
    }
  }

  /**
   * Evaluate individual condition
   */
  private async evaluateCondition(condition: any, scope: any): Promise<{
    met: boolean;
    current_value: number;
    duration_met: number;
  }> {
    const metricKey = this.buildMetricKey(condition.metric_name, scope);
    const buffer = this.metricsBuffer.get(metricKey);
    
    if (!buffer || buffer.length === 0) {
      return { met: false, current_value: 0, duration_met: 0 };
    }

    const now = Date.now();
    const durationMs = condition.duration_seconds * 1000;
    
    // Get recent values within the duration window
    const recentValues = buffer.filter(
      point => (now - point.timestamp.getTime()) <= durationMs
    );

    if (recentValues.length === 0) {
      return { met: false, current_value: 0, duration_met: 0 };
    }

    const currentValue = recentValues[recentValues.length - 1].value;
    
    // Check if condition is met
    const conditionMet = this.evaluateOperator(
      currentValue, 
      condition.operator, 
      condition.threshold
    );

    // Calculate how long condition has been met
    let durationMet = 0;
    if (conditionMet) {
      for (let i = recentValues.length - 1; i >= 0; i--) {
        const value = recentValues[i];
        if (this.evaluateOperator(value.value, condition.operator, condition.threshold)) {
          durationMet = now - value.timestamp.getTime();
        } else {
          break;
        }
      }
    }

    return {
      met: conditionMet && durationMet >= durationMs,
      current_value: currentValue,
      duration_met: durationMet / 1000 // Convert to seconds
    };
  }

  /**
   * Trigger alert based on rule
   */
  private async triggerAlert(rule: AlertRule, conditionResults: any[]): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    
    // Check if alert is suppressed
    if (this.isAlertSuppressed(rule.id)) {
      return;
    }

    // Build alert from rule template
    const alert: Alert = {
      id: alertId,
      type: rule.alert_config.type,
      severity: rule.alert_config.severity,
      title: this.interpolateTemplate(rule.alert_config.title_template, conditionResults),
      description: this.interpolateTemplate(rule.alert_config.description_template, conditionResults),
      source: `rule:${rule.id}`,
      timestamp: new Date(),
      context: {
        component: rule.scope.components?.[0] || 'unknown',
        environment: (rule.scope.environment?.[0] || 'unknown') as any
      },
      metrics: conditionResults.reduce((acc, result, idx) => {
        acc[rule.conditions[idx].metric_name] = result.current_value;
        return acc;
      }, {} as Record<string, number>),
      status: 'active',
      escalation_level: 0,
      notifications_sent: [],
      auto_resolve: rule.alert_config.auto_resolve
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Add to suppression if configured
    if (rule.alert_config.suppression_duration_minutes) {
      const suppressUntil = new Date(Date.now() + rule.alert_config.suppression_duration_minutes * 60 * 1000);
      this.suppressedAlerts.set(rule.id, suppressUntil);
    }

    await this.processAlert(alert, rule);
    
    console.log(`Triggered alert: ${alert.title} (${alert.id})`);
  }

  /**
   * Process alert (send notifications, escalate, etc.)
   */
  private async processAlert(alert: Alert, rule?: AlertRule): Promise<void> {
    this.emit('alert_created', alert);
    
    if (rule) {
      // Send initial notifications
      for (const channel of rule.notifications.channels) {
        for (const recipient of rule.notifications.recipients) {
          const success = await this.sendNotification(alert, channel, recipient);
          
          alert.notifications_sent.push({
            channel,
            recipient,
            sent_at: new Date(),
            success
          });
        }
      }

      // Schedule escalation if configured
      if (rule.notifications.escalation_policy) {
        const escalationDelay = rule.notifications.escalation_policy.initial_delay_minutes * 60 * 1000;
        alert.next_escalation_at = new Date(Date.now() + escalationDelay);
      }
    }
  }

  /**
   * Send notification via specified channel
   */
  private async sendNotification(
    alert: Alert, 
    channel: string, 
    recipient: string
  ): Promise<boolean> {
    try {
      // Mock notification sending
      console.log(`Sending ${channel} notification to ${recipient}: ${alert.title}`);
      
      // In production, integrate with actual notification services
      switch (channel) {
        case 'email':
          // await emailService.send(recipient, alert);
          break;
        case 'slack':
          // await slackService.send(recipient, alert);
          break;
        case 'pagerduty':
          // await pagerDutyService.send(recipient, alert);
          break;
        case 'webhook':
          // await webhookService.send(recipient, alert);
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to send ${channel} notification to ${recipient}:`, error);
      return false;
    }
  }

  /**
   * Utility methods
   */
  private buildMetricKey(metricName: string, context?: any): string {
    const parts = [metricName];
    
    if (context?.component) parts.push(context.component);
    if (context?.environment) parts.push(context.environment);
    if (context?.tenant_id) parts.push(context.tenant_id);
    
    return parts.join(':');
  }

  private evaluateOperator(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '=': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  private isAlertSuppressed(ruleId: string): boolean {
    const suppressedUntil = this.suppressedAlerts.get(ruleId);
    if (!suppressedUntil) return false;
    
    if (suppressedUntil < new Date()) {
      this.suppressedAlerts.delete(ruleId);
      return false;
    }
    
    return true;
  }

  private interpolateTemplate(template: string, conditionResults: any[]): string {
    let result = template;
    
    conditionResults.forEach((res, idx) => {
      result = result.replace(/\{\{value\}\}/g, res.current_value.toString());
      result = result.replace(/\{\{threshold\}\}/g, res.threshold?.toString() || '');
      result = result.replace(/\{\{duration\}\}/g, Math.round(res.duration_met / 60).toString());
    });
    
    return result;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private startAlertEvaluation(): void {
    // Main alert evaluation loop is handled by individual rule evaluations
    console.log('Started alert evaluation system');
  }

  private startEscalationProcessor(): void {
    setInterval(() => {
      this.processEscalations();
    }, 60000); // Check every minute
  }

  private async processEscalations(): Promise<void> {
    const now = new Date();
    
    for (const alert of this.activeAlerts.values()) {
      if (alert.next_escalation_at && alert.next_escalation_at <= now && alert.status === 'active') {
        await this.escalateAlert(alert);
      }
    }
  }

  private async escalateAlert(alert: Alert): Promise<void> {
    alert.escalation_level = Math.min(alert.escalation_level + 1, 3) as any;
    alert.escalated_at = new Date();
    
    this.emit('alert_escalated', {
      alert_id: alert.id,
      escalation_level: alert.escalation_level,
      timestamp: new Date()
    });

    console.log(`Escalated alert ${alert.id} to level ${alert.escalation_level}`);
  }

  private async checkAutoResolution(rule: AlertRule): Promise<void> {
    // Check if any existing alerts for this rule can be auto-resolved
    const ruleAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.source === `rule:${rule.id}` && alert.auto_resolve);

    for (const alert of ruleAlerts) {
      // Simple auto-resolution: if conditions are no longer met for 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      if (alert.timestamp.getTime() < fiveMinutesAgo) {
        this.resolveAlert(alert.id, 'system', 'Auto-resolved: conditions no longer met');
      }
    }
  }
}

export { AlertingSystem, Alert, AlertRule };