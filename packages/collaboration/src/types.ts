import { z } from 'zod';

// Knowledge Base types
export enum DocumentType {
  WIKI = 'wiki',
  ARTICLE = 'article',
  GUIDE = 'guide',
  REFERENCE = 'reference',
  TEMPLATE = 'template',
  NOTE = 'note'
}

export const DocumentSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  type: z.nativeEnum(DocumentType),
  title: z.string(),
  slug: z.string(),
  content: z.string(), // Markdown or rich text
  excerpt: z.string().optional(),
  authorId: z.string(),
  collaborators: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().optional(),
  parentDocumentId: z.string().optional(),
  order: z.number().default(0),
  tableOfContents: z.array(z.object({
    level: z.number(),
    title: z.string(),
    id: z.string(),
    children: z.array(z.any()).default([])
  })).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional()
});

// Task Management types
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  DONE = 'done',
  ARCHIVED = 'archived'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export const TaskSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  boardId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigneeId: z.string().optional(),
  reporterId: z.string(),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  labels: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  blockedBy: z.array(z.string()).default([]),
  subtasks: z.array(z.string()).default([]),
  parentTaskId: z.string().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    type: z.string()
  })).default([]),
  customFields: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const BoardSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['kanban', 'scrum', 'list']).default('kanban'),
  columns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.nativeEnum(TaskStatus),
    order: z.number(),
    wipLimit: z.number().optional()
  })),
  createdBy: z.string(),
  createdAt: z.date()
});

// Notification types
export enum NotificationType {
  MENTION = 'mention',
  COMMENT = 'comment',
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_DUE = 'task_due',
  DOCUMENT_SHARED = 'document_shared',
  WORKSPACE_INVITE = 'workspace_invite',
  PROJECT_UPDATE = 'project_update',
  SYSTEM = 'system'
}

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workspaceId: z.string(),
  type: z.nativeEnum(NotificationType),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  read: z.boolean().default(false),
  readAt: z.date().optional(),
  createdAt: z.date(),
  expiresAt: z.date().optional()
});

export const ActivityFeedItemSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  resourceName: z.string().optional(),
  details: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.date()
});

// Sharing and permissions types
export enum ShareLinkType {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit'
}

export const ShareLinkSchema = z.object({
  id: z.string(),
  token: z.string(),
  workspaceId: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  type: z.nativeEnum(ShareLinkType),
  password: z.string().optional(),
  expiresAt: z.date().optional(),
  maxUses: z.number().optional(),
  uses: z.number().default(0),
  allowAnonymous: z.boolean().default(false),
  createdBy: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional()
});

export const ExternalUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  workspaceId: z.string(),
  invitedBy: z.string(),
  acceptedAt: z.date().optional(),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.date().optional(),
  createdAt: z.date()
});

// Marketplace types
export enum AssetType {
  ANALYSIS = 'analysis',
  DASHBOARD = 'dashboard',
  TEMPLATE = 'template',
  QUERY = 'query',
  REPORT = 'report',
  WORKFLOW = 'workflow'
}

export const MarketplaceAssetSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AssetType),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  contentUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  previewImages: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  price: z.number().default(0),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
  downloadCount: z.number().default(0),
  license: z.string().optional(),
  changelog: z.array(z.object({
    version: z.string(),
    changes: z.string(),
    date: z.date()
  })).default([]),
  dependencies: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const MarketplaceReviewSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  userId: z.string(),
  userName: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  helpful: z.number().default(0),
  createdAt: z.date()
});

// Video conferencing types
export const MeetingSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  hostId: z.string(),
  participants: z.array(z.object({
    userId: z.string(),
    joinedAt: z.date().optional(),
    leftAt: z.date().optional(),
    role: z.enum(['host', 'moderator', 'participant'])
  })).default([]),
  scheduledAt: z.date().optional(),
  startedAt: z.date().optional(),
  endedAt: z.date().optional(),
  duration: z.number().optional(),
  recordingUrl: z.string().optional(),
  transcriptUrl: z.string().optional(),
  notesUrl: z.string().optional(),
  status: z.enum(['scheduled', 'active', 'ended', 'cancelled']),
  settings: z.object({
    enableRecording: z.boolean().default(false),
    enableTranscription: z.boolean().default(false),
    allowScreenShare: z.boolean().default(true),
    enableChat: z.boolean().default(true),
    maxParticipants: z.number().optional()
  }).default({}),
  createdAt: z.date()
});

// Type exports
export type Document = z.infer<typeof DocumentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type ActivityFeedItem = z.infer<typeof ActivityFeedItemSchema>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;
export type ExternalUser = z.infer<typeof ExternalUserSchema>;
export type MarketplaceAsset = z.infer<typeof MarketplaceAssetSchema>;
export type MarketplaceReview = z.infer<typeof MarketplaceReviewSchema>;
export type Meeting = z.infer<typeof MeetingSchema>;
