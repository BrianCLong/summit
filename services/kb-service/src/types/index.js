"use strict";
/**
 * Knowledge Base Domain Types
 * Core type definitions for articles, playbooks, versions, and access control
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KBExportFormatSchema = exports.UpdateHelpAnchorInputSchema = exports.CreateHelpAnchorInputSchema = exports.PublishInputSchema = exports.ReviewInputSchema = exports.SubmitForReviewInputSchema = exports.CreateVersionInputSchema = exports.UpdateArticleInputSchema = exports.CreateArticleInputSchema = exports.UpdateAudienceInputSchema = exports.CreateAudienceInputSchema = exports.UpdateTagInputSchema = exports.CreateTagInputSchema = exports.CopilotKBQuerySchema = exports.ContextualHelpRequestSchema = exports.HelpAnchorSchema = exports.PlaybookDocSchema = exports.PlaybookStepSchema = exports.ArticleSchema = exports.ReviewSchema = exports.VersionSchema = exports.AudienceSchema = exports.TagSchema = exports.ReviewDecision = exports.AudienceRole = exports.ClassificationLevel = exports.ContentStatus = exports.ContentType = void 0;
const zod_1 = require("zod");
// =============================================================================
// Enums and Constants
// =============================================================================
exports.ContentType = {
    ARTICLE: 'article',
    PLAYBOOK: 'playbook',
    SOP: 'sop',
    RUNBOOK: 'runbook',
    FAQ: 'faq',
    TUTORIAL: 'tutorial',
    REFERENCE: 'reference',
};
exports.ContentStatus = {
    DRAFT: 'draft',
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    PUBLISHED: 'published',
    ARCHIVED: 'archived',
    DEPRECATED: 'deprecated',
};
exports.ClassificationLevel = {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted',
};
exports.AudienceRole = {
    ANALYST: 'analyst',
    INVESTIGATOR: 'investigator',
    ADMIN: 'admin',
    ENGINEER: 'engineer',
    MANAGER: 'manager',
    EXECUTIVE: 'executive',
    ALL: 'all',
};
exports.ReviewDecision = {
    APPROVED: 'approved',
    REJECTED: 'rejected',
    NEEDS_REVISION: 'needs_revision',
};
// =============================================================================
// Zod Schemas for Validation
// =============================================================================
exports.TagSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    slug: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    category: zod_1.z.string().max(50).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.AudienceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    roles: zod_1.z.array(zod_1.z.nativeEnum(exports.AudienceRole)),
    description: zod_1.z.string().max(500).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.VersionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    articleId: zod_1.z.string().uuid(),
    versionNumber: zod_1.z.number().int().positive(),
    content: zod_1.z.string(),
    contentHtml: zod_1.z.string(),
    summary: zod_1.z.string().max(500).optional(),
    changeNotes: zod_1.z.string().max(1000).optional(),
    authorId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(exports.ContentStatus),
    createdAt: zod_1.z.date(),
    publishedAt: zod_1.z.date().nullable(),
});
exports.ReviewSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    versionId: zod_1.z.string().uuid(),
    reviewerId: zod_1.z.string().uuid(),
    decision: zod_1.z.nativeEnum(exports.ReviewDecision),
    comments: zod_1.z.string().max(2000).optional(),
    reviewedAt: zod_1.z.date(),
});
exports.ArticleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    slug: zod_1.z.string().min(1).max(200),
    title: zod_1.z.string().min(1).max(300),
    contentType: zod_1.z.nativeEnum(exports.ContentType),
    classification: zod_1.z.nativeEnum(exports.ClassificationLevel),
    effectiveDate: zod_1.z.date().nullable(),
    expirationDate: zod_1.z.date().nullable(),
    ownerId: zod_1.z.string().uuid(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    currentVersionId: zod_1.z.string().uuid().nullable(),
    tags: zod_1.z.array(exports.TagSchema).optional(),
    audiences: zod_1.z.array(exports.AudienceSchema).optional(),
});
exports.PlaybookStepSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    playbookId: zod_1.z.string().uuid(),
    stepNumber: zod_1.z.number().int().positive(),
    title: zod_1.z.string().min(1).max(300),
    content: zod_1.z.string(),
    contentHtml: zod_1.z.string(),
    expectedDuration: zod_1.z.number().int().positive().optional(),
    isOptional: zod_1.z.boolean().default(false),
    prerequisites: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.PlaybookDocSchema = exports.ArticleSchema.extend({
    contentType: zod_1.z.literal(exports.ContentType.PLAYBOOK),
    estimatedDuration: zod_1.z.number().int().positive().optional(),
    difficulty: zod_1.z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    steps: zod_1.z.array(exports.PlaybookStepSchema).optional(),
});
exports.HelpAnchorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    anchorKey: zod_1.z.string().min(1).max(200),
    uiRoute: zod_1.z.string().min(1).max(500),
    componentPath: zod_1.z.string().max(500).optional(),
    articleIds: zod_1.z.array(zod_1.z.string().uuid()),
    description: zod_1.z.string().max(500).optional(),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.ContextualHelpRequestSchema = zod_1.z.object({
    uiRoute: zod_1.z.string().min(1).max(500),
    anchorKey: zod_1.z.string().max(200).optional(),
    userRole: zod_1.z.nativeEnum(exports.AudienceRole).optional(),
    searchQuery: zod_1.z.string().max(500).optional(),
    limit: zod_1.z.number().int().min(1).max(50).default(5),
});
exports.CopilotKBQuerySchema = zod_1.z.object({
    query: zod_1.z.string().min(1).max(1000),
    userRole: zod_1.z.nativeEnum(exports.AudienceRole).optional(),
    contentTypes: zod_1.z.array(zod_1.z.nativeEnum(exports.ContentType)).optional(),
    includeDeprecated: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().int().min(1).max(20).default(5),
});
// =============================================================================
// Input Types for Create/Update Operations
// =============================================================================
exports.CreateTagInputSchema = exports.TagSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.UpdateTagInputSchema = exports.CreateTagInputSchema.partial();
exports.CreateAudienceInputSchema = exports.AudienceSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.UpdateAudienceInputSchema = exports.CreateAudienceInputSchema.partial();
exports.CreateArticleInputSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1).max(200),
    title: zod_1.z.string().min(1).max(300),
    contentType: zod_1.z.nativeEnum(exports.ContentType),
    classification: zod_1.z.nativeEnum(exports.ClassificationLevel).default(exports.ClassificationLevel.INTERNAL),
    effectiveDate: zod_1.z.date().nullable().optional(),
    expirationDate: zod_1.z.date().nullable().optional(),
    ownerId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1),
    summary: zod_1.z.string().max(500).optional(),
    tagIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    audienceIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.UpdateArticleInputSchema = exports.CreateArticleInputSchema.partial().omit({
    ownerId: true,
});
exports.CreateVersionInputSchema = zod_1.z.object({
    articleId: zod_1.z.string().uuid(),
    content: zod_1.z.string().min(1),
    summary: zod_1.z.string().max(500).optional(),
    changeNotes: zod_1.z.string().max(1000).optional(),
    authorId: zod_1.z.string().uuid(),
});
exports.SubmitForReviewInputSchema = zod_1.z.object({
    versionId: zod_1.z.string().uuid(),
    reviewerIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    comments: zod_1.z.string().max(2000).optional(),
});
exports.ReviewInputSchema = zod_1.z.object({
    versionId: zod_1.z.string().uuid(),
    reviewerId: zod_1.z.string().uuid(),
    decision: zod_1.z.nativeEnum(exports.ReviewDecision),
    comments: zod_1.z.string().max(2000).optional(),
});
exports.PublishInputSchema = zod_1.z.object({
    versionId: zod_1.z.string().uuid(),
    publisherId: zod_1.z.string().uuid(),
    effectiveDate: zod_1.z.date().optional(),
});
exports.CreateHelpAnchorInputSchema = exports.HelpAnchorSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.UpdateHelpAnchorInputSchema = exports.CreateHelpAnchorInputSchema.partial();
exports.KBExportFormatSchema = zod_1.z.object({
    version: zod_1.z.string(),
    exportedAt: zod_1.z.string(),
    articles: zod_1.z.array(zod_1.z.object({
        article: exports.ArticleSchema.omit({ tags: true, audiences: true }),
        versions: zod_1.z.array(exports.VersionSchema),
        tagSlugs: zod_1.z.array(zod_1.z.string()),
        audienceNames: zod_1.z.array(zod_1.z.string()),
    })),
    tags: zod_1.z.array(exports.TagSchema),
    audiences: zod_1.z.array(exports.AudienceSchema),
    helpAnchors: zod_1.z.array(exports.HelpAnchorSchema),
});
