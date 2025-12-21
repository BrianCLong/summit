export enum CommsTier {
  ROUTINE = 'routine',
  SENSITIVE = 'sensitive',
  CRISIS = 'crisis',
  CONFIDENTIAL_LEGAL = 'confidential_legal'
}

export enum CommsAudience {
  EMPLOYEES = 'employees',
  CUSTOMERS = 'customers',
  PARTNERS = 'partners'
}

export enum CommsStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export interface CommsTemplate {
  id: string;
  name: string;
  tier: CommsTier;
  contentTemplate: string; // Handlebars or similar
  audience: CommsAudience;
}

export interface Communication {
  id: string;
  title: string;
  content: string; // The rendered content
  tier: CommsTier;
  audience: CommsAudience;
  status: CommsStatus;
  authorId: string;
  approverId?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  version: number;
}

export interface CreateCommunicationDto {
  title: string;
  content: string;
  tier: CommsTier;
  audience: CommsAudience;
  authorId: string;
}

export interface CreateTemplateDto {
  name: string;
  tier: CommsTier;
  contentTemplate: string;
  audience: CommsAudience;
}
