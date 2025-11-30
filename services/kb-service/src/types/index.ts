/**
 * Knowledge Base Domain Types
 * Core type definitions for articles, playbooks, versions, and access control
 */

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const ContentType = {
  ARTICLE: 'article',
  PLAYBOOK: 'playbook',
  SOP: 'sop',
  RUNBOOK: 'runbook',
  FAQ: 'faq',
  TUTORIAL: 'tutorial',
  REFERENCE: 'reference',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentStatus = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  DEPRECATED: 'deprecated',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

export const ClassificationLevel = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
} as const;

export type ClassificationLevel =
  (typeof ClassificationLevel)[keyof typeof ClassificationLevel];

export const AudienceRole = {
  ANALYST: 'analyst',
  INVESTIGATOR: 'investigator',
  ADMIN: 'admin',
  ENGINEER: 'engineer',
  MANAGER: 'manager',
  EXECUTIVE: 'executive',
  ALL: 'all',
} as const;

export type AudienceRole = (typeof AudienceRole)[keyof typeof AudienceRole];

export const ReviewDecision = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVISION: 'needs_revision',
} as const;

export type ReviewDecision =
  (typeof ReviewDecision)[keyof typeof ReviewDecision];

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  category: z.string().max(50).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AudienceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  roles: z.array(z.nativeEnum(AudienceRole)),
  description: z.string().max(500).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const VersionSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  content: z.string(),
  contentHtml: z.string(),
  summary: z.string().max(500).optional(),
  changeNotes: z.string().max(1000).optional(),
  authorId: z.string().uuid(),
  status: z.nativeEnum(ContentStatus),
  createdAt: z.date(),
  publishedAt: z.date().nullable(),
});

export const ReviewSchema = z.object({
  id: z.string().uuid(),
  versionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  decision: z.nativeEnum(ReviewDecision),
  comments: z.string().max(2000).optional(),
  reviewedAt: z.date(),
});

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  contentType: z.nativeEnum(ContentType),
  classification: z.nativeEnum(ClassificationLevel),
  effectiveDate: z.date().nullable(),
  expirationDate: z.date().nullable(),
  ownerId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  currentVersionId: z.string().uuid().nullable(),
  tags: z.array(TagSchema).optional(),
  audiences: z.array(AudienceSchema).optional(),
});

export const PlaybookStepSchema = z.object({
  id: z.string().uuid(),
  playbookId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  title: z.string().min(1).max(300),
  content: z.string(),
  contentHtml: z.string(),
  expectedDuration: z.number().int().positive().optional(),
  isOptional: z.boolean().default(false),
  prerequisites: z.array(z.string().uuid()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PlaybookDocSchema = ArticleSchema.extend({
  contentType: z.literal(ContentType.PLAYBOOK),
  estimatedDuration: z.number().int().positive().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  steps: z.array(PlaybookStepSchema).optional(),
});

export const HelpAnchorSchema = z.object({
  id: z.string().uuid(),
  anchorKey: z.string().min(1).max(200),
  uiRoute: z.string().min(1).max(500),
  componentPath: z.string().max(500).optional(),
  articleIds: z.array(z.string().uuid()),
  description: z.string().max(500).optional(),
  priority: z.number().int().min(0).max(100).default(50),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ContextualHelpRequestSchema = z.object({
  uiRoute: z.string().min(1).max(500),
  anchorKey: z.string().max(200).optional(),
  userRole: z.nativeEnum(AudienceRole).optional(),
  searchQuery: z.string().max(500).optional(),
  limit: z.number().int().min(1).max(50).default(5),
});

export const CopilotKBQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  userRole: z.nativeEnum(AudienceRole).optional(),
  contentTypes: z.array(z.nativeEnum(ContentType)).optional(),
  includeDeprecated: z.boolean().default(false),
  limit: z.number().int().min(1).max(20).default(5),
});

// =============================================================================
// TypeScript Types (derived from Zod schemas)
// =============================================================================

export type Tag = z.infer<typeof TagSchema>;
export type Audience = z.infer<typeof AudienceSchema>;
export type Version = z.infer<typeof VersionSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type PlaybookDoc = z.infer<typeof PlaybookDocSchema>;
export type HelpAnchor = z.infer<typeof HelpAnchorSchema>;
export type ContextualHelpRequest = z.infer<typeof ContextualHelpRequestSchema>;
export type CopilotKBQuery = z.infer<typeof CopilotKBQuerySchema>;

// =============================================================================
// Input Types for Create/Update Operations
// =============================================================================

export const CreateTagInputSchema = TagSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateTagInputSchema = CreateTagInputSchema.partial();

export const CreateAudienceInputSchema = AudienceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAudienceInputSchema = CreateAudienceInputSchema.partial();

export const CreateArticleInputSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  contentType: z.nativeEnum(ContentType),
  classification: z.nativeEnum(ClassificationLevel).default(ClassificationLevel.INTERNAL),
  effectiveDate: z.date().nullable().optional(),
  expirationDate: z.date().nullable().optional(),
  ownerId: z.string().uuid(),
  content: z.string().min(1),
  summary: z.string().max(500).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  audienceIds: z.array(z.string().uuid()).optional(),
});

export const UpdateArticleInputSchema = CreateArticleInputSchema.partial().omit({
  ownerId: true,
});

export const CreateVersionInputSchema = z.object({
  articleId: z.string().uuid(),
  content: z.string().min(1),
  summary: z.string().max(500).optional(),
  changeNotes: z.string().max(1000).optional(),
  authorId: z.string().uuid(),
});

export const SubmitForReviewInputSchema = z.object({
  versionId: z.string().uuid(),
  reviewerIds: z.array(z.string().uuid()).min(1),
  comments: z.string().max(2000).optional(),
});

export const ReviewInputSchema = z.object({
  versionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  decision: z.nativeEnum(ReviewDecision),
  comments: z.string().max(2000).optional(),
});

export const PublishInputSchema = z.object({
  versionId: z.string().uuid(),
  publisherId: z.string().uuid(),
  effectiveDate: z.date().optional(),
});

export const CreateHelpAnchorInputSchema = HelpAnchorSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateHelpAnchorInputSchema = CreateHelpAnchorInputSchema.partial();

export type CreateTagInput = z.infer<typeof CreateTagInputSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>;
export type CreateAudienceInput = z.infer<typeof CreateAudienceInputSchema>;
export type UpdateAudienceInput = z.infer<typeof UpdateAudienceInputSchema>;
export type CreateArticleInput = z.infer<typeof CreateArticleInputSchema>;
export type UpdateArticleInput = z.infer<typeof UpdateArticleInputSchema>;
export type CreateVersionInput = z.infer<typeof CreateVersionInputSchema>;
export type SubmitForReviewInput = z.infer<typeof SubmitForReviewInputSchema>;
export type ReviewInput = z.infer<typeof ReviewInputSchema>;
export type PublishInput = z.infer<typeof PublishInputSchema>;
export type CreateHelpAnchorInput = z.infer<typeof CreateHelpAnchorInputSchema>;
export type UpdateHelpAnchorInput = z.infer<typeof UpdateHelpAnchorInputSchema>;

// =============================================================================
// Response Types
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ArticleWithVersion extends Article {
  currentVersion: Version | null;
}

export interface ContextualHelpResponse {
  articles: ArticleWithVersion[];
  relatedPlaybooks: ArticleWithVersion[];
  suggestedSearches: string[];
}

export interface CopilotKBResponse {
  results: Array<{
    article: ArticleWithVersion;
    relevanceScore: number;
    excerpt: string;
    citationUrl: string;
  }>;
  totalMatches: number;
}

export interface WorkflowState {
  versionId: string;
  articleId: string;
  status: ContentStatus;
  pendingReviews: Array<{
    reviewerId: string;
    requestedAt: Date;
  }>;
  completedReviews: Review[];
  canPublish: boolean;
}

// =============================================================================
// Export/Import Types
// =============================================================================

export interface KBExportFormat {
  version: string;
  exportedAt: string;
  articles: Array<{
    article: Omit<Article, 'tags' | 'audiences'>;
    versions: Version[];
    tagSlugs: string[];
    audienceNames: string[];
  }>;
  tags: Tag[];
  audiences: Audience[];
  helpAnchors: HelpAnchor[];
}

export const KBExportFormatSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  articles: z.array(
    z.object({
      article: ArticleSchema.omit({ tags: true, audiences: true }),
      versions: z.array(VersionSchema),
      tagSlugs: z.array(z.string()),
      audienceNames: z.array(z.string()),
    })
  ),
  tags: z.array(TagSchema),
  audiences: z.array(AudienceSchema),
  helpAnchors: z.array(HelpAnchorSchema),
});
