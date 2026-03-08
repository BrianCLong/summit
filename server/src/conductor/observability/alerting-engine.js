"use strict";
// @ts-nocheck
// server/src/conductor/observability/alerting-engine.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertingEngine = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("./prometheus.js");
class AlertingEngine {
    pool;
    redis;
    prometheusUrl;
    activeAlerts;
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = new ioredis_1.default(process.env.REDIS_URL);
        this.prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
        this.activeAlerts = new Map();
    }
    async connect() {
        await this.redis.connect();
        await this.loadActiveAlerts();
        this.startAlertEvaluationLoop();
    }
    /**
     * Create production-ready alert rule
     */
    async createAlertRule(rule) {
        const alertRule = {
            ...rule,
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
        };
        // Validate rule
        await this.validateAlertRule(alertRule);
        // Store rule
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO alert_rules (
          id, name, description, severity, query, threshold, comparison,
          duration, tenant_id, labels, annotations, enabled, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
                alertRule.id,
                alertRule.name,
                alertRule.description,
                alertRule.severity,
                alertRule.query,
                alertRule.threshold,
                alertRule.comparison,
                alertRule.duration,
                alertRule.tenantId,
                JSON.stringify(alertRule.labels),
                JSON.stringify(alertRule.annotations),
                alertRule.enabled,
                alertRule.createdBy,
                alertRule.createdAt,
            ]);
        }
        finally {
            client.release();
        }
        logger_js_1.default.info('Alert rule created', {
            ruleId: alertRule.id,
            name: alertRule.name,
        });
        return alertRule;
    }
    /**
     * Evaluate all alert rules against current metrics
     */
    async evaluateAlertRules() {
        try {
            const rules = await this.getEnabledAlertRules();
            for (const rule of rules) {
                try {
                    await this.evaluateRule(rule);
                }
                catch (error) {
                    logger_js_1.default.error('Rule evaluation failed', {
                        ruleId: rule.id,
                        error: error.message,
                    });
                }
            }
            // Update evaluation metrics
            prometheus_js_1.prometheusConductorMetrics.recordOperationalMetric('alert_rules_evaluated', rules.length);
        }
        catch (error) {
            logger_js_1.default.error('Alert evaluation loop failed', { error: error.message });
        }
    }
    /**
     * Fire alert and handle routing
     */
    async fireAlert(rule, value, labels = {}) {
        const fingerprint = this.calculateAlertFingerprint(rule, labels);
        const existingAlert = this.activeAlerts.get(fingerprint);
        if (existingAlert && existingAlert.status === 'firing') {
            // Alert already firing, skip
            return;
        }
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            status: 'firing',
            message: this.formatAlertMessage(rule, value, labels),
            labels: { ...rule.labels, ...labels },
            annotations: { ...rule.annotations, current_value: value.toString() },
            startsAt: new Date(),
            tenantId: rule.tenantId,
            fingerprint,
            generatorUrl: `${process.env.CONDUCTOR_URL}/alerts/${rule.id}`,
        };
        // Store alert
        await this.storeAlert(alert);
        this.activeAlerts.set(fingerprint, alert);
        // Route to destinations
        await this.routeAlert(alert);
        // Handle critical alerts immediately
        if (alert.severity === 'critical') {
            await this.handleCriticalAlert(alert);
        }
        logger_js_1.default.warn('Alert fired', {
            alertId: alert.id,
            ruleName: rule.name,
            severity: rule.severity,
            value,
        });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('alert_fired', true, {
            severity: alert.severity,
            rule_name: rule.name,
        });
    }
    /**
     * Resolve alert
     */
    async resolveAlert(fingerprint) {
        const alert = this.activeAlerts.get(fingerprint);
        if (!alert || alert.status === 'resolved') {
            return;
        }
        alert.status = 'resolved';
        alert.endsAt = new Date();
        await this.updateAlert(alert);
        this.activeAlerts.delete(fingerprint);
        // Send resolution notification
        await this.sendResolutionNotification(alert);
        logger_js_1.default.info('Alert resolved', {
            alertId: alert.id,
            ruleName: alert.ruleName,
            duration: alert.endsAt.getTime() - alert.startsAt.getTime(),
        });
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('alert_resolved', true, {
            severity: alert.severity,
            rule_name: alert.ruleName,
        });
    }
    /**
     * Configure alert destination
     */
    async configureDestination(destination) {
        const alertDestination = {
            ...destination,
            id: `dest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO alert_destinations (
          id, name, type, config, severity_filter, tenant_filter, enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
                alertDestination.id,
                alertDestination.name,
                alertDestination.type,
                JSON.stringify(alertDestination.config),
                JSON.stringify(alertDestination.severityFilter),
                JSON.stringify(alertDestination.tenantFilter),
                alertDestination.enabled,
            ]);
        }
        finally {
            client.release();
        }
        logger_js_1.default.info('Alert destination configured', {
            destId: alertDestination.id,
            name: alertDestination.name,
            type: alertDestination.type,
        });
        return alertDestination;
    }
    /**
     * Set up on-call rotation
     */
    async configureOnCallRotation(rotation) {
        await this.redis.hset('oncall_rotations', rotation.scheduleId, JSON.stringify(rotation));
        // Schedule rotation event
        await this.redis.zadd('oncall_rotation_schedule', rotation.rotationAt.getTime(), rotation.scheduleId);
        logger_js_1.default.info('On-call rotation configured', {
            scheduleId: rotation.scheduleId,
            currentOnCall: rotation.currentOnCall,
            nextRotation: rotation.rotationAt,
        });
    }
    /**
     * Get current on-call person for escalation
     */
    async getCurrentOnCall(scheduleId = 'default') {
        const rotationStr = await this.redis.hget('oncall_rotations', scheduleId);
        if (!rotationStr) {
            return ['fallback-oncall@company.com']; // Fallback
        }
        const rotation = JSON.parse(rotationStr);
        // Check if rotation is due
        if (new Date() >= rotation.rotationAt) {
            await this.performRotation(scheduleId, rotation);
            return rotation.nextOnCall;
        }
        return rotation.currentOnCall;
    }
    async validateAlertRule(rule) {
        // Validate PromQL query
        try {
            const testQuery = `${rule.query}`;
            const response = await fetch(`${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(testQuery)}&time=${Math.floor(Date.now() / 1000)}`);
            if (!response.ok) {
                throw new Error(`Invalid PromQL query: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(`PromQL query validation failed: ${data.error}`);
            }
        }
        catch (error) {
            throw new Error(`Alert rule validation failed: ${error.message}`);
        }
        // Validate duration format
        if (!/^\d+[smhd]$/.test(rule.duration)) {
            throw new Error('Invalid duration format. Use format like "5m", "1h", "1d"');
        }
        // Validate severity
        if (!['critical', 'warning', 'info'].includes(rule.severity)) {
            throw new Error('Invalid severity. Must be critical, warning, or info');
        }
    }
    async getEnabledAlertRules() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT * FROM alert_rules WHERE enabled = true
      `);
            return result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                description: row.description,
                severity: row.severity,
                query: row.query,
                threshold: parseFloat(row.threshold),
                comparison: row.comparison,
                duration: row.duration,
                tenantId: row.tenant_id,
                labels: row.labels || {},
                annotations: row.annotations || {},
                enabled: row.enabled,
                createdBy: row.created_by,
                createdAt: row.created_at,
            }));
        }
        finally {
            client.release();
        }
    }
    async evaluateRule(rule) {
        try {
            // Query Prometheus
            const response = await fetch(`${this.prometheusUrl}/api/v1/query?query=${encodeURIComponent(rule.query)}&time=${Math.floor(Date.now() / 1000)}`);
            if (!response.ok) {
                throw new Error(`Prometheus query failed: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.status !== 'success') {
                throw new Error(`Prometheus query error: ${data.error}`);
            }
            // Evaluate results
            const results = data.data.result;
            for (const result of results) {
                const value = parseFloat(result.value[1]);
                const labels = result.metric || {};
                // Check threshold
                const shouldAlert = this.evaluateThreshold(value, rule.threshold, rule.comparison);
                const fingerprint = this.calculateAlertFingerprint(rule, labels);
                if (shouldAlert) {
                    // Check if alert should fire based on duration
                    const shouldFire = await this.checkAlertDuration(rule, fingerprint);
                    if (shouldFire) {
                        await this.fireAlert(rule, value, labels);
                    }
                }
                else {
                    // Resolve alert if it exists
                    await this.resolveAlert(fingerprint);
                }
            }
            // If no results and was previously firing, resolve
            if (results.length === 0) {
                const fingerprint = this.calculateAlertFingerprint(rule, {});
                await this.resolveAlert(fingerprint);
            }
        }
        catch (error) {
            logger_js_1.default.error('Rule evaluation failed', {
                ruleId: rule.id,
                error: error.message,
            });
        }
    }
    evaluateThreshold(value, threshold, comparison) {
        switch (comparison) {
            case 'gt':
                return value > threshold;
            case 'lt':
                return value < threshold;
            case 'eq':
                return value === threshold;
            case 'ne':
                return value !== threshold;
            case 'gte':
                return value >= threshold;
            case 'lte':
                return value <= threshold;
            default:
                return false;
        }
    }
    async checkAlertDuration(rule, fingerprint) {
        // Check Redis for duration tracking
        const durationKey = `alert_duration:${fingerprint}`;
        const firstBreach = await this.redis.get(durationKey);
        if (!firstBreach) {
            // First time threshold breached
            await this.redis.setex(durationKey, this.parseDurationToSeconds(rule.duration) + 60, Date.now().toString());
            return false;
        }
        // Check if duration has elapsed
        const breachTime = parseInt(firstBreach);
        const durationMs = this.parseDurationToMilliseconds(rule.duration);
        return Date.now() - breachTime >= durationMs;
    }
    parseDurationToSeconds(duration) {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match)
            return 300; // 5 minutes default
        const value = parseInt(match[1]);
        const unit = match[2];
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 3600;
            case 'd':
                return value * 86400;
            default:
                return 300;
        }
    }
    parseDurationToMilliseconds(duration) {
        return this.parseDurationToSeconds(duration) * 1000;
    }
    calculateAlertFingerprint(rule, labels) {
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        const input = `${rule.id}:${labelStr}`;
        return require('crypto').createHash('md5').update(input).digest('hex');
    }
    formatAlertMessage(rule, value, labels) {
        let message = rule.annotations.summary || rule.name;
        // Replace template variables
        message = message.replace(/\{\{\s*\.Value\s*\}\}/g, value.toString());
        message = message.replace(/\{\{\s*\.Labels\.(\w+)\s*\}\}/g, (match, labelName) => {
            return labels[labelName] || 'unknown';
        });
        return message;
    }
    async routeAlert(alert) {
        const destinations = await this.getMatchingDestinations(alert);
        for (const destination of destinations) {
            try {
                await this.sendAlert(alert, destination);
            }
            catch (error) {
                logger_js_1.default.error('Failed to send alert to destination', {
                    alertId: alert.id,
                    destinationId: destination.id,
                    error: error.message,
                });
            }
        }
    }
    async getMatchingDestinations(alert) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT * FROM alert_destinations WHERE enabled = true
      `);
            return result.rows
                .map((row) => ({
                id: row.id,
                name: row.name,
                type: row.type,
                config: row.config,
                severityFilter: row.severity_filter || [],
                tenantFilter: row.tenant_filter,
                enabled: row.enabled,
            }))
                .filter((dest) => {
                // Filter by severity
                if (dest.severityFilter.length > 0 &&
                    !dest.severityFilter.includes(alert.severity)) {
                    return false;
                }
                // Filter by tenant
                if (dest.tenantFilter && dest.tenantFilter.length > 0) {
                    return dest.tenantFilter.includes(alert.tenantId || '');
                }
                return true;
            });
        }
        finally {
            client.release();
        }
    }
    async sendAlert(alert, destination) {
        switch (destination.type) {
            case 'pagerduty':
                await this.sendPagerDutyAlert(alert, destination.config);
                break;
            case 'slack':
                await this.sendSlackAlert(alert, destination.config);
                break;
            case 'email':
                await this.sendEmailAlert(alert, destination.config);
                break;
            case 'webhook':
                await this.sendWebhookAlert(alert, destination.config);
                break;
        }
    }
    async sendPagerDutyAlert(alert, config) {
        const payload = {
            routing_key: config.integration_key,
            event_action: alert.status === 'firing' ? 'trigger' : 'resolve',
            dedup_key: alert.fingerprint,
            payload: {
                summary: alert.message,
                severity: alert.severity,
                source: 'Conductor Omniversal',
                component: alert.labels.component || 'unknown',
                group: alert.labels.service || 'unknown',
                class: alert.ruleName,
                custom_details: {
                    ...alert.labels,
                    ...alert.annotations,
                },
            },
        };
        const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`PagerDuty API error: ${response.statusText}`);
        }
    }
    async sendSlackAlert(alert, config) {
        const color = alert.severity === 'critical'
            ? 'danger'
            : alert.severity === 'warning'
                ? 'warning'
                : 'good';
        const payload = {
            text: `🚨 ${alert.severity.toUpperCase()} Alert`,
            attachments: [
                {
                    color,
                    title: alert.ruleName,
                    text: alert.message,
                    fields: [
                        { title: 'Severity', value: alert.severity, short: true },
                        { title: 'Status', value: alert.status, short: true },
                        {
                            title: 'Started At',
                            value: alert.startsAt.toISOString(),
                            short: true,
                        },
                    ],
                    actions: [
                        {
                            type: 'button',
                            text: 'View Details',
                            url: alert.generatorUrl,
                        },
                    ],
                },
            ],
        };
        const response = await fetch(config.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Slack webhook error: ${response.statusText}`);
        }
    }
    async sendEmailAlert(alert, config) {
        // Queue email for processing
        const emailPayload = {
            to: config.recipients,
            subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
            body: this.formatEmailBody(alert),
            html: this.formatEmailHTML(alert),
        };
        await this.redis.lpush('email_queue', JSON.stringify(emailPayload));
    }
    async sendWebhookAlert(alert, config) {
        const payload = {
            alert,
            timestamp: new Date().toISOString(),
            version: 'v1',
        };
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error(`Webhook error: ${response.statusText}`);
        }
    }
    async handleCriticalAlert(alert) {
        // Auto-escalate critical alerts
        const onCallUsers = await this.getCurrentOnCall();
        // Create escalation record
        const escalationId = `esc-${Date.now()}`;
        await this.redis.hset('active_escalations', escalationId, JSON.stringify({
            alertId: alert.id,
            level: 1,
            onCallUsers,
            startedAt: new Date(),
            acknowledgedBy: null,
        }));
        // Schedule escalation timeout
        await this.redis.zadd('escalation_timeouts', Date.now() + 15 * 60 * 1000, // 15 minutes
        escalationId);
        logger_js_1.default.error('Critical alert - escalation initiated', {
            alertId: alert.id,
            escalationId,
            onCallUsers,
        });
    }
    formatEmailBody(alert) {
        return `
Alert: ${alert.ruleName}
Severity: ${alert.severity}
Status: ${alert.status}
Message: ${alert.message}
Started At: ${alert.startsAt.toISOString()}

Labels:
${Object.entries(alert.labels)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n')}

View Details: ${alert.generatorUrl}
    `.trim();
    }
    formatEmailHTML(alert) {
        const severityColor = alert.severity === 'critical'
            ? '#dc3545'
            : alert.severity === 'warning'
                ? '#ffc107'
                : '#28a745';
        return `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: ${severityColor};">🚨 ${alert.severity.toUpperCase()} Alert</h2>
  <h3>${alert.ruleName}</h3>
  <p>${alert.message}</p>
  
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Severity</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${alert.severity}</td></tr>
    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Status</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${alert.status}</td></tr>
    <tr><td style="border: 1px solid #ddd; padding: 8px;"><strong>Started At</strong></td><td style="border: 1px solid #ddd; padding: 8px;">${alert.startsAt.toISOString()}</td></tr>
  </table>
  
  <p><a href="${alert.generatorUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>
</div>
    `.trim();
    }
    async sendResolutionNotification(alert) {
        // Send resolution to same destinations that received the alert
        const destinations = await this.getMatchingDestinations(alert);
        for (const destination of destinations) {
            try {
                if (destination.type === 'pagerduty') {
                    await this.sendPagerDutyAlert(alert, destination.config);
                }
                // Add other resolution notifications as needed
            }
            catch (error) {
                logger_js_1.default.error('Failed to send resolution notification', {
                    alertId: alert.id,
                    destinationId: destination.id,
                    error: error.message,
                });
            }
        }
    }
    async performRotation(scheduleId, rotation) {
        // Rotate to next on-call
        const newRotation = {
            ...rotation,
            currentOnCall: rotation.nextOnCall,
            nextOnCall: rotation.currentOnCall, // Simple rotation
            rotationAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        };
        await this.redis.hset('oncall_rotations', scheduleId, JSON.stringify(newRotation));
        logger_js_1.default.info('On-call rotation performed', {
            scheduleId,
            previousOnCall: rotation.currentOnCall,
            newOnCall: newRotation.currentOnCall,
        });
    }
    async storeAlert(alert) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        INSERT INTO alerts (
          id, rule_id, rule_name, severity, status, message, labels,
          annotations, starts_at, tenant_id, fingerprint, generator_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
                alert.id,
                alert.ruleId,
                alert.ruleName,
                alert.severity,
                alert.status,
                alert.message,
                JSON.stringify(alert.labels),
                JSON.stringify(alert.annotations),
                alert.startsAt,
                alert.tenantId,
                alert.fingerprint,
                alert.generatorUrl,
            ]);
        }
        finally {
            client.release();
        }
    }
    async updateAlert(alert) {
        const client = await this.pool.connect();
        try {
            await client.query(`
        UPDATE alerts 
        SET status = $1, ends_at = $2, updated_at = NOW()
        WHERE id = $3
      `, [alert.status, alert.endsAt, alert.id]);
        }
        finally {
            client.release();
        }
    }
    async loadActiveAlerts() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
        SELECT * FROM alerts WHERE status = 'firing' AND ends_at IS NULL
      `);
            for (const row of result.rows) {
                const alert = {
                    id: row.id,
                    ruleId: row.rule_id,
                    ruleName: row.rule_name,
                    severity: row.severity,
                    status: row.status,
                    message: row.message,
                    labels: row.labels || {},
                    annotations: row.annotations || {},
                    startsAt: row.starts_at,
                    endsAt: row.ends_at,
                    tenantId: row.tenant_id,
                    fingerprint: row.fingerprint,
                    generatorUrl: row.generator_url,
                };
                this.activeAlerts.set(alert.fingerprint, alert);
            }
            logger_js_1.default.info(`Loaded ${this.activeAlerts.size} active alerts`);
        }
        finally {
            client.release();
        }
    }
    startAlertEvaluationLoop() {
        // Evaluate alerts every 30 seconds
        setInterval(() => {
            this.evaluateAlertRules().catch((error) => {
                logger_js_1.default.error('Alert evaluation loop error', { error: error.message });
            });
        }, 30000);
        logger_js_1.default.info('Alert evaluation loop started');
    }
}
exports.AlertingEngine = AlertingEngine;
