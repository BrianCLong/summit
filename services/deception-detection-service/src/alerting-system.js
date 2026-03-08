"use strict";
/**
 * Real-Time Alerting System
 * Monitor detections and trigger automated responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealTimeAlertingSystem = exports.AlertStatus = exports.ActionType = exports.AlertSeverity = exports.AggregationType = exports.ComparisonOperator = exports.ConditionType = exports.ChannelType = void 0;
const events_1 = require("events");
var ChannelType;
(function (ChannelType) {
    ChannelType["WEBHOOK"] = "webhook";
    ChannelType["EMAIL"] = "email";
    ChannelType["SLACK"] = "slack";
    ChannelType["PAGERDUTY"] = "pagerduty";
    ChannelType["TEAMS"] = "teams";
    ChannelType["SMS"] = "sms";
    ChannelType["KAFKA"] = "kafka";
    ChannelType["SYSLOG"] = "syslog";
})(ChannelType || (exports.ChannelType = ChannelType = {}));
var ConditionType;
(function (ConditionType) {
    ConditionType["THRESHOLD"] = "threshold";
    ConditionType["ANOMALY"] = "anomaly";
    ConditionType["PATTERN"] = "pattern";
    ConditionType["RATE_LIMIT"] = "rate_limit";
    ConditionType["COMPOSITE"] = "composite";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
var ComparisonOperator;
(function (ComparisonOperator) {
    ComparisonOperator["GREATER_THAN"] = "gt";
    ComparisonOperator["LESS_THAN"] = "lt";
    ComparisonOperator["EQUAL"] = "eq";
    ComparisonOperator["NOT_EQUAL"] = "neq";
    ComparisonOperator["GREATER_EQUAL"] = "gte";
    ComparisonOperator["LESS_EQUAL"] = "lte";
})(ComparisonOperator || (exports.ComparisonOperator = ComparisonOperator = {}));
var AggregationType;
(function (AggregationType) {
    AggregationType["COUNT"] = "count";
    AggregationType["SUM"] = "sum";
    AggregationType["AVG"] = "avg";
    AggregationType["MIN"] = "min";
    AggregationType["MAX"] = "max";
    AggregationType["RATE"] = "rate";
    AggregationType["P95"] = "p95";
    AggregationType["P99"] = "p99";
})(AggregationType || (exports.AggregationType = AggregationType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var ActionType;
(function (ActionType) {
    ActionType["NOTIFY"] = "notify";
    ActionType["BLOCK_CONTENT"] = "block_content";
    ActionType["SUSPEND_ACCOUNT"] = "suspend_account";
    ActionType["RATE_LIMIT"] = "rate_limit";
    ActionType["QUARANTINE"] = "quarantine";
    ActionType["CREATE_TICKET"] = "create_ticket";
    ActionType["TRIGGER_WORKFLOW"] = "trigger_workflow";
    ActionType["ENRICH"] = "enrich";
})(ActionType || (exports.ActionType = ActionType = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["FIRING"] = "firing";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["SUPPRESSED"] = "suppressed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
class RealTimeAlertingSystem extends events_1.EventEmitter {
    config;
    channels;
    activeAlerts;
    alertHistory;
    cooldowns;
    batchBuffer;
    constructor(config) {
        super();
        this.config = config;
        this.channels = new Map();
        this.activeAlerts = new Map();
        this.alertHistory = [];
        this.cooldowns = new Map();
        this.batchBuffer = new Map();
        this.initializeChannels();
        this.startBatchProcessor();
    }
    initializeChannels() {
        for (const channel of this.config.channels) {
            if (channel.enabled) {
                this.channels.set(channel.id, new AlertChannelHandler(channel));
            }
        }
    }
    startBatchProcessor() {
        if (!this.config.batchingConfig.enabled)
            return;
        setInterval(() => {
            this.processBatches();
        }, this.config.batchingConfig.windowMs);
    }
    /**
     * Process a detection and generate alerts if conditions are met
     */
    async processDetection(detection) {
        const generatedAlerts = [];
        for (const rule of this.config.rules) {
            if (!rule.enabled)
                continue;
            // Check cooldown
            if (this.isInCooldown(rule.id))
                continue;
            // Evaluate condition
            const conditionMet = await this.evaluateCondition(rule.condition, detection);
            if (!conditionMet)
                continue;
            // Check suppression
            if (this.isSuppressed(detection))
                continue;
            // Create alert
            const alert = this.createAlert(rule, detection);
            // Handle batching
            if (this.config.batchingConfig.enabled) {
                this.addToBatch(rule.id, alert);
            }
            else {
                await this.processAlert(alert, rule);
            }
            generatedAlerts.push(alert);
            this.setCooldown(rule.id, rule.cooldownMs);
        }
        return generatedAlerts;
    }
    /**
     * Evaluate alert condition
     */
    async evaluateCondition(condition, detection) {
        switch (condition.type) {
            case ConditionType.THRESHOLD:
                return this.evaluateThreshold(condition, detection);
            case ConditionType.ANOMALY:
                return this.evaluateAnomaly(condition, detection);
            case ConditionType.PATTERN:
                return this.evaluatePattern(condition, detection);
            case ConditionType.RATE_LIMIT:
                return this.evaluateRateLimit(condition, detection);
            case ConditionType.COMPOSITE:
                return this.evaluateComposite(condition, detection);
            default:
                return false;
        }
    }
    evaluateThreshold(condition, detection) {
        const value = this.extractMetricValue(condition.metric, detection);
        const threshold = condition.threshold;
        switch (condition.operator) {
            case ComparisonOperator.GREATER_THAN:
                return value > threshold;
            case ComparisonOperator.LESS_THAN:
                return value < threshold;
            case ComparisonOperator.EQUAL:
                return value === threshold;
            case ComparisonOperator.NOT_EQUAL:
                return value !== threshold;
            case ComparisonOperator.GREATER_EQUAL:
                return value >= threshold;
            case ComparisonOperator.LESS_EQUAL:
                return value <= threshold;
            default:
                return false;
        }
    }
    evaluateAnomaly(condition, detection) {
        // Statistical anomaly detection
        const value = this.extractMetricValue(condition.metric, detection);
        const history = this.getMetricHistory(condition.metric);
        if (history.length < 10)
            return false;
        const mean = history.reduce((a, b) => a + b, 0) / history.length;
        const variance = history.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / history.length;
        const stdDev = Math.sqrt(variance);
        const zscore = Math.abs((value - mean) / stdDev);
        return zscore > (condition.threshold || 3);
    }
    evaluatePattern(condition, detection) {
        // Pattern matching on recent detections
        return false;
    }
    evaluateRateLimit(condition, detection) {
        const windowMs = condition.windowMs || 60000;
        const recentCount = this.countRecentDetections(detection.type, windowMs);
        return recentCount > (condition.threshold || 100);
    }
    evaluateComposite(condition, detection) {
        // Combine multiple conditions
        return false;
    }
    extractMetricValue(metric, detection) {
        switch (metric) {
            case 'confidence':
                return detection.confidence;
            case 'severity':
                return detection.result?.severity || 0;
            default:
                return detection.result?.[metric] || 0;
        }
    }
    getMetricHistory(metric) {
        return this.alertHistory
            .slice(-100)
            .map(a => a.source.confidence);
    }
    countRecentDetections(type, windowMs) {
        const cutoff = Date.now() - windowMs;
        return this.alertHistory.filter(a => a.source.type === type && a.timestamp.getTime() > cutoff).length;
    }
    /**
     * Create alert from detection
     */
    createAlert(rule, detection) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            severity: rule.severity,
            title: this.generateAlertTitle(rule, detection),
            description: this.generateAlertDescription(rule, detection),
            source: {
                type: detection.type,
                detectionId: detection.id,
                confidence: detection.confidence,
                evidence: detection.result,
            },
            timestamp: new Date(),
            status: AlertStatus.FIRING,
            labels: this.generateLabels(detection),
            annotations: this.generateAnnotations(detection),
            relatedAlerts: this.findRelatedAlerts(detection),
            timeline: [{
                    timestamp: new Date(),
                    type: 'created',
                    details: { rule: rule.name },
                }],
            metrics: {
                firstOccurrence: new Date(),
                lastOccurrence: new Date(),
                occurrenceCount: 1,
                meanTimeBetweenOccurrences: 0,
                impactScore: this.calculateImpactScore(detection),
            },
        };
        this.activeAlerts.set(alert.id, alert);
        this.alertHistory.push(alert);
        this.emit('alert:created', alert);
        return alert;
    }
    generateAlertTitle(rule, detection) {
        return `[${rule.severity.toUpperCase()}] ${detection.type} detected with ${(detection.confidence * 100).toFixed(1)}% confidence`;
    }
    generateAlertDescription(rule, detection) {
        return `${rule.description}\n\nDetection ID: ${detection.id}\nConfidence: ${(detection.confidence * 100).toFixed(1)}%`;
    }
    generateLabels(detection) {
        return {
            type: detection.type,
            confidence_tier: detection.confidence > 0.9 ? 'high' : detection.confidence > 0.7 ? 'medium' : 'low',
        };
    }
    generateAnnotations(detection) {
        return {
            detection: detection.result,
            metadata: detection.metadata,
        };
    }
    findRelatedAlerts(detection) {
        return this.alertHistory
            .filter(a => a.source.type === detection.type &&
            Date.now() - a.timestamp.getTime() < 3600000)
            .map(a => a.id)
            .slice(-5);
    }
    calculateImpactScore(detection) {
        // Calculate based on detection type and confidence
        return detection.confidence * 0.7 + 0.3;
    }
    /**
     * Process alert - send notifications and execute actions
     */
    async processAlert(alert, rule) {
        // Send to channels
        for (const channelId of rule.channels) {
            const handler = this.channels.get(channelId);
            if (handler) {
                await handler.send(alert);
            }
        }
        // Execute actions
        for (const action of rule.actions) {
            await this.executeAction(action, alert);
        }
        // Start escalation if needed
        if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
            this.startEscalation(alert);
        }
    }
    /**
     * Execute alert action
     */
    async executeAction(action, alert) {
        this.emit('action:executing', { action, alert });
        switch (action.type) {
            case ActionType.BLOCK_CONTENT:
                await this.blockContent(alert.source.detectionId, action.config);
                break;
            case ActionType.SUSPEND_ACCOUNT:
                await this.suspendAccount(action.config.target, action.config);
                break;
            case ActionType.RATE_LIMIT:
                await this.applyRateLimit(action.config.target, action.config);
                break;
            case ActionType.QUARANTINE:
                await this.quarantineContent(alert.source.detectionId, action.config);
                break;
            case ActionType.CREATE_TICKET:
                await this.createTicket(alert, action.config);
                break;
            case ActionType.TRIGGER_WORKFLOW:
                await this.triggerWorkflow(action.config.target, { alert, ...action.config.parameters });
                break;
            case ActionType.ENRICH:
                await this.enrichAlert(alert);
                break;
        }
        alert.timeline.push({
            timestamp: new Date(),
            type: 'action_executed',
            details: { actionType: action.type },
        });
        this.emit('action:completed', { action, alert });
    }
    async blockContent(contentId, config) {
        console.log(`Blocking content: ${contentId}`);
    }
    async suspendAccount(accountId, config) {
        console.log(`Suspending account: ${accountId}`);
    }
    async applyRateLimit(target, config) {
        console.log(`Applying rate limit to: ${target}`);
    }
    async quarantineContent(contentId, config) {
        console.log(`Quarantining content: ${contentId}`);
    }
    async createTicket(alert, config) {
        console.log(`Creating ticket for alert: ${alert.id}`);
    }
    async triggerWorkflow(workflowId, data) {
        console.log(`Triggering workflow: ${workflowId}`);
    }
    async enrichAlert(alert) {
        // Enrich with additional context
    }
    /**
     * Handle escalation
     */
    startEscalation(alert) {
        let currentLevel = 0;
        const escalate = async () => {
            if (alert.status === AlertStatus.RESOLVED || alert.status === AlertStatus.ACKNOWLEDGED) {
                return;
            }
            const level = this.config.escalationPolicy.levels[currentLevel];
            if (!level)
                return;
            // Notify channels at this level
            for (const channelId of level.channels) {
                const handler = this.channels.get(channelId);
                if (handler) {
                    await handler.send(alert, { escalationLevel: level.level });
                }
            }
            // Notify on-call if configured
            if (level.notifyOnCall && this.config.escalationPolicy.onCallSchedule) {
                await this.notifyOnCall(alert);
            }
            alert.timeline.push({
                timestamp: new Date(),
                type: 'escalated',
                details: { level: level.level },
            });
            currentLevel++;
            if (currentLevel < this.config.escalationPolicy.levels.length) {
                setTimeout(escalate, level.delayMs);
            }
        };
        setTimeout(escalate, this.config.escalationPolicy.levels[0]?.delayMs || 300000);
    }
    async notifyOnCall(alert) {
        const schedule = this.config.escalationPolicy.onCallSchedule;
        if (!schedule)
            return;
        // Find current on-call person
        const currentOnCall = schedule.participants[0];
        if (currentOnCall) {
            console.log(`Notifying on-call: ${currentOnCall.userId}`);
        }
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId, userId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return;
        alert.status = AlertStatus.ACKNOWLEDGED;
        alert.assignee = userId;
        alert.timeline.push({
            timestamp: new Date(),
            type: 'acknowledged',
            actor: userId,
        });
        this.emit('alert:acknowledged', alert);
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId, userId, resolution) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return;
        alert.status = AlertStatus.RESOLVED;
        alert.timeline.push({
            timestamp: new Date(),
            type: 'resolved',
            actor: userId,
            details: { resolution },
        });
        this.activeAlerts.delete(alertId);
        this.emit('alert:resolved', alert);
    }
    /**
     * Get alert summary
     */
    getSummary() {
        const alerts = Array.from(this.activeAlerts.values());
        const bySeverity = {
            [AlertSeverity.CRITICAL]: 0,
            [AlertSeverity.HIGH]: 0,
            [AlertSeverity.MEDIUM]: 0,
            [AlertSeverity.LOW]: 0,
            [AlertSeverity.INFO]: 0,
        };
        const byStatus = {
            [AlertStatus.FIRING]: 0,
            [AlertStatus.ACKNOWLEDGED]: 0,
            [AlertStatus.RESOLVED]: 0,
            [AlertStatus.SUPPRESSED]: 0,
        };
        const bySource = {};
        for (const alert of alerts) {
            bySeverity[alert.severity]++;
            byStatus[alert.status]++;
            bySource[alert.source.type] = (bySource[alert.source.type] || 0) + 1;
        }
        return {
            total: alerts.length,
            bySeverity,
            byStatus,
            bySource,
            recentAlerts: alerts.slice(-10),
            trends: this.calculateTrends(),
        };
    }
    calculateTrends() {
        // Calculate hourly trends for the past 24 hours
        const trends = [];
        const now = Date.now();
        for (let i = 23; i >= 0; i--) {
            const hourStart = now - (i + 1) * 3600000;
            const hourEnd = now - i * 3600000;
            const hourAlerts = this.alertHistory.filter(a => a.timestamp.getTime() >= hourStart && a.timestamp.getTime() < hourEnd);
            trends.push({
                timestamp: new Date(hourEnd),
                count: hourAlerts.length,
                severity: AlertSeverity.MEDIUM,
            });
        }
        return trends;
    }
    // Cooldown management
    isInCooldown(ruleId) {
        const cooldownEnd = this.cooldowns.get(ruleId);
        return cooldownEnd ? Date.now() < cooldownEnd : false;
    }
    setCooldown(ruleId, durationMs) {
        this.cooldowns.set(ruleId, Date.now() + durationMs);
    }
    // Suppression
    isSuppressed(detection) {
        for (const rule of this.config.suppressionRules) {
            if (this.evaluateCondition(rule.condition, detection)) {
                return true;
            }
        }
        return false;
    }
    // Batching
    addToBatch(ruleId, alert) {
        const batch = this.batchBuffer.get(ruleId) || [];
        batch.push(alert);
        this.batchBuffer.set(ruleId, batch);
        if (batch.length >= this.config.batchingConfig.maxBatchSize) {
            this.processBatchForRule(ruleId);
        }
    }
    processBatches() {
        for (const [ruleId, batch] of this.batchBuffer) {
            if (batch.length > 0) {
                this.processBatchForRule(ruleId);
            }
        }
    }
    processBatchForRule(ruleId) {
        const batch = this.batchBuffer.get(ruleId) || [];
        if (batch.length === 0)
            return;
        const rule = this.config.rules.find(r => r.id === ruleId);
        if (rule) {
            // Create batch summary alert
            const summaryAlert = this.createBatchSummary(batch, rule);
            this.processAlert(summaryAlert, rule);
        }
        this.batchBuffer.set(ruleId, []);
    }
    createBatchSummary(batch, rule) {
        return {
            ...batch[0],
            id: `batch_${Date.now()}`,
            title: `[BATCH] ${batch.length} ${rule.name} alerts`,
            description: `Batch of ${batch.length} alerts in ${this.config.batchingConfig.windowMs}ms window`,
            relatedAlerts: batch.map(a => a.id),
            metrics: {
                ...batch[0].metrics,
                occurrenceCount: batch.length,
            },
        };
    }
}
exports.RealTimeAlertingSystem = RealTimeAlertingSystem;
class AlertChannelHandler {
    channel;
    constructor(channel) {
        this.channel = channel;
    }
    async send(alert, context) {
        if (!this.channel.severity.includes(alert.severity))
            return;
        switch (this.channel.type) {
            case ChannelType.WEBHOOK:
                await this.sendWebhook(alert, context);
                break;
            case ChannelType.SLACK:
                await this.sendSlack(alert, context);
                break;
            case ChannelType.EMAIL:
                await this.sendEmail(alert, context);
                break;
            default:
                console.log(`Sending to ${this.channel.type}: ${alert.title}`);
        }
    }
    async sendWebhook(alert, context) {
        // POST to webhook URL
        console.log(`Webhook: ${alert.title}`);
    }
    async sendSlack(alert, context) {
        // Send Slack message
        console.log(`Slack: ${alert.title}`);
    }
    async sendEmail(alert, context) {
        // Send email
        console.log(`Email: ${alert.title}`);
    }
}
