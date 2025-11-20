/**
 * Collaborative Documentation Types
 * Types for rich documentation, comments, and collaborative editing
 */

/**
 * Document
 */
export interface Document {
  id: string;
  assetId: string;
  title: string;
  content: string;
  format: DocumentFormat;

  // Authorship
  author: string;
  contributors: string[];
  lastEditedBy: string;

  // Versioning
  version: number;
  versionHistory: DocumentVersion[];

  // Organization
  tags: string[];
  categories: string[];

  // Status
  status: DocumentStatus;
  isPublished: boolean;
  publishedAt: Date | null;

  // Interactions
  viewCount: number;
  likeCount: number;
  commentCount: number;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document Format
 */
export enum DocumentFormat {
  MARKDOWN = 'MARKDOWN',
  HTML = 'HTML',
  RICH_TEXT = 'RICH_TEXT',
  PLAIN_TEXT = 'PLAIN_TEXT',
}

/**
 * Document Status
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Document Version
 */
export interface DocumentVersion {
  version: number;
  content: string;
  editedBy: string;
  editedAt: Date;
  changeNotes: string;
  diff: string | null;
}

/**
 * Comment
 */
export interface Comment {
  id: string;
  assetId: string;
  parentId: string | null;
  author: string;
  content: string;
  format: DocumentFormat;

  // Threading
  threadId: string;
  replies: Comment[];

  // Mentions
  mentions: string[];

  // Reactions
  reactions: Reaction[];

  // Status
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reaction
 */
export interface Reaction {
  type: ReactionType;
  userId: string;
  createdAt: Date;
}

/**
 * Reaction Types
 */
export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  THUMBS_UP = 'THUMBS_UP',
  THUMBS_DOWN = 'THUMBS_DOWN',
  CELEBRATE = 'CELEBRATE',
  INSIGHTFUL = 'INSIGHTFUL',
}

/**
 * Mention Notification
 */
export interface MentionNotification {
  id: string;
  recipientId: string;
  mentionedBy: string;
  assetId: string;
  commentId: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Document Template
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  format: DocumentFormat;
  category: string;
  tags: string[];
  usageCount: number;
  createdBy: string;
  createdAt: Date;
}

/**
 * Co-authoring Session
 */
export interface CoAuthoringSession {
  id: string;
  documentId: string;
  participants: Participant[];
  startedAt: Date;
  endedAt: Date | null;
  isActive: boolean;
}

/**
 * Participant
 */
export interface Participant {
  userId: string;
  joinedAt: Date;
  lastActiveAt: Date;
  cursorPosition: number | null;
  selectionRange: SelectionRange | null;
}

/**
 * Selection Range
 */
export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * Edit Operation
 */
export interface EditOperation {
  id: string;
  sessionId: string;
  userId: string;
  type: EditOperationType;
  position: number;
  content: string;
  timestamp: Date;
}

/**
 * Edit Operation Type
 */
export enum EditOperationType {
  INSERT = 'INSERT',
  DELETE = 'DELETE',
  REPLACE = 'REPLACE',
  FORMAT = 'FORMAT',
}
