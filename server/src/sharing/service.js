"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLog = exports.acceptReviewerInvite = exports.inviteReviewer = exports.ensureActionAllowed = exports.listShareLinksByScope = exports.revokeShareToken = exports.accessViaToken = exports.validateShareToken = exports.issueShareLink = void 0;
const permissions_js_1 = require("./permissions.js");
const revocation_js_1 = require("./revocation.js");
const store_js_1 = require("./store.js");
const utils_js_1 = require("./utils.js");
const issueShareLink = (input) => {
    const link = (0, store_js_1.createShareLink)(input);
    const token = (0, utils_js_1.signShareToken)({ linkId: link.id, scopeHash: link.scopeHash, aud: 'share' }, input.expiresAt);
    return { link, token };
};
exports.issueShareLink = issueShareLink;
const validateShareToken = (token) => {
    const payload = (0, utils_js_1.verifyShareToken)(token);
    const link = (0, store_js_1.getShareLink)(payload.linkId);
    if (!link)
        throw new Error('unknown_link');
    if (link.scopeHash !== payload.scopeHash)
        throw new Error('scope_mismatch');
    if ((0, revocation_js_1.isRevoked)(link.id, link.revokedAt))
        throw new Error('revoked');
    if (link.expiresAt.getTime() < Date.now())
        throw new Error('expired');
    return link;
};
exports.validateShareToken = validateShareToken;
const accessViaToken = (token) => {
    const link = (0, exports.validateShareToken)(token);
    (0, store_js_1.recordAudit)('share.access', { id: link.id });
    return link;
};
exports.accessViaToken = accessViaToken;
const revokeShareToken = (id, reason) => (0, store_js_1.revokeShareLink)(id, reason);
exports.revokeShareToken = revokeShareToken;
const listShareLinksByScope = (scope) => (0, store_js_1.listShareLinks)(scope);
exports.listShareLinksByScope = listShareLinksByScope;
const ensureActionAllowed = (link, permission) => {
    if (!(0, permissions_js_1.hasPermission)(link, permission)) {
        const error = new Error('forbidden');
        error.statusCode = 403;
        throw error;
    }
};
exports.ensureActionAllowed = ensureActionAllowed;
const inviteReviewer = (input) => (0, store_js_1.createInvite)(input);
exports.inviteReviewer = inviteReviewer;
const acceptReviewerInvite = (id) => (0, store_js_1.acceptInvite)(id);
exports.acceptReviewerInvite = acceptReviewerInvite;
const getAuditLog = () => (0, store_js_1.getAuditEvents)();
exports.getAuditLog = getAuditLog;
