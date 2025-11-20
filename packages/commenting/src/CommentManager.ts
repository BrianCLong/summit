import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import {
  CommentThread,
  Comment,
  CommentReaction,
  Annotation,
  AnnotationLayer,
  CommentVote,
  CommentNotification,
  CommentStatus,
  ReactionType,
  CommentFilter,
  CommentSearchResult,
  RichTextContent
} from './types';

export interface CommentStore {
  // Thread operations
  createThread(thread: Omit<CommentThread, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommentThread>;
  getThread(id: string): Promise<CommentThread | null>;
  updateThread(id: string, updates: Partial<CommentThread>): Promise<CommentThread>;
  deleteThread(id: string): Promise<void>;
  listThreads(filter: CommentFilter): Promise<CommentThread[]>;
  searchThreads(query: string, filter: CommentFilter): Promise<CommentSearchResult>;

  // Comment operations
  createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment>;
  getComment(id: string): Promise<Comment | null>;
  updateComment(id: string, updates: Partial<Comment>): Promise<Comment>;
  deleteComment(id: string): Promise<void>;
  listComments(threadId: string): Promise<Comment[]>;

  // Reaction operations
  addReaction(reaction: Omit<CommentReaction, 'id' | 'createdAt'>): Promise<CommentReaction>;
  removeReaction(commentId: string, userId: string, type: ReactionType): Promise<void>;
  getReactions(commentId: string): Promise<CommentReaction[]>;

  // Vote operations
  addVote(vote: Omit<CommentVote, 'id' | 'createdAt'>): Promise<CommentVote>;
  removeVote(commentId: string, userId: string): Promise<void>;
  getVotes(commentId: string): Promise<CommentVote[]>;

  // Annotation operations
  createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation>;
  getAnnotation(id: string): Promise<Annotation | null>;
  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation>;
  deleteAnnotation(id: string): Promise<void>;
  listAnnotations(resourceId: string, layerId?: string): Promise<Annotation[]>;

  // Layer operations
  createLayer(layer: Omit<AnnotationLayer, 'id' | 'createdAt'>): Promise<AnnotationLayer>;
  getLayer(id: string): Promise<AnnotationLayer | null>;
  updateLayer(id: string, updates: Partial<AnnotationLayer>): Promise<AnnotationLayer>;
  deleteLayer(id: string): Promise<void>;
  listLayers(resourceId: string): Promise<AnnotationLayer[]>;

  // Notification operations
  createNotification(notification: Omit<CommentNotification, 'id' | 'createdAt'>): Promise<CommentNotification>;
  getNotifications(userId: string, unreadOnly?: boolean): Promise<CommentNotification[]>;
  markAsRead(notificationId: string): Promise<void>;
}

export class CommentManager extends EventEmitter {
  constructor(private store: CommentStore) {
    super();
  }

  // Thread management
  async createThread(
    workspaceId: string,
    resourceType: string,
    resourceId: string,
    createdBy: string,
    anchor: CommentThread['anchor'],
    options?: {
      projectId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<CommentThread> {
    const thread = await this.store.createThread({
      workspaceId,
      projectId: options?.projectId,
      resourceType,
      resourceId,
      anchorType: this.determineAnchorType(anchor),
      anchor,
      status: CommentStatus.OPEN,
      createdBy,
      metadata: options?.metadata
    });

    this.emit('thread:created', { thread });

    return thread;
  }

  async resolveThread(threadId: string, resolvedBy: string): Promise<CommentThread> {
    const thread = await this.store.updateThread(threadId, {
      status: CommentStatus.RESOLVED,
      resolvedBy,
      resolvedAt: new Date()
    });

    this.emit('thread:resolved', { thread, resolvedBy });

    // Notify participants
    const comments = await this.store.listComments(threadId);
    const participants = [...new Set(comments.map(c => c.authorId))];
    await this.notifyUsers(participants, threadId, 'resolution');

    return thread;
  }

  async reopenThread(threadId: string): Promise<CommentThread> {
    const thread = await this.store.updateThread(threadId, {
      status: CommentStatus.OPEN,
      resolvedBy: undefined,
      resolvedAt: undefined
    });

    this.emit('thread:reopened', { thread });

    return thread;
  }

  // Comment management
  async addComment(
    threadId: string,
    authorId: string,
    content: RichTextContent[],
    options?: {
      parentCommentId?: string;
      attachments?: Comment['attachments'];
    }
  ): Promise<Comment> {
    // Extract mentions
    const mentions = this.extractMentions(content);

    // Generate plain text for search
    const plainText = content.map(c => c.content).join(' ');

    const comment = await this.store.createComment({
      threadId,
      authorId,
      content,
      plainText,
      attachments: options?.attachments || [],
      mentions,
      isEdited: false,
      parentCommentId: options?.parentCommentId
    });

    this.emit('comment:created', { comment });

    // Send notifications to mentioned users
    if (mentions.length > 0) {
      await this.notifyUsers(mentions, comment.id, 'mention');
    }

    // Notify thread participants
    const thread = await this.store.getThread(threadId);
    if (thread) {
      const comments = await this.store.listComments(threadId);
      const participants = [...new Set(comments.map(c => c.authorId).filter(id => id !== authorId))];
      await this.notifyUsers(participants, comment.id, 'reply');
    }

    return comment;
  }

  async editComment(
    commentId: string,
    content: RichTextContent[]
  ): Promise<Comment> {
    const mentions = this.extractMentions(content);
    const plainText = content.map(c => c.content).join(' ');

    const comment = await this.store.updateComment(commentId, {
      content,
      plainText,
      mentions,
      isEdited: true,
      editedAt: new Date()
    });

    this.emit('comment:edited', { comment });

    return comment;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.store.getComment(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new Error('Only the author can delete a comment');
    }

    await this.store.deleteComment(commentId);

    this.emit('comment:deleted', { commentId, threadId: comment.threadId });
  }

  // Reaction management
  async addReaction(
    commentId: string,
    userId: string,
    type: ReactionType
  ): Promise<CommentReaction> {
    const reaction = await this.store.addReaction({
      commentId,
      userId,
      type
    });

    this.emit('reaction:added', { reaction });

    // Notify comment author
    const comment = await this.store.getComment(commentId);
    if (comment && comment.authorId !== userId) {
      await this.notifyUsers([comment.authorId], commentId, 'reaction');
    }

    return reaction;
  }

  async removeReaction(
    commentId: string,
    userId: string,
    type: ReactionType
  ): Promise<void> {
    await this.store.removeReaction(commentId, userId, type);

    this.emit('reaction:removed', { commentId, userId, type });
  }

  async getReactionsSummary(commentId: string): Promise<Record<ReactionType, number>> {
    const reactions = await this.store.getReactions(commentId);

    const summary: Record<string, number> = {};
    for (const reaction of reactions) {
      summary[reaction.type] = (summary[reaction.type] || 0) + 1;
    }

    return summary as Record<ReactionType, number>;
  }

  // Voting
  async upvoteComment(commentId: string, userId: string): Promise<CommentVote> {
    return this.store.addVote({ commentId, userId, value: 1 });
  }

  async downvoteComment(commentId: string, userId: string): Promise<CommentVote> {
    return this.store.addVote({ commentId, userId, value: -1 });
  }

  async getVoteScore(commentId: string): Promise<{ score: number; upvotes: number; downvotes: number }> {
    const votes = await this.store.getVotes(commentId);

    const upvotes = votes.filter(v => v.value > 0).length;
    const downvotes = votes.filter(v => v.value < 0).length;
    const score = upvotes - downvotes;

    return { score, upvotes, downvotes };
  }

  // Annotation management
  async createAnnotation(
    workspaceId: string,
    resourceType: string,
    resourceId: string,
    createdBy: string,
    type: Annotation['type'],
    geometry: Annotation['geometry'],
    options?: {
      layerId?: string;
      style?: Annotation['style'];
      content?: string;
      linkedCommentId?: string;
    }
  ): Promise<Annotation> {
    const annotation = await this.store.createAnnotation({
      workspaceId,
      resourceType,
      resourceId,
      layerId: options?.layerId,
      type,
      geometry,
      style: options?.style || { color: '#FFFF00', opacity: 0.5 },
      content: options?.content,
      linkedCommentId: options?.linkedCommentId,
      createdBy,
      metadata: {}
    });

    this.emit('annotation:created', { annotation });

    return annotation;
  }

  async updateAnnotation(
    annotationId: string,
    updates: Partial<Pick<Annotation, 'geometry' | 'style' | 'content'>>
  ): Promise<Annotation> {
    const annotation = await this.store.updateAnnotation(annotationId, {
      ...updates,
      updatedAt: new Date()
    });

    this.emit('annotation:updated', { annotation });

    return annotation;
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await this.store.deleteAnnotation(annotationId);
    this.emit('annotation:deleted', { annotationId });
  }

  // Layer management
  async createLayer(
    workspaceId: string,
    resourceId: string,
    name: string,
    createdBy: string,
    options?: {
      description?: string;
      order?: number;
    }
  ): Promise<AnnotationLayer> {
    const existingLayers = await this.store.listLayers(resourceId);
    const order = options?.order ?? existingLayers.length;

    const layer = await this.store.createLayer({
      workspaceId,
      resourceId,
      name,
      description: options?.description,
      isVisible: true,
      isLocked: false,
      opacity: 1.0,
      order,
      createdBy
    });

    this.emit('layer:created', { layer });

    return layer;
  }

  async toggleLayerVisibility(layerId: string): Promise<AnnotationLayer> {
    const layer = await this.store.getLayer(layerId);
    if (!layer) {
      throw new Error('Layer not found');
    }

    return this.store.updateLayer(layerId, {
      isVisible: !layer.isVisible
    });
  }

  // Search and filter
  async searchComments(
    query: string,
    filter: CommentFilter
  ): Promise<CommentSearchResult> {
    return this.store.searchThreads(query, filter);
  }

  async getCommentsForResource(
    resourceType: string,
    resourceId: string,
    status?: CommentStatus
  ): Promise<{ threads: CommentThread[]; comments: Comment[] }> {
    const threads = await this.store.listThreads({
      resourceType,
      resourceId,
      status
    });

    const comments: Comment[] = [];
    for (const thread of threads) {
      const threadComments = await this.store.listComments(thread.id);
      comments.push(...threadComments);
    }

    return { threads, comments };
  }

  // Notifications
  async getUnreadNotifications(userId: string): Promise<CommentNotification[]> {
    return this.store.getNotifications(userId, true);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.store.markAsRead(notificationId);
    this.emit('notification:read', { notificationId });
  }

  // Helper methods
  private extractMentions(content: RichTextContent[]): string[] {
    const mentions: string[] = [];
    for (const block of content) {
      if (block.mentions) {
        mentions.push(...block.mentions.map(m => m.userId));
      }
    }
    return [...new Set(mentions)];
  }

  private determineAnchorType(anchor: CommentThread['anchor']): CommentThread['anchorType'] {
    if (anchor.textPosition) return 'text';
    if (anchor.elementId) return 'element';
    if (anchor.coordinates) return 'coordinate';
    return 'global';
  }

  private async notifyUsers(
    userIds: string[],
    commentId: string,
    type: CommentNotification['type']
  ): Promise<void> {
    const comment = await this.store.getComment(commentId);
    if (!comment) return;

    for (const userId of userIds) {
      await this.store.createNotification({
        userId,
        commentId,
        threadId: comment.threadId,
        type,
        read: false
      });
    }

    this.emit('notifications:sent', { userIds, commentId, type });
  }

  // Analytics
  async getCommentStats(workspaceId: string, dateFrom?: Date, dateTo?: Date) {
    const filter: CommentFilter = {
      workspaceId,
      dateFrom,
      dateTo
    };

    const threads = await this.store.listThreads(filter);
    const allComments: Comment[] = [];

    for (const thread of threads) {
      const comments = await this.store.listComments(thread.id);
      allComments.push(...comments);
    }

    return {
      totalThreads: threads.length,
      openThreads: threads.filter(t => t.status === CommentStatus.OPEN).length,
      resolvedThreads: threads.filter(t => t.status === CommentStatus.RESOLVED).length,
      totalComments: allComments.length,
      uniqueAuthors: new Set(allComments.map(c => c.authorId)).size,
      averageCommentsPerThread: allComments.length / threads.length,
      threadsWithAttachments: threads.filter(t =>
        allComments.some(c => c.threadId === t.id && c.attachments.length > 0)
      ).length
    };
  }
}
