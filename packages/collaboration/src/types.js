"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingSchema = exports.MarketplaceReviewSchema = exports.MarketplaceAssetSchema = exports.AssetType = exports.ExternalUserSchema = exports.ShareLinkSchema = exports.ShareLinkType = exports.ActivityFeedItemSchema = exports.NotificationSchema = exports.NotificationType = exports.BoardSchema = exports.TaskSchema = exports.TaskPriority = exports.TaskStatus = exports.DocumentSchema = exports.DocumentType = void 0;
const zod_1 = require("zod");
// Knowledge Base types
var DocumentType;
(function (DocumentType) {
    DocumentType["WIKI"] = "wiki";
    DocumentType["ARTICLE"] = "article";
    DocumentType["GUIDE"] = "guide";
    DocumentType["REFERENCE"] = "reference";
    DocumentType["TEMPLATE"] = "template";
    DocumentType["NOTE"] = "note";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
exports.DocumentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(DocumentType),
    title: zod_1.z.string(),
    slug: zod_1.z.string(),
    content: zod_1.z.string(), // Markdown or rich text
    excerpt: zod_1.z.string().optional(),
    authorId: zod_1.z.string(),
    collaborators: zod_1.z.array(zod_1.z.string()).default([]),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    isPublished: zod_1.z.boolean().default(false),
    publishedAt: zod_1.z.date().optional(),
    parentDocumentId: zod_1.z.string().optional(),
    order: zod_1.z.number().default(0),
    tableOfContents: zod_1.z.array(zod_1.z.object({
        level: zod_1.z.number(),
        title: zod_1.z.string(),
        id: zod_1.z.string(),
        children: zod_1.z.array(zod_1.z.any()).default([])
    })).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Task Management types
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "todo";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["IN_REVIEW"] = "in_review";
    TaskStatus["BLOCKED"] = "blocked";
    TaskStatus["DONE"] = "done";
    TaskStatus["ARCHIVED"] = "archived";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["HIGH"] = "high";
    TaskPriority["URGENT"] = "urgent";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    boardId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(TaskStatus),
    priority: zod_1.z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    assigneeId: zod_1.z.string().optional(),
    reporterId: zod_1.z.string(),
    dueDate: zod_1.z.date().optional(),
    startDate: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    estimatedHours: zod_1.z.number().optional(),
    actualHours: zod_1.z.number().optional(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]),
    blockedBy: zod_1.z.array(zod_1.z.string()).default([]),
    subtasks: zod_1.z.array(zod_1.z.string()).default([]),
    parentTaskId: zod_1.z.string().optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        url: zod_1.z.string(),
        type: zod_1.z.string()
    })).default([]),
    customFields: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.BoardSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['kanban', 'scrum', 'list']).default('kanban'),
    columns: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        status: zod_1.z.nativeEnum(TaskStatus),
        order: zod_1.z.number(),
        wipLimit: zod_1.z.number().optional()
    })),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date()
});
// Notification types
var NotificationType;
(function (NotificationType) {
    NotificationType["MENTION"] = "mention";
    NotificationType["COMMENT"] = "comment";
    NotificationType["TASK_ASSIGNED"] = "task_assigned";
    NotificationType["TASK_UPDATED"] = "task_updated";
    NotificationType["TASK_DUE"] = "task_due";
    NotificationType["DOCUMENT_SHARED"] = "document_shared";
    NotificationType["WORKSPACE_INVITE"] = "workspace_invite";
    NotificationType["PROJECT_UPDATE"] = "project_update";
    NotificationType["SYSTEM"] = "system";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
exports.NotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    userId: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    type: zod_1.z.nativeEnum(NotificationType),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    actionUrl: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    read: zod_1.z.boolean().default(false),
    readAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    expiresAt: zod_1.z.date().optional()
});
exports.ActivityFeedItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    actorId: zod_1.z.string(),
    actorName: zod_1.z.string(),
    action: zod_1.z.string(),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    resourceName: zod_1.z.string().optional(),
    details: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    timestamp: zod_1.z.date()
});
// Sharing and permissions types
var ShareLinkType;
(function (ShareLinkType) {
    ShareLinkType["VIEW"] = "view";
    ShareLinkType["COMMENT"] = "comment";
    ShareLinkType["EDIT"] = "edit";
})(ShareLinkType || (exports.ShareLinkType = ShareLinkType = {}));
exports.ShareLinkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    token: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    resourceType: zod_1.z.string(),
    resourceId: zod_1.z.string(),
    type: zod_1.z.nativeEnum(ShareLinkType),
    password: zod_1.z.string().optional(),
    expiresAt: zod_1.z.date().optional(),
    maxUses: zod_1.z.number().optional(),
    uses: zod_1.z.number().default(0),
    allowAnonymous: zod_1.z.boolean().default(false),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    lastUsedAt: zod_1.z.date().optional()
});
exports.ExternalUserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    invitedBy: zod_1.z.string(),
    acceptedAt: zod_1.z.date().optional(),
    permissions: zod_1.z.array(zod_1.z.string()).default([]),
    expiresAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date()
});
// Marketplace types
var AssetType;
(function (AssetType) {
    AssetType["ANALYSIS"] = "analysis";
    AssetType["DASHBOARD"] = "dashboard";
    AssetType["TEMPLATE"] = "template";
    AssetType["QUERY"] = "query";
    AssetType["REPORT"] = "report";
    AssetType["WORKFLOW"] = "workflow";
})(AssetType || (exports.AssetType = AssetType = {}));
exports.MarketplaceAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(AssetType),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    version: zod_1.z.string(),
    authorId: zod_1.z.string(),
    authorName: zod_1.z.string(),
    category: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    contentUrl: zod_1.z.string(),
    thumbnailUrl: zod_1.z.string().optional(),
    previewImages: zod_1.z.array(zod_1.z.string()).default([]),
    isPublic: zod_1.z.boolean().default(false),
    price: zod_1.z.number().default(0),
    rating: zod_1.z.number().default(0),
    ratingCount: zod_1.z.number().default(0),
    downloadCount: zod_1.z.number().default(0),
    license: zod_1.z.string().optional(),
    changelog: zod_1.z.array(zod_1.z.object({
        version: zod_1.z.string(),
        changes: zod_1.z.string(),
        date: zod_1.z.date()
    })).default([]),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
exports.MarketplaceReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    assetId: zod_1.z.string(),
    userId: zod_1.z.string(),
    userName: zod_1.z.string(),
    rating: zod_1.z.number().min(1).max(5),
    comment: zod_1.z.string().optional(),
    helpful: zod_1.z.number().default(0),
    createdAt: zod_1.z.date()
});
// Video conferencing types
exports.MeetingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    workspaceId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    hostId: zod_1.z.string(),
    participants: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        joinedAt: zod_1.z.date().optional(),
        leftAt: zod_1.z.date().optional(),
        role: zod_1.z.enum(['host', 'moderator', 'participant'])
    })).default([]),
    scheduledAt: zod_1.z.date().optional(),
    startedAt: zod_1.z.date().optional(),
    endedAt: zod_1.z.date().optional(),
    duration: zod_1.z.number().optional(),
    recordingUrl: zod_1.z.string().optional(),
    transcriptUrl: zod_1.z.string().optional(),
    notesUrl: zod_1.z.string().optional(),
    status: zod_1.z.enum(['scheduled', 'active', 'ended', 'cancelled']),
    settings: zod_1.z.object({
        enableRecording: zod_1.z.boolean().default(false),
        enableTranscription: zod_1.z.boolean().default(false),
        allowScreenShare: zod_1.z.boolean().default(true),
        enableChat: zod_1.z.boolean().default(true),
        maxParticipants: zod_1.z.number().optional()
    }).default({}),
    createdAt: zod_1.z.date()
});
