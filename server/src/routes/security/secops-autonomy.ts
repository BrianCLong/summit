import express from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../../middleware/auth.js';
import {
  evaluatePolicy,
  policyBundleMetadata,
  SecOpsMode,
  alertSchema,
  agentActionSchema,
  eventSchema,
  incidentSchema
} from '@intelgraph/security-agents';

const router = express.Router();

const ingestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('alert'),
    payload: alertSchema
  }),
  z.object({
    kind: z.literal('event'),
    payload: eventSchema
  })
]);

const runRequestSchema = z.object({
  mode: z.enum(['read_advise', 'recommend_plan', 'act']),
  workflow: z.string(),
  incidentId: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  approvals: z.array(z.string()).optional(),
  scopes: z.array(z.string()).default([]),
  impact: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

const policyEvalSchema = z.object({
  mode: z.enum(['read_advise', 'recommend_plan', 'act']),
  action: z.string(),
  scopes: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([]),
  approvals: z.array(z.string()).optional(),
  impact: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const incidentStore: z.infer<typeof incidentSchema>[] = [];

router.post('/ingest', ensureAuthenticated, (req, res) => {
  const parsed = ingestSchema.parse(req.body);
  const now = new Date().toISOString();

  if (parsed.kind === 'alert') {
    const alert = parsed.payload;
    const incident = incidentStore.find((item) => item.id === alert.id);

    if (!incident) {
      incidentStore.push(
        incidentSchema.parse({
          id: alert.id,
          title: alert.title,
          hypothesis: alert.description,
          severity: alert.severity,
          alerts: [alert],
          events: [],
          findings: [],
          assets: [],
          actions: [],
          createdAt: now
        })
      );
    } else {
      incident.alerts.push(alert);
    }
  } else {
    const event = parsed.payload;
    const incident = incidentStore.find((item) => item.id === event.id);

    if (!incident) {
      incidentStore.push(
        incidentSchema.parse({
          id: event.id,
          title: `Event: ${event.category}`,
          hypothesis: `Event observed: ${event.category}`,
          severity: 'medium',
          alerts: [],
          events: [event],
          findings: [],
          assets: [],
          actions: [],
          createdAt: now
        })
      );
    } else {
      incident.events.push(event);
    }
  }

  res.json({
    status: 'received',
    kind: parsed.kind,
    payload: parsed.payload,
    audit: {
      evidence: [parsed.payload.id],
      mode: 'read_advise'
    }
  });
});

router.get('/incidents', ensureAuthenticated, (_req, res) => {
  res.json({ incidents: incidentStore });
});

router.post('/incidents', ensureAuthenticated, (req, res) => {
  const incident = incidentSchema.parse(req.body);
  incidentStore.push(incident);
  res.status(201).json({ incident });
});

router.get('/incidents/:id', ensureAuthenticated, (req, res) => {
  const incident = incidentStore.find((item) => item.id === req.params.id);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }
  res.json({ incident });
});

router.post('/agents/run', ensureAuthenticated, (req, res) => {
  const payload = runRequestSchema.parse(req.body);
  const incident = incidentStore.find((item) => item.id === payload.incidentId);
  if (!incident) {
    res.status(404).json({ error: 'Incident not found' });
    return;
  }

  const tenantId = (req.headers['x-tenant-id'] as string) ?? 'unknown';
  const decision = evaluatePolicy({
    tenantId,
    actor: req.user?.id || 'unknown',
    mode: payload.mode as SecOpsMode,
    action: payload.workflow,
    scopes: payload.scopes,
    evidenceIds: payload.evidenceIds,
    approvals: payload.approvals,
    impact: payload.impact
  });

  const action = agentActionSchema.parse({
    id: `${payload.workflow}-${Date.now()}`,
    actorId: req.user?.id || 'unknown',
    mode: payload.mode,
    action: payload.workflow,
    evidenceIds: payload.evidenceIds,
    policyDecision: decision.decision,
    occurredAt: new Date().toISOString()
  });

  incident.actions.push(action);

  res.json({
    incidentId: incident.id,
    decision,
    actions: incident.actions,
    audit: {
      mode: payload.mode,
      approvals: payload.approvals || [],
      evidenceIds: payload.evidenceIds
    }
  });
});

router.post('/policies/evaluate', ensureAuthenticated, (req, res) => {
  const payload = policyEvalSchema.parse(req.body);
  const tenantId = (req.headers['x-tenant-id'] as string) ?? 'unknown';
  const decision = evaluatePolicy({
    tenantId,
    actor: req.user?.id || 'unknown',
    mode: payload.mode as SecOpsMode,
    action: payload.action,
    scopes: payload.scopes,
    evidenceIds: payload.evidenceIds,
    approvals: payload.approvals,
    impact: payload.impact
  });

  res.json({
    decision,
    bundle: policyBundleMetadata
  });
});

export default router;
