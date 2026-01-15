/**
 * @fileoverview Comment Types
 *
 * Defines structures for commenting on any graph node or case entity.
 * Supports threading, mentions, and attachments.
 *
 * @module comments/types
 */

export type CommentTargetType = 'NODE' | 'CASE' | 'TASK' | 'DOCUMENT';

export interface Comment {
  commentId: string;
  tenantId: string;

  // Target
  targetType: CommentTargetType;
  targetId: string;

  // Threading
  parentId?: string; // If replying to a comment
  rootId?: string; // Top-level comment ID

  // Content
  content: string; // Markdown supported

  // Author
  authorId: string;

  // Timing
  createdAt: string;
  updatedAt: string;

  // Mentions (derived from content)
  mentions: string[]; // User IDs

  // Status
  isEdited: boolean;
  isDeleted: boolean;

  metadata: Record<string, unknown>;
}

export interface CreateCommentInput {
  targetType: CommentTargetType;
  targetId: string;
  parentId?: string;
  content: string;
  metadata?: Record<string, unknown>;
}
