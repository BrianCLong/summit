// @ts-nocheck
import express from 'express';
import { planShare } from '../sharing/preview.js';
import {
  acceptReviewerInvite,
  accessViaToken,
  ensureActionAllowed,
  getAuditLog,
  inviteReviewer,
  issueShareLink,
  listShareLinksByScope,
  revokeShareToken,
} from '../sharing/service.js';
import {
  createFeedback,
  createLabel,
  getLabel,
  listFeedback,
  listInvites,
  listLabelsByScope,
  recordAudit,
  resendInvite,
  resetStore,
  revokeInvite,
} from '../sharing/store.js';
import { applyDownloadHeaders, ensureDownloadAllowed } from '../sharing/downloads.js';
import { SharingScope } from '../sharing/types.js';
import { validateShareToken } from '../sharing/service.js';

const router = express.Router();

router.post('/share-links/preview', (req, res) => {
  const { scope, resources, permissions, labelId } = req.body;
  const plan = planShare({ scope, resources, permissions, labelId });
  recordAudit('share.preview', { planHash: plan.planHash }, req.headers['x-correlation-id'] as string);
  res.json(plan);
});

router.post('/share-links', (req, res) => {
  const { scope, resourceType, resourceId, expiresAt, permissions, createdBy, labelId, watermark } = req.body;
  const plan = planShare({ scope, resources: [resourceId], permissions, labelId });
  const { link, token } = issueShareLink({
    scope,
    resourceType,
    resourceId,
    expiresAt: new Date(expiresAt),
    permissions,
    createdBy,
    labelId,
  });
  res.status(201).json({ link, token, planHash: plan.planHash });
});

router.get('/share-links', (req, res) => {
  const scope = (req.query.scope as any) ? JSON.parse(String((req.query.scope as any))) : undefined;
  const list = listShareLinksByScope(scope as SharingScope | undefined);
  res.json(list);
});

router.post('/share-links/:id/revoke', (req, res) => {
  const revoked = revokeShareToken(req.params.id, req.body?.reason);
  if (!revoked) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(revoked);
});

router.get('/share/:token', (req, res) => {
  try {
    const link = accessViaToken(req.params.token);
    if ((req.query.download as any)) {
      ensureDownloadAllowed(link);
      applyDownloadHeaders(res, link);
      res.status(200).send(`download:${link.resourceId}`);
      return;
    }
    res.json({
      resourceId: link.resourceId,
      resourceType: link.resourceType,
      permissions: link.permissions,
      label: getLabel(link.labelId),
    });
  } catch (error: any) {
    const status = error.statusCode || 403;
    recordAudit('share.denied', { reason: error.message }, req.headers['x-correlation-id'] as string);
    res.status(status).json({ error: error.message });
  }
});

router.post('/share/:token/comment', (req, res) => {
  try {
    const link = accessViaToken(req.params.token);
    ensureActionAllowed(link, 'comment');
    const feedback = createFeedback({
      shareLinkId: link.id,
      resourceRef: link.resourceId,
      anchor: req.body.anchor || 'root',
      body: req.body.body,
      author: req.body.author || 'anonymous',
    });
    res.status(201).json(feedback);
  } catch (error: any) {
    res.status(error.statusCode || 403).json({ error: error.message });
  }
});

router.post('/share/:token/feedback', (req, res) => {
  try {
    const link = validateShareToken(req.params.token);
    ensureActionAllowed(link, 'comment');
    const feedback = createFeedback({
      shareLinkId: link.id,
      resourceRef: req.body.resourceRef || link.resourceId,
      anchor: req.body.anchor,
      body: req.body.body,
      author: req.body.author,
      threadId: req.body.threadId,
    });
    res.status(201).json(feedback);
  } catch (error: any) {
    res.status(error.statusCode || 403).json({ error: error.message });
  }
});

router.get('/share/:token/feedback', (req, res) => {
  try {
    const link = validateShareToken(req.params.token);
    const records = listFeedback(link.id);
    res.json(records);
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
});

router.post('/reviewers/invite', (req, res) => {
  const { email, scope, resources, expiresAt } = req.body;
  const invite = inviteReviewer({ email, scope, resources, expiresAt: new Date(expiresAt) });
  res.status(201).json(invite);
});

router.post('/reviewers/invite/:id/resend', (req, res) => {
  const invite = resendInvite(req.params.id);
  if (!invite) return res.status(404).json({ error: 'not_found' });
  res.json(invite);
});

router.post('/reviewers/invite/:id/revoke', (req, res) => {
  const invite = revokeInvite(req.params.id);
  if (!invite) return res.status(404).json({ error: 'not_found' });
  res.json(invite);
});

router.post('/reviewers/invite/:id/accept', (req, res) => {
  const result = acceptReviewerInvite(req.params.id);
  if (!result) return res.status(404).json({ error: 'not_found' });
  res.json(result);
});

router.get('/reviewers/invites', (req, res) => {
  const scope = (req.query.scope as any) ? JSON.parse(String((req.query.scope as any))) : undefined;
  res.json(listInvites(scope as SharingScope | undefined));
});

router.post('/sharing/labels', (req, res) => {
  const label = createLabel({
    classification: req.body.classification,
    handling: req.body.handling,
    distribution: req.body.distribution,
    caseId: req.body.caseId,
    generatedFor: req.body.generatedFor,
    generatedAt: req.body.generatedAt ? new Date(req.body.generatedAt) : new Date(),
  });
  res.status(201).json(label);
});

router.get('/sharing/labels', (req, res) => {
  const scope = (req.query.scope as any) ? JSON.parse(String((req.query.scope as any))) : undefined;
  res.json(listLabelsByScope(scope as SharingScope));
});

router.get('/sharing/audit', (_req, res) => {
  res.json(getAuditLog());
});

// internal helper for tests
router.post('/sharing/debug/reset', (_req, res) => {
  resetStore();
  res.status(204).send();
});

export default router;
