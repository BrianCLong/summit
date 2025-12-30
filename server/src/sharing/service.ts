import { hasPermission } from './permissions.js';
import { isRevoked } from './revocation.js';
import {
  acceptInvite,
  createInvite,
  createShareLink,
  getAuditEvents,
  getShareLink,
  listShareLinks,
  recordAudit,
  revokeShareLink,
} from './store.js';
import { signShareToken, verifyShareToken } from './utils.js';
import { Permission, ShareLink, SharingScope } from './types.js';

export const issueShareLink = (input: {
  scope: SharingScope;
  resourceType: ShareLink['resourceType'];
  resourceId: string;
  expiresAt: Date;
  permissions: Permission[];
  createdBy: string;
  labelId?: string;
}) => {
  const link = createShareLink(input);
  const token = signShareToken({ linkId: link.id, scopeHash: link.scopeHash, aud: 'share' }, input.expiresAt);
  return { link, token };
};

export const validateShareToken = (token: string) => {
  const payload = verifyShareToken(token);
  const link = getShareLink(payload.linkId);
  if (!link) {throw new Error('unknown_link');}
  if (link.scopeHash !== payload.scopeHash) {throw new Error('scope_mismatch');}
  if (isRevoked(link.id, link.revokedAt)) {throw new Error('revoked');}
  if (link.expiresAt.getTime() < Date.now()) {throw new Error('expired');}
  return link;
};

export const accessViaToken = (token: string) => {
  const link = validateShareToken(token);
  recordAudit('share.access', { id: link.id });
  return link;
};

export const revokeShareToken = (id: string, reason?: string) => revokeShareLink(id, reason);

export const listShareLinksByScope = (scope?: SharingScope) => listShareLinks(scope);

export const ensureActionAllowed = (link: ShareLink, permission: Permission) => {
  if (!hasPermission(link, permission)) {
    const error = new Error('forbidden');
    (error as any).statusCode = 403;
    throw error;
  }
};

export const inviteReviewer = (input: { email: string; scope: SharingScope; resources: string[]; expiresAt: Date }) =>
  createInvite(input);

export const acceptReviewerInvite = (id: string) => acceptInvite(id);

export const getAuditLog = () => getAuditEvents();
