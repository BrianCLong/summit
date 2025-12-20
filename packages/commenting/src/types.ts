import { z } from 'zod';

export enum CommentStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived'
}

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  CELEBRATE = 'celebrate',
  INSIGHTFUL = 'insightful',
  CURIOUS = 'curious',
  DISAGREE = 'disagree'
}

export enum AnnotationType {
  HIGHLIGHT = 'highlight',
  UNDERLINE = 'underline',
  STRIKETHROUGH = 'strikethrough',
  MARKER = 'marker',
  ARROW = 'arrow',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  FREEHAND = 'freehand',
  TEXT = 'text',
  PIN = 'pin'
}

// Rich text content schema
export const RichTextContentSchema = z.object({
  type: z.enum(['paragraph', 'heading', 'list', 'code', 'quote', 'mention']),
  content: z.string(),
  attributes: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    code: z.boolean().optional(),
    link: z.string().optional(),
    level: z.number().optional() // for headings
  }).optional(),
  mentions: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    position: z.number()
  })).optional()
});

export const CommentThreadSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  resourceType: z.string(), // 'entity', 'analysis', 'document', 'map', etc.
  resourceId: z.string(),
  anchorType: z.enum(['text', 'element', 'coordinate', 'global']),
  anchor: z.object({
    // Text selection
    textPosition: z.object({
      start: z.number(),
      end: z.number(),
      text: z.string()
    }).optional(),
    // Element reference
    elementId: z.string().optional(),
    elementPath: z.string().optional(),
    // Coordinate (for maps/graphs)
    coordinates: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number().optional()
    }).optional(),
    // Additional context
    context: z.record(z.any()).optional()
  }),
  status: z.nativeEnum(CommentStatus).default(CommentStatus.OPEN),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export const CommentSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  authorId: z.string(),
  content: z.array(RichTextContentSchema),
  plainText: z.string(), // for search
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
    url: z.string(),
    thumbnailUrl: z.string().optional()
  })).default([]),
  mentions: z.array(z.string()).default([]),
  isEdited: z.boolean().default(false),
  editedAt: z.date().optional(),
  createdAt: z.date(),
  parentCommentId: z.string().optional() // for nested replies
});

export const CommentReactionSchema = z.object({
  id: z.string(),
  commentId: z.string(),
  userId: z.string(),
  type: z.nativeEnum(ReactionType),
  createdAt: z.date()
});

export const AnnotationSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  layerId: z.string().optional(), // for grouping annotations
  type: z.nativeEnum(AnnotationType),
  geometry: z.object({
    // For shapes
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    // For paths/freehand
    path: z.array(z.object({
      x: z.number(),
      y: z.number()
    })).optional(),
    // For circles
    radius: z.number().optional(),
    // Transform
    rotation: z.number().optional(),
    scale: z.number().optional()
  }),
  style: z.object({
    color: z.string().default('#FFFF00'),
    opacity: z.number().default(0.5),
    strokeWidth: z.number().optional(),
    strokeColor: z.string().optional(),
    fillColor: z.string().optional(),
    fontSize: z.number().optional(),
    fontFamily: z.string().optional()
  }).default({}),
  content: z.string().optional(), // for text annotations
  linkedCommentId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const AnnotationLayerSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  resourceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  isVisible: z.boolean().default(true),
  isLocked: z.boolean().default(false),
  opacity: z.number().default(1.0),
  order: z.number(), // z-index
  createdBy: z.string(),
  createdAt: z.date()
});

export const CommentVoteSchema = z.object({
  id: z.string(),
  commentId: z.string(),
  userId: z.string(),
  value: z.number(), // +1 for upvote, -1 for downvote
  createdAt: z.date()
});

export const CommentNotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  commentId: z.string(),
  threadId: z.string(),
  type: z.enum(['mention', 'reply', 'reaction', 'resolution', 'assignment']),
  read: z.boolean().default(false),
  readAt: z.date().optional(),
  createdAt: z.date()
});

// Type exports
export type RichTextContent = z.infer<typeof RichTextContentSchema>;
export type CommentThread = z.infer<typeof CommentThreadSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CommentReaction = z.infer<typeof CommentReactionSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type AnnotationLayer = z.infer<typeof AnnotationLayerSchema>;
export type CommentVote = z.infer<typeof CommentVoteSchema>;
export type CommentNotification = z.infer<typeof CommentNotificationSchema>;

// Search and filter
export interface CommentFilter {
  workspaceId?: string;
  projectId?: string;
  resourceType?: string;
  resourceId?: string;
  status?: CommentStatus;
  authorId?: string;
  mentionedUserId?: string;
  hasAttachments?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  searchText?: string;
}

export interface CommentSearchResult {
  threads: CommentThread[];
  comments: Comment[];
  total: number;
  hasMore: boolean;
}
