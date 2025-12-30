import { v4 as uuidv4 } from 'uuid';
import {
  FeedbackRecord,
  LabelMetadata,
  Permission,
  PlanResult,
  ReviewerInvite,
  ReviewerSession,
  ShareLink,
  SharingScope,
  WatermarkInstruction,
} from './types.js';
import { computeScopeHash, planHash } from './utils.js';

const shareLinks = new Map<string, ShareLink>();
const reviewerInvites = new Map<string, ReviewerInvite>();
const reviewerSessions = new Map<string, ReviewerSession>();
const labels = new Map<string, LabelMetadata>();
const feedback = new Map<string, FeedbackRecord>();
const auditEvents: any[] = [];
const revocationCache = new Map<string, { revokedAt: Date }>();

export const resetStore = () => {
  shareLinks.clear();
  reviewerInvites.clear();
  reviewerSessions.clear();
  labels.clear();
  feedback.clear();
  auditEvents.length = 0;
  revocationCache.clear();
};

export const recordAudit = (type: string, details: Record<string, unknown>, correlationId?: string) => {
  auditEvents.push({ type, details, correlationId, at: new Date() });
};

export const getAuditEvents = () => auditEvents;

export const createLabel = (payload: Omit<LabelMetadata, 'id' | 'generatedAt'> & { generatedAt?: Date }) => {
  const id = uuidv4();
  const label: LabelMetadata = { ...payload, id, generatedAt: payload.generatedAt || new Date() };
  labels.set(id, label);
  return label;
};

export const listLabelsByScope = (scope: SharingScope) => {
  const scopeHash = computeScopeHash(scope);
  return Array.from(labels.values()).filter((label) => computeScopeHash({ tenantId: label.caseId || '', caseId: label.caseId }) === scopeHash);
};

export const getLabel = (id?: string) => (id ? labels.get(id) : undefined);

export const createShareLink = (input: {
  scope: SharingScope;
  resourceType: ShareLink['resourceType'];
  resourceId: string;
  expiresAt: Date;
  permissions: Permission[];
  createdBy: string;
  labelId?: string;
  watermark?: WatermarkInstruction;
}) => {
  const id = uuidv4();
  const scopeHash = computeScopeHash(input.scope);
  const link: ShareLink = {
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
  recordAudit('share.created', { id, scopeHash, resourceId: input.resourceId });
  return link;
};

export const listShareLinks = (scope?: SharingScope) => {
  if (!scope) {return Array.from(shareLinks.values());}
  const scopeHash = computeScopeHash(scope);
  return Array.from(shareLinks.values()).filter((link) => link.scopeHash === scopeHash);
};

export const revokeShareLink = (id: string, reason?: string) => {
  const link = shareLinks.get(id);
  if (!link) {return undefined;}
  const now = new Date();
  link.revokedAt = now;
  shareLinks.set(id, link);
  revocationCache.set(id, { revokedAt: now });
  recordAudit('share.revoked', { id, reason });
  return link;
};

export const getShareLink = (id: string) => shareLinks.get(id);

export const createInvite = (input: {
  email: string;
  scope: SharingScope;
  resources: string[];
  expiresAt: Date;
}) => {
  const id = uuidv4();
  const invite: ReviewerInvite = {
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
  recordAudit('reviewer.invited', { id, email: invite.email });
  return invite;
};

export const listInvites = (scope?: SharingScope) => {
  if (!scope) {return Array.from(reviewerInvites.values());}
  const scopeHash = computeScopeHash(scope);
  return Array.from(reviewerInvites.values()).filter((invite) => computeScopeHash(invite.scope) === scopeHash);
};

export const revokeInvite = (id: string) => {
  const invite = reviewerInvites.get(id);
  if (!invite) {return undefined;}
  invite.status = 'revoked';
  reviewerInvites.set(id, invite);
  recordAudit('reviewer.invite_revoked', { id });
  return invite;
};

export const resendInvite = (id: string) => {
  const invite = reviewerInvites.get(id);
  if (!invite) {return undefined;}
  recordAudit('reviewer.invite_resent', { id });
  return invite;
};

export const acceptInvite = (id: string) => {
  const invite = reviewerInvites.get(id);
  if (!invite || invite.status !== 'pending' || invite.expiresAt.getTime() < Date.now()) {return undefined;}
  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  reviewerInvites.set(id, invite);
  const session: ReviewerSession = {
    id: uuidv4(),
    inviteId: invite.id,
    scopeHash: computeScopeHash(invite.scope),
    expiresAt: invite.expiresAt,
  };
  reviewerSessions.set(session.id, session);
  recordAudit('reviewer.accepted', { id, sessionId: session.id });
  return { invite, session };
};

export const createFeedback = (input: Omit<FeedbackRecord, 'id' | 'createdAt'>) => {
  const id = uuidv4();
  const record: FeedbackRecord = { ...input, id, createdAt: new Date() };
  feedback.set(id, record);
  recordAudit('feedback.created', { id, shareLinkId: record.shareLinkId });
  return record;
};

export const listFeedback = (shareLinkId: string) =>
  Array.from(feedback.values()).filter((item) => item.shareLinkId === shareLinkId && !item.deletedAt);

export const softDeleteFeedback = (id: string) => {
  const record = feedback.get(id);
  if (!record) {return undefined;}
  record.deletedAt = new Date();
  feedback.set(id, record);
  return record;
};

export const cacheRevocation = (id: string, revokedAt: Date) => {
  revocationCache.set(id, { revokedAt });
};

export const getRevocation = (id: string) => revocationCache.get(id);

export const computePlan = (input: {
  scope: SharingScope;
  resources: string[];
  permissions: Permission[];
  labelId?: string;
}): PlanResult => {
  const warnings: string[] = [];
  if (!input.permissions.includes('view')) {warnings.push('view permission missing');}
  const plan = {
    resources: input.resources,
    permissions: input.permissions,
    labelId: input.labelId,
  };
  return {
    ...plan,
    warnings,
    planHash: planHash(plan),
  };
};
