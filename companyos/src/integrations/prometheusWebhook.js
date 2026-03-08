"use strict";
/**
 * Prometheus Alertmanager Webhook Integration
 * Receives alerts from Prometheus Alertmanager and creates incidents/alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrometheusWebhookRouter = createPrometheusWebhookRouter;
const express_1 = require("express");
const alertService_1 = require("../services/alertService");
const sloService_1 = require("../services/sloService");
const incidentService_1 = require("../services/incidentService");
const alert_1 = require("../models/alert");
const incident_1 = require("../models/incident");
const slo_1 = require("../models/slo");
function createPrometheusWebhookRouter(db) {
    const router = (0, express_1.Router)();
    const alertService = new alertService_1.AlertService(db);
    const sloService = new sloService_1.SLOService(db);
    const incidentService = new incidentService_1.IncidentService(db);
    // Alertmanager webhook endpoint
    router.post('/prometheus-webhook', async (req, res) => {
        const payload = req.body;
        try {
            // Alertmanager sends alerts in groups
            if (!payload.alerts || !Array.isArray(payload.alerts)) {
                return res.status(400).json({ error: 'Invalid payload' });
            }
            for (const alert of payload.alerts) {
                await handleAlert(alert, payload.groupLabels);
            }
            res.json({ received: true, processed: payload.alerts.length });
        }
        catch (error) {
            console.error('Error handling Prometheus webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    async function handleAlert(alert, groupLabels) {
        const { status, labels = {}, annotations = {}, startsAt, endsAt, generatorURL, fingerprint, } = alert;
        console.log(`Prometheus alert: ${labels.alertname} [${status}]`);
        // Determine severity
        const severity = mapSeverity(labels.severity || annotations.severity || 'warning');
        // Create alert record
        const createdAlert = await alertService.createAlert({
            alertName: labels.alertname || 'Unknown Alert',
            alertSource: alert_1.AlertSource.PROMETHEUS,
            severity,
            serviceName: labels.service || labels.job,
            summary: annotations.summary || labels.alertname,
            description: annotations.description || annotations.message,
            labels,
            annotations,
            runbookUrl: annotations.runbook_url,
            dashboardUrl: generatorURL,
            fingerprint,
            groupKey: JSON.stringify(groupLabels),
            metadata: {
                startsAt,
                endsAt,
                status,
            },
        });
        // Handle SLO violations
        if (isSLOAlert(labels, annotations)) {
            await handleSLOViolation(createdAlert, labels, annotations);
        }
        // Auto-create incident for critical alerts
        if (severity === alert_1.AlertSeverity.CRITICAL && status === 'firing') {
            await autoCreateIncident(createdAlert, labels, annotations);
        }
        // Auto-resolve alert if status is resolved
        if (status === 'resolved') {
            await alertService.resolveAlert(createdAlert.id);
        }
    }
    function mapSeverity(severity) {
        switch (severity.toLowerCase()) {
            case 'critical':
            case 'page':
                return alert_1.AlertSeverity.CRITICAL;
            case 'warning':
            case 'warn':
                return alert_1.AlertSeverity.WARNING;
            case 'info':
            default:
                return alert_1.AlertSeverity.INFO;
        }
    }
    function isSLOAlert(labels, annotations) {
        return (labels.alertname?.toLowerCase().includes('slo') ||
            labels.slo_name ||
            annotations.slo_name);
    }
    async function handleSLOViolation(alert, labels, annotations) {
        const sloName = labels.slo_name || annotations.slo_name || labels.alertname;
        const serviceName = labels.service || labels.job || 'unknown';
        // Determine SLO type
        let sloType = slo_1.SLOType.AVAILABILITY;
        if (sloName.toLowerCase().includes('latency')) {
            sloType = slo_1.SLOType.LATENCY;
        }
        else if (sloName.toLowerCase().includes('error')) {
            sloType = slo_1.SLOType.ERROR_RATE;
        }
        else if (sloName.toLowerCase().includes('throughput')) {
            sloType = slo_1.SLOType.THROUGHPUT;
        }
        // Extract threshold and actual values
        const thresholdValue = parseFloat(labels.threshold || annotations.threshold || '0');
        const actualValue = parseFloat(labels.value || annotations.value || '0');
        // Create SLO violation
        await sloService.createViolation({
            sloName,
            sloType,
            serviceName,
            thresholdValue,
            actualValue,
            measurementWindow: labels.window || annotations.window,
            severity: alert.severity === alert_1.AlertSeverity.CRITICAL
                ? slo_1.ViolationSeverity.CRITICAL
                : slo_1.ViolationSeverity.WARNING,
            prometheusQuery: annotations.query,
            prometheusValueJson: { labels, annotations },
            metadata: {
                alertId: alert.id,
                fingerprint: alert.fingerprint,
            },
        });
    }
    async function autoCreateIncident(alert, labels, annotations) {
        // Check if incident already exists for this alert
        const existingIncidents = await db.query('SELECT id FROM maestro.incidents WHERE status NOT IN ($1, $2) AND metadata->\'alertFingerprint\' = $3', ['resolved', 'closed', alert.fingerprint]);
        if (existingIncidents.rows.length > 0) {
            // Link alert to existing incident
            await alertService.linkToIncident(alert.id, existingIncidents.rows[0].id);
            return;
        }
        // Determine incident severity
        const incidentSeverity = mapIncidentSeverity(alert.severity, labels);
        // Create new incident
        const incident = await incidentService.createIncident({
            title: `[AUTO] ${labels.alertname}: ${annotations.summary || ''}`,
            description: annotations.description || annotations.message || '',
            severity: incidentSeverity,
            affectedServices: [labels.service || labels.job].filter(Boolean),
            impactDescription: annotations.impact,
            customerImpact: shouldFlagCustomerImpact(labels, annotations),
            createdBy: 'alertmanager-auto',
            metadata: {
                alertFingerprint: alert.fingerprint,
                autoCreated: true,
                source: 'prometheus',
            },
        });
        // Link alert to incident
        await alertService.linkToIncident(alert.id, incident.id);
        console.log(`Auto-created incident ${incident.id} for critical alert ${labels.alertname}`);
    }
    function mapIncidentSeverity(alertSeverity, labels) {
        // Check for explicit severity label
        if (labels.incident_severity) {
            return labels.incident_severity;
        }
        // Map alert severity to incident severity
        if (alertSeverity === alert_1.AlertSeverity.CRITICAL) {
            return labels.service?.includes('api') || labels.customer_facing === 'true'
                ? incident_1.IncidentSeverity.SEV1
                : incident_1.IncidentSeverity.SEV2;
        }
        return incident_1.IncidentSeverity.SEV3;
    }
    function shouldFlagCustomerImpact(labels, annotations) {
        return (labels.customer_facing === 'true' ||
            labels.customer_impact === 'true' ||
            annotations.customer_impact === 'true' ||
            labels.service?.includes('api') ||
            labels.service?.includes('web'));
    }
    return router;
}
