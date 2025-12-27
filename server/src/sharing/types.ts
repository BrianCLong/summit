export type SharingScope = {
  tenantId: string;
  caseId?: string;
};

export type Permission = 'view' | 'download' | 'comment' | 'redaction-feedback';

export type ShareLink = {
  id: string;
  scope: SharingScope;
  scopeHash: string;
  resourceType: 'report' | 'bundle' | 'document';
  resourceId: string;
  permissions: Permission[];
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  labelId?: string;
  watermark?: WatermarkInstruction;
};

export type ShareTokenPayload = {
  linkId: string;
  scopeHash: string;
  aud: string;
  exp: number;
};

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export type ReviewerInvite = {
  id: string;
  email: string;
  scope: SharingScope;
  resources: string[];
  role: 'external_reviewer';
  expiresAt: Date;
  status: InviteStatus;
  createdAt: Date;
  acceptedAt?: Date;
};

export type ReviewerSession = {
  id: string;
  inviteId: string;
  scopeHash: string;
  expiresAt: Date;
};

export type LabelMetadata = {
  id: string;
  classification: string;
  handling: string;
  distribution: string;
  caseId?: string;
  generatedFor: string;
  generatedAt: Date;
};

export type WatermarkInstruction = {
  text: string;
  placement: 'diagonal' | 'center' | 'top' | 'bottom';
  opacity: number;
};

export type FeedbackRecord = {
  id: string;
  shareLinkId: string;
  resourceRef: string;
  anchor: string;
  body: string;
  author: string;
  threadId?: string;
  createdAt: Date;
  deletedAt?: Date;
};

export type PlanResult = {
  planHash: string;
  resources: string[];
  permissions: Permission[];
  warnings: string[];
  labelId?: string;
};
