"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePlan = exports.getRevocation = exports.cacheRevocation = exports.softDeleteFeedback = exports.listFeedback = exports.createFeedback = exports.acceptInvite = exports.resendInvite = exports.revokeInvite = exports.listInvites = exports.createInvite = exports.getShareLink = exports.revokeShareLink = exports.listShareLinks = exports.createShareLink = exports.getLabel = exports.listLabelsByScope = exports.createLabel = exports.getAuditEvents = exports.recordAudit = exports.resetStore = void 0;
const uuid_1 = require("uuid");
const utils_js_1 = require("./utils.js");
const shareLinks = new Map();
const reviewerInvites = new Map();
const reviewerSessions = new Map();
const labels = new Map();
const feedback = new Map();
const auditEvents = [];
const revocationCache = new Map();
const resetStore = () => {
    shareLinks.clear();
    reviewerInvites.clear();
    reviewerSessions.clear();
    labels.clear();
    feedback.clear();
    auditEvents.length = 0;
    revocationCache.clear();
};
exports.resetStore = resetStore;
const recordAudit = (type, details, correlationId) => {
    auditEvents.push({ type, details, correlationId, at: new Date() });
};
exports.recordAudit = recordAudit;
const getAuditEvents = () => auditEvents;
exports.getAuditEvents = getAuditEvents;
const createLabel = (payload) => {
    const id = (0, uuid_1.v4)();
    const label = { ...payload, id, generatedAt: payload.generatedAt || new Date() };
    labels.set(id, label);
    return label;
};
exports.createLabel = createLabel;
const listLabelsByScope = (scope) => {
    const scopeHash = (0, utils_js_1.computeScopeHash)(scope);
    return Array.from(labels.values()).filter((label) => (0, utils_js_1.computeScopeHash)({ tenantId: label.caseId || '', caseId: label.caseId }) === scopeHash);
};
exports.listLabelsByScope = listLabelsByScope;
const getLabel = (id) => (id ? labels.get(id) : undefined);
exports.getLabel = getLabel;
const createShareLink = (input) => {
    const id = (0, uuid_1.v4)();
    const scopeHash = (0, utils_js_1.computeScopeHash)(input.scope);
    const link = {
        id,
        scope: input.scope,
        scopeHash,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        permissions: input.permissions,
        createdBy: input.createdBy,
        createdAt: new Date(),
        expiresAt: input.expiresAt,
        labelId: input.labelId,
        watermark: input.watermark,
    };
    shareLinks.set(id, link);
    (0, exports.recordAudit)('share.created', { id, scopeHash, resourceId: input.resourceId });
    return link;
};
exports.createShareLink = createShareLink;
const listShareLinks = (scope) => {
    if (!scope)
        return Array.from(shareLinks.values());
    const scopeHash = (0, utils_js_1.computeScopeHash)(scope);
    return Array.from(shareLinks.values()).filter((link) => link.scopeHash === scopeHash);
};
exports.listShareLinks = listShareLinks;
const revokeShareLink = (id, reason) => {
    const link = shareLinks.get(id);
    if (!link)
        return undefined;
    const now = new Date();
    link.revokedAt = now;
    shareLinks.set(id, link);
    revocationCache.set(id, { revokedAt: now });
    (0, exports.recordAudit)('share.revoked', { id, reason });
    return link;
};
exports.revokeShareLink = revokeShareLink;
const getShareLink = (id) => shareLinks.get(id);
exports.getShareLink = getShareLink;
const createInvite = (input) => {
    const id = (0, uuid_1.v4)();
    const invite = {
        id,
        email: input.email,
        scope: input.scope,
        resources: input.resources,
        role: 'external_reviewer',
        expiresAt: input.expiresAt,
        status: 'pending',
        createdAt: new Date(),
    };
    reviewerInvites.set(id, invite);
    (0, exports.recordAudit)('reviewer.invited', { id, email: invite.email });
    return invite;
};
exports.createInvite = createInvite;
const listInvites = (scope) => {
    if (!scope)
        return Array.from(reviewerInvites.values());
    const scopeHash = (0, utils_js_1.computeScopeHash)(scope);
    return Array.from(reviewerInvites.values()).filter((invite) => (0, utils_js_1.computeScopeHash)(invite.scope) === scopeHash);
};
exports.listInvites = listInvites;
const revokeInvite = (id) => {
    const invite = reviewerInvites.get(id);
    if (!invite)
        return undefined;
    invite.status = 'revoked';
    reviewerInvites.set(id, invite);
    (0, exports.recordAudit)('reviewer.invite_revoked', { id });
    return invite;
};
exports.revokeInvite = revokeInvite;
const resendInvite = (id) => {
    const invite = reviewerInvites.get(id);
    if (!invite)
        return undefined;
    (0, exports.recordAudit)('reviewer.invite_resent', { id });
    return invite;
};
exports.resendInvite = resendInvite;
const acceptInvite = (id) => {
    const invite = reviewerInvites.get(id);
    if (!invite || invite.status !== 'pending' || invite.expiresAt.getTime() < Date.now())
        return undefined;
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    reviewerInvites.set(id, invite);
    const session = {
        id: (0, uuid_1.v4)(),
        inviteId: invite.id,
        scopeHash: (0, utils_js_1.computeScopeHash)(invite.scope),
        expiresAt: invite.expiresAt,
    };
    reviewerSessions.set(session.id, session);
    (0, exports.recordAudit)('reviewer.accepted', { id, sessionId: session.id });
    return { invite, session };
};
exports.acceptInvite = acceptInvite;
const createFeedback = (input) => {
    const id = (0, uuid_1.v4)();
    const record = { ...input, id, createdAt: new Date() };
    feedback.set(id, record);
    (0, exports.recordAudit)('feedback.created', { id, shareLinkId: record.shareLinkId });
    return record;
};
exports.createFeedback = createFeedback;
const listFeedback = (shareLinkId) => Array.from(feedback.values()).filter((item) => item.shareLinkId === shareLinkId && !item.deletedAt);
exports.listFeedback = listFeedback;
const softDeleteFeedback = (id) => {
    const record = feedback.get(id);
    if (!record)
        return undefined;
    record.deletedAt = new Date();
    feedback.set(id, record);
    return record;
};
exports.softDeleteFeedback = softDeleteFeedback;
const cacheRevocation = (id, revokedAt) => {
    revocationCache.set(id, { revokedAt });
};
exports.cacheRevocation = cacheRevocation;
const getRevocation = (id) => revocationCache.get(id);
exports.getRevocation = getRevocation;
const computePlan = (input) => {
    const warnings = [];
    if (!input.permissions.includes('view'))
        warnings.push('view permission missing');
    const plan = {
        resources: input.resources,
        permissions: input.permissions,
        labelId: input.labelId,
    };
    return {
        ...plan,
        warnings,
        planHash: (0, utils_js_1.planHash)(plan),
    };
};
exports.computePlan = computePlan;
