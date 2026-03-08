"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const preview_js_1 = require("../sharing/preview.js");
const service_js_1 = require("../sharing/service.js");
const store_js_1 = require("../sharing/store.js");
const downloads_js_1 = require("../sharing/downloads.js");
const service_js_2 = require("../sharing/service.js");
const router = express_1.default.Router();
router.post('/share-links/preview', (req, res) => {
    const { scope, resources, permissions, labelId } = req.body;
    const plan = (0, preview_js_1.planShare)({ scope, resources, permissions, labelId });
    (0, store_js_1.recordAudit)('share.preview', { planHash: plan.planHash }, req.headers['x-correlation-id']);
    res.json(plan);
});
router.post('/share-links', (req, res) => {
    const { scope, resourceType, resourceId, expiresAt, permissions, createdBy, labelId, watermark } = req.body;
    const plan = (0, preview_js_1.planShare)({ scope, resources: [resourceId], permissions, labelId });
    const { link, token } = (0, service_js_1.issueShareLink)({
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
    const scope = req.query.scope ? JSON.parse(String(req.query.scope)) : undefined;
    const list = (0, service_js_1.listShareLinksByScope)(scope);
    res.json(list);
});
router.post('/share-links/:id/revoke', (req, res) => {
    const revoked = (0, service_js_1.revokeShareToken)(req.params.id, req.body?.reason);
    if (!revoked) {
        res.status(404).json({ error: 'not_found' });
        return;
    }
    res.json(revoked);
});
router.get('/share/:token', (req, res) => {
    try {
        const link = (0, service_js_1.accessViaToken)(req.params.token);
        if (req.query.download) {
            (0, downloads_js_1.ensureDownloadAllowed)(link);
            (0, downloads_js_1.applyDownloadHeaders)(res, link);
            res.status(200).send(`download:${link.resourceId}`);
            return;
        }
        res.json({
            resourceId: link.resourceId,
            resourceType: link.resourceType,
            permissions: link.permissions,
            label: (0, store_js_1.getLabel)(link.labelId),
        });
    }
    catch (error) {
        const status = error.statusCode || 403;
        (0, store_js_1.recordAudit)('share.denied', { reason: error.message }, req.headers['x-correlation-id']);
        res.status(status).json({ error: error.message });
    }
});
router.post('/share/:token/comment', (req, res) => {
    try {
        const link = (0, service_js_1.accessViaToken)(req.params.token);
        (0, service_js_1.ensureActionAllowed)(link, 'comment');
        const feedback = (0, store_js_1.createFeedback)({
            shareLinkId: link.id,
            resourceRef: link.resourceId,
            anchor: req.body.anchor || 'root',
            body: req.body.body,
            author: req.body.author || 'anonymous',
        });
        res.status(201).json(feedback);
    }
    catch (error) {
        res.status(error.statusCode || 403).json({ error: error.message });
    }
});
router.post('/share/:token/feedback', (req, res) => {
    try {
        const link = (0, service_js_2.validateShareToken)(req.params.token);
        (0, service_js_1.ensureActionAllowed)(link, 'comment');
        const feedback = (0, store_js_1.createFeedback)({
            shareLinkId: link.id,
            resourceRef: req.body.resourceRef || link.resourceId,
            anchor: req.body.anchor,
            body: req.body.body,
            author: req.body.author,
            threadId: req.body.threadId,
        });
        res.status(201).json(feedback);
    }
    catch (error) {
        res.status(error.statusCode || 403).json({ error: error.message });
    }
});
router.get('/share/:token/feedback', (req, res) => {
    try {
        const link = (0, service_js_2.validateShareToken)(req.params.token);
        const records = (0, store_js_1.listFeedback)(link.id);
        res.json(records);
    }
    catch (error) {
        res.status(403).json({ error: error.message });
    }
});
router.post('/reviewers/invite', (req, res) => {
    const { email, scope, resources, expiresAt } = req.body;
    const invite = (0, service_js_1.inviteReviewer)({ email, scope, resources, expiresAt: new Date(expiresAt) });
    res.status(201).json(invite);
});
router.post('/reviewers/invite/:id/resend', (req, res) => {
    const invite = (0, store_js_1.resendInvite)(req.params.id);
    if (!invite)
        return res.status(404).json({ error: 'not_found' });
    res.json(invite);
});
router.post('/reviewers/invite/:id/revoke', (req, res) => {
    const invite = (0, store_js_1.revokeInvite)(req.params.id);
    if (!invite)
        return res.status(404).json({ error: 'not_found' });
    res.json(invite);
});
router.post('/reviewers/invite/:id/accept', (req, res) => {
    const result = (0, service_js_1.acceptReviewerInvite)(req.params.id);
    if (!result)
        return res.status(404).json({ error: 'not_found' });
    res.json(result);
});
router.get('/reviewers/invites', (req, res) => {
    const scope = req.query.scope ? JSON.parse(String(req.query.scope)) : undefined;
    res.json((0, store_js_1.listInvites)(scope));
});
router.post('/sharing/labels', (req, res) => {
    const label = (0, store_js_1.createLabel)({
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
    const scope = req.query.scope ? JSON.parse(String(req.query.scope)) : undefined;
    res.json((0, store_js_1.listLabelsByScope)(scope));
});
router.get('/sharing/audit', (_req, res) => {
    res.json((0, service_js_1.getAuditLog)());
});
// internal helper for tests
router.post('/sharing/debug/reset', (_req, res) => {
    (0, store_js_1.resetStore)();
    res.status(204).send();
});
exports.default = router;
