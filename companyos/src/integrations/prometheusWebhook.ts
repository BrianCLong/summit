/**
 * Prometheus Alertmanager Webhook Integration
 * Receives alerts from Prometheus Alertmanager and creates incidents/alerts
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { AlertService } from '../services/alertService';
import { SLOService } from '../services/sloService';
import { IncidentService } from '../services/incidentService';
import { AlertSeverity, AlertSource } from '../models/alert';
import { IncidentSeverity } from '../models/incident';
import { SLOType, ViolationSeverity } from '../models/slo';

export function createPrometheusWebhookRouter(db: Pool): Router {
  const router = Router();
  const alertService = new AlertService(db);
  const sloService = new SLOService(db);
  const incidentService = new IncidentService(db);

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
    } catch (error) {
      console.error('Error handling Prometheus webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  async function handleAlert(alert: any, groupLabels: any) {
    const {
      status,
      labels = {},
      annotations = {},
      startsAt,
      endsAt,
      generatorURL,
      fingerprint,
    } = alert;

    console.log(`Prometheus alert: ${labels.alertname} [${status}]`);

    // Determine severity
    const severity = mapSeverity(labels.severity || annotations.severity || 'warning');

    // Create alert record
    const createdAlert = await alertService.createAlert({
      alertName: labels.alertname || 'Unknown Alert',
      alertSource: AlertSource.PROMETHEUS,
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
    if (severity === AlertSeverity.CRITICAL && status === 'firing') {
      await autoCreateIncident(createdAlert, labels, annotations);
    }

    // Auto-resolve alert if status is resolved
    if (status === 'resolved') {
      await alertService.resolveAlert(createdAlert.id);
    }
  }

  function mapSeverity(severity: string): AlertSeverity {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'page':
        return AlertSeverity.CRITICAL;
      case 'warning':
      case 'warn':
        return AlertSeverity.WARNING;
      case 'info':
      default:
        return AlertSeverity.INFO;
    }
  }

  function isSLOAlert(labels: any, annotations: any): boolean {
    return (
      labels.alertname?.toLowerCase().includes('slo') ||
      labels.slo_name ||
      annotations.slo_name
    );
  }

  async function handleSLOViolation(alert: any, labels: any, annotations: any) {
    const sloName = labels.slo_name || annotations.slo_name || labels.alertname;
    const serviceName = labels.service || labels.job || 'unknown';

    // Determine SLO type
    let sloType: SLOType = SLOType.AVAILABILITY;
    if (sloName.toLowerCase().includes('latency')) {
      sloType = SLOType.LATENCY;
    } else if (sloName.toLowerCase().includes('error')) {
      sloType = SLOType.ERROR_RATE;
    } else if (sloName.toLowerCase().includes('throughput')) {
      sloType = SLOType.THROUGHPUT;
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
      severity: alert.severity === AlertSeverity.CRITICAL
        ? ViolationSeverity.CRITICAL
        : ViolationSeverity.WARNING,
      prometheusQuery: annotations.query,
      prometheusValueJson: { labels, annotations },
      metadata: {
        alertId: alert.id,
        fingerprint: alert.fingerprint,
      },
    });
  }

  async function autoCreateIncident(alert: any, labels: any, annotations: any) {
    // Check if incident already exists for this alert
    const existingIncidents = await db.query(
      'SELECT id FROM maestro.incidents WHERE status NOT IN ($1, $2) AND metadata->\'alertFingerprint\' = $3',
      ['resolved', 'closed', alert.fingerprint]
    );

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

  function mapIncidentSeverity(alertSeverity: AlertSeverity, labels: any): IncidentSeverity {
    // Check for explicit severity label
    if (labels.incident_severity) {
      return labels.incident_severity as IncidentSeverity;
    }

    // Map alert severity to incident severity
    if (alertSeverity === AlertSeverity.CRITICAL) {
      return labels.service?.includes('api') || labels.customer_facing === 'true'
        ? IncidentSeverity.SEV1
        : IncidentSeverity.SEV2;
    }

    return IncidentSeverity.SEV3;
  }

  function shouldFlagCustomerImpact(labels: any, annotations: any): boolean {
    return (
      labels.customer_facing === 'true' ||
      labels.customer_impact === 'true' ||
      annotations.customer_impact === 'true' ||
      labels.service?.includes('api') ||
      labels.service?.includes('web')
    );
  }

  return router;
}
