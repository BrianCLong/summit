import express from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { DataStore } from './store.js';

const PORT = process.env.PORT || 4000;
const store = new DataStore();
await store.init();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const roles = new Set(['admin', 'reviewer', 'auditor']);

function requireIdentity(req, res, next) {
  const actorId = req.header('x-user-id');
  const actorRole = req.header('x-user-role');
  const actorName = req.header('x-user-name') ?? 'unknown';

  if (!actorId || !actorRole) {
    return res.status(400).json({ error: 'x-user-id and x-user-role headers are required.' });
  }

  if (!roles.has(actorRole)) {
    return res.status(403).json({ error: `Invalid role: ${actorRole}` });
  }

  req.actor = { id: actorId, role: actorRole, name: actorName };
  next();
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.actor) {
      return res.status(500).json({ error: 'Identity middleware misconfigured.' });
    }

    if (!allowed.includes(req.actor.role)) {
      return res.status(403).json({ error: 'You are not authorized for this action.' });
    }

    next();
  };
}

async function recordAudit({ actor, action, targetType, targetId, details }) {
  await store.addAuditLog({
    id: uuid(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    targetType,
    targetId,
    details
  });
}

function sanitizeAppeal(appeal) {
  if (!appeal) return null;
  return {
    ...appeal,
    approvals: appeal.approvals ?? [],
    evidence: appeal.evidence ?? [],
    policySuggestions: appeal.policySuggestions ?? []
  };
}

app.get('/healthz', (_, res) => {
  res.json({ status: 'ok' });
});

app.get('/appeals', requireIdentity, (req, res) => {
  const { status } = req.query;
  const appeals = store
    .listAppeals()
    .filter((appeal) => (status ? appeal.status === status : true))
    .map(sanitizeAppeal)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json({ appeals });
});

app.get('/appeals/:id', requireIdentity, (req, res) => {
  const appeal = sanitizeAppeal(store.getAppeal(req.params.id));
  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }
  res.json({ appeal });
});

app.post('/appeals', requireIdentity, requireRole('admin', 'reviewer'), async (req, res) => {
  const { title, description, submittedBy, metadata } = req.body;

  if (!title || !description || !submittedBy) {
    return res.status(400).json({ error: 'title, description, and submittedBy are required.' });
  }

  const appeal = {
    id: uuid(),
    title,
    description,
    submittedBy,
    metadata: metadata ?? {},
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidence: [],
    approvals: [],
    policySuggestions: []
  };

  await store.upsertAppeal(appeal);
  await recordAudit({
    actor: req.actor,
    action: 'appeal:create',
    targetType: 'appeal',
    targetId: appeal.id,
    details: { title }
  });

  res.status(201).json({ appeal: sanitizeAppeal(appeal) });
});

app.post('/appeals/:id/queue', requireIdentity, requireRole('admin', 'reviewer'), async (req, res) => {
  const appeal = sanitizeAppeal(store.getAppeal(req.params.id));
  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  appeal.status = 'queued';
  appeal.updatedAt = new Date().toISOString();
  await store.upsertAppeal(appeal);

  await recordAudit({
    actor: req.actor,
    action: 'appeal:queue',
    targetType: 'appeal',
    targetId: appeal.id,
    details: {}
  });

  res.json({ appeal });
});

app.post('/appeals/:id/evidence', requireIdentity, requireRole('admin', 'reviewer'), async (req, res) => {
  const { label, description, url } = req.body;
  const appeal = sanitizeAppeal(store.getAppeal(req.params.id));

  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  if (!label) {
    return res.status(400).json({ error: 'label is required.' });
  }

  const attachment = {
    id: uuid(),
    label,
    description: description ?? '',
    url: url ?? null,
    addedAt: new Date().toISOString(),
    addedBy: req.actor
  };

  appeal.evidence.push(attachment);
  appeal.updatedAt = new Date().toISOString();
  await store.upsertAppeal(appeal);

  await recordAudit({
    actor: req.actor,
    action: 'appeal:evidence:add',
    targetType: 'appeal',
    targetId: appeal.id,
    details: { evidenceId: attachment.id }
  });

  res.status(201).json({ evidence: attachment, appeal });
});

app.post(
  '/appeals/:id/decision',
  requireIdentity,
  requireRole('admin', 'reviewer'),
  async (req, res) => {
    const { decision, comment } = req.body;
    const normalizedDecision = decision === 'approve' ? 'approve' : decision === 'deny' ? 'deny' : null;
    if (!normalizedDecision) {
      return res.status(400).json({ error: 'Decision must be approve or deny.' });
    }

    const appeal = sanitizeAppeal(store.getAppeal(req.params.id));
    if (!appeal) {
      return res.status(404).json({ error: 'Appeal not found' });
    }

    if (appeal.approvals.some((entry) => entry.actor.id === req.actor.id)) {
      return res.status(409).json({ error: 'Dual-control enforced: actor has already recorded a decision.' });
    }

    const decisionEntry = {
      id: uuid(),
      actor: req.actor,
      decision: normalizedDecision,
      comment: comment ?? '',
      timestamp: new Date().toISOString()
    };

    appeal.approvals.push(decisionEntry);

    const approvalsByDecision = appeal.approvals.filter(
      (entry) => entry.decision === normalizedDecision
    );
    const uniqueActors = new Set(approvalsByDecision.map((entry) => entry.actor.id));

    if (uniqueActors.size >= 2) {
      appeal.status = normalizedDecision === 'approve' ? 'approved' : 'denied';
    }

    appeal.updatedAt = new Date().toISOString();
    await store.upsertAppeal(appeal);

    await recordAudit({
      actor: req.actor,
      action: 'appeal:decision',
      targetType: 'appeal',
      targetId: appeal.id,
      details: { decision: normalizedDecision }
    });

    res.json({ appeal, decision: decisionEntry });
  }
);

app.post('/appeals/:id/policy-suggestions', requireIdentity, requireRole('admin', 'reviewer'), async (req, res) => {
  const { summary, rationale } = req.body;
  const appeal = sanitizeAppeal(store.getAppeal(req.params.id));
  if (!appeal) {
    return res.status(404).json({ error: 'Appeal not found' });
  }

  if (!summary) {
    return res.status(400).json({ error: 'summary is required.' });
  }

  const suggestion = {
    id: uuid(),
    summary,
    rationale: rationale ?? '',
    createdAt: new Date().toISOString(),
    createdBy: req.actor,
    status: 'proposed'
  };

  appeal.policySuggestions.push(suggestion);
  appeal.updatedAt = new Date().toISOString();
  await store.upsertAppeal(appeal);

  await recordAudit({
    actor: req.actor,
    action: 'appeal:policy-suggestion',
    targetType: 'appeal',
    targetId: appeal.id,
    details: { suggestionId: suggestion.id }
  });

  res.status(201).json({ suggestion, appeal });
});

app.post('/policy-proposals', requireIdentity, requireRole('admin', 'reviewer'), async (req, res) => {
  const { title, summary, relatedAppealId } = req.body;
  if (!title || !summary) {
    return res.status(400).json({ error: 'title and summary are required.' });
  }

  const proposal = {
    id: uuid(),
    title,
    summary,
    relatedAppealId: relatedAppealId ?? null,
    createdAt: new Date().toISOString(),
    createdBy: req.actor,
    status: 'proposed',
    decisions: []
  };

  await store.addPolicyProposal(proposal);
  await recordAudit({
    actor: req.actor,
    action: 'policy:proposal:create',
    targetType: 'policy-proposal',
    targetId: proposal.id,
    details: { relatedAppealId }
  });

  res.status(201).json({ proposal });
});

app.get('/policy-proposals', requireIdentity, (req, res) => {
  const proposals = store.listPolicyProposals();
  res.json({ proposals });
});

app.post(
  '/policy-proposals/:id/decision',
  requireIdentity,
  requireRole('admin', 'reviewer'),
  async (req, res) => {
    const { disposition, comment } = req.body;
    const proposal = store.getPolicyProposal(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Policy proposal not found' });
    }

    if (!['advance', 'reject'].includes(disposition)) {
      return res.status(400).json({ error: 'Disposition must be advance or reject.' });
    }

    if (proposal.decisions.some((entry) => entry.actor.id === req.actor.id)) {
      return res
        .status(409)
        .json({ error: 'Dual-control enforced: actor has already recorded a decision.' });
    }

    const decisionEntry = {
      id: uuid(),
      actor: req.actor,
      disposition,
      comment: comment ?? '',
      timestamp: new Date().toISOString()
    };

    proposal.decisions.push(decisionEntry);
    const matching = proposal.decisions.filter((entry) => entry.disposition === disposition);
    const unique = new Set(matching.map((entry) => entry.actor.id));
    if (unique.size >= 2) {
      proposal.status = disposition === 'advance' ? 'advanced' : 'rejected';
    }

    await store.updatePolicyProposal(proposal);
    await recordAudit({
      actor: req.actor,
      action: 'policy:proposal:decision',
      targetType: 'policy-proposal',
      targetId: proposal.id,
      details: { disposition }
    });

    res.json({ proposal, decision: decisionEntry });
  }
);

app.get('/audit-log', requireIdentity, requireRole('admin', 'reviewer', 'auditor'), (req, res) => {
  const logs = store.snapshot.auditLogs;
  res.json({ logs });
});

app.get('/export', requireIdentity, requireRole('admin', 'reviewer'), (req, res) => {
  const snapshot = store.snapshot;
  res.json({ exportVersion: '1.0.0', payload: snapshot });
});

app.post('/import', requireIdentity, requireRole('admin'), async (req, res) => {
  const { exportVersion, payload } = req.body;
  if (!exportVersion || !payload) {
    return res.status(400).json({ error: 'exportVersion and payload are required.' });
  }

  if (!payload.appeals || !payload.policyProposals || !payload.auditLogs) {
    return res.status(400).json({ error: 'Invalid payload: missing collections.' });
  }

  await store.reset(payload);
  await recordAudit({
    actor: req.actor,
    action: 'system:import',
    targetType: 'system',
    targetId: 'state',
    details: { exportVersion }
  });

  res.json({ status: 'imported' });
});

app.get('/queue', requireIdentity, (req, res) => {
  const appeals = store
    .listAppeals()
    .filter((appeal) => ['pending', 'queued'].includes(appeal.status))
    .map(sanitizeAppeal)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  res.json({ queue: appeals });
});

app.listen(PORT, () => {
  console.log(`hil-review server listening on port ${PORT}`);
});
