import { EventEmitter } from 'events';
import { PubSub } from 'graphql-subscriptions';
import { cacheService } from './cacheService';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  lastSeen: string;
}

export interface UserPresence {
  userId: string;
  investigationId: string;
  currentPage: string;
  cursorPosition?: { x: number; y: number };
  selectedEntityId?: string;
  timestamp: string;
}

export interface CollaborativeEdit {
  id: string;
  userId: string;
  investigationId: string;
  entityId: string;
  editType: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  changes: any;
  timestamp: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
}

export interface Comment {
  id: string;
  userId: string;
  investigationId: string;
  entityId?: string;
  content: string;
  position?: { x: number; y: number };
  timestamp: string;
  replies: Comment[];
  resolved: boolean;
}

export interface LiveNotification {
  id: string;
  type:
    | 'USER_JOINED'
    | 'USER_LEFT'
    | 'ENTITY_UPDATED'
    | 'COMMENT_ADDED'
    | 'EDIT_CONFLICT';
  userId: string;
  investigationId: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

export class CollaborationService extends EventEmitter {
  private activeUsers: Map<string, UserPresence> = new Map();
  private pendingEdits: Map<string, CollaborativeEdit> = new Map();
  private comments: Map<string, Comment> = new Map();
  private notifications: LiveNotification[] = [];
  private maxNotifications = 100;
  private pubsub: PubSub;

  constructor() {
    super();
    this.pubsub = new PubSub();
    console.log('[COLLABORATION] Real-time collaboration service initialized');

    // Clean up inactive users every minute
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000);
  }

  /**
   * Get async iterator for GraphQL subscriptions
   */
  asyncIterator(eventNames: string[]) {
    return this.pubsub.asyncIterator(eventNames);
  }

  /**
   * User joins an investigation
   */
  async joinInvestigation(
    userId: string,
    investigationId: string,
    userInfo: User,
  ): Promise<void> {
    const presence: UserPresence = {
      userId,
      investigationId,
      currentPage: 'graph',
      timestamp: new Date().toISOString(),
    };

    this.activeUsers.set(`${userId}:${investigationId}`, presence);

    // Cache user presence
    await cacheService.set(
      `presence:${userId}:${investigationId}`,
      presence,
      300,
    );

    // Notify other users
    const notification: LiveNotification = {
      id: `notif-${Date.now()}`,
      type: 'USER_JOINED',
      userId,
      investigationId,
      message: `${userInfo.name} joined the investigation`,
      timestamp: new Date().toISOString(),
      metadata: { userInfo },
    };

    this.addNotification(notification);
    this.emit('userJoined', { userId, investigationId, userInfo, presence });
    this.pubsub.publish('userJoined', {
      userId,
      investigationId,
      userInfo,
      presence,
    });

    console.log(
      `[COLLABORATION] User ${userInfo.name} joined investigation ${investigationId}`,
    );
  }

  /**
   * User leaves an investigation
   */
  async leaveInvestigation(
    userId: string,
    investigationId: string,
  ): Promise<void> {
    const presenceKey = `${userId}:${investigationId}`;
    const presence = this.activeUsers.get(presenceKey);

    if (presence) {
      this.activeUsers.delete(presenceKey);
      await cacheService.delete(`presence:${userId}:${investigationId}`);

      const notification: LiveNotification = {
        id: `notif-${Date.now()}`,
        type: 'USER_LEFT',
        userId,
        investigationId,
        message: `User left the investigation`,
        timestamp: new Date().toISOString(),
      };

      this.addNotification(notification);
      this.emit('userLeft', { userId, investigationId });
      this.pubsub.publish('userLeft', { userId, investigationId });

      console.log(
        `[COLLABORATION] User ${userId} left investigation ${investigationId}`,
      );
    }
  }

  /**
   * Update user presence (cursor position, selected entity, etc.)
   */
  async updatePresence(
    userId: string,
    investigationId: string,
    updates: Partial<UserPresence>,
  ): Promise<void> {
    const presenceKey = `${userId}:${investigationId}`;
    const currentPresence = this.activeUsers.get(presenceKey);

    if (currentPresence) {
      const updatedPresence = {
        ...currentPresence,
        ...updates,
        timestamp: new Date().toISOString(),
      };

      this.activeUsers.set(presenceKey, updatedPresence);
      await cacheService.set(
        `presence:${userId}:${investigationId}`,
        updatedPresence,
        300,
      );

      this.emit('presenceUpdated', {
        userId,
        investigationId,
        presence: updatedPresence,
      });
      this.pubsub.publish('presenceUpdated', {
        userId,
        investigationId,
        presence: updatedPresence,
      });
    }
  }

  /**
   * Get active users for an investigation
   */
  getActiveUsers(investigationId: string): UserPresence[] {
    const activeUsers: UserPresence[] = [];

    for (const [key, presence] of this.activeUsers.entries()) {
      if (presence.investigationId === investigationId) {
        // Check if user is still active (last update within 2 minutes)
        const lastUpdate = new Date(presence.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - lastUpdate.getTime();

        if (timeDiff < 120000) {
          // 2 minutes
          activeUsers.push(presence);
        }
      }
    }

    return activeUsers;
  }

  /**
   * Submit a collaborative edit
   */
  async submitEdit(
    edit: Omit<CollaborativeEdit, 'id' | 'timestamp' | 'status'>,
  ): Promise<CollaborativeEdit> {
    const collaborativeEdit: CollaborativeEdit = {
      ...edit,
      id: `edit-${Date.now()}-${edit.userId}`,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
    };

    this.pendingEdits.set(collaborativeEdit.id, collaborativeEdit);

    // Check for edit conflicts
    const conflicts = this.detectEditConflicts(collaborativeEdit);

    if (conflicts.length > 0) {
      console.log(
        `[COLLABORATION] Edit conflicts detected for edit ${collaborativeEdit.id}`,
      );

      const notification: LiveNotification = {
        id: `notif-${Date.now()}`,
        type: 'EDIT_CONFLICT',
        userId: edit.userId,
        investigationId: edit.investigationId,
        message: `Edit conflict detected for entity ${edit.entityId}`,
        timestamp: new Date().toISOString(),
        metadata: { conflicts, editId: collaborativeEdit.id },
      };

      this.addNotification(notification);
    }

    this.emit('editSubmitted', collaborativeEdit);
    this.pubsub.publish('editSubmitted', collaborativeEdit);
    console.log(
      `[COLLABORATION] Edit submitted: ${collaborativeEdit.id} by user ${edit.userId}`,
    );

    return collaborativeEdit;
  }

  /**
   * Apply or reject an edit
   */
  async resolveEdit(
    editId: string,
    status: 'APPLIED' | 'REJECTED',
    resolvedBy: string,
  ): Promise<CollaborativeEdit | null> {
    const edit = this.pendingEdits.get(editId);

    if (edit) {
      edit.status = status;

      if (status === 'APPLIED') {
        // Apply the edit (in a real implementation, this would update the graph)
        console.log(`[COLLABORATION] Edit ${editId} applied by ${resolvedBy}`);

        const notification: LiveNotification = {
          id: `notif-${Date.now()}`,
          type: 'ENTITY_UPDATED',
          userId: resolvedBy,
          investigationId: edit.investigationId,
          message: `Entity ${edit.entityId} was updated`,
          timestamp: new Date().toISOString(),
          metadata: { editId, changes: edit.changes },
        };

        this.addNotification(notification);
      }

      this.emit('editResolved', { editId, status, resolvedBy, edit });

      // Remove from pending after 5 minutes
      setTimeout(() => {
        this.pendingEdits.delete(editId);
      }, 300000);

      return edit;
    }

    return null;
  }

  /**
   * Add a comment
   */
  async addComment(
    comment: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'resolved'>,
  ): Promise<Comment> {
    const newComment: Comment = {
      ...comment,
      id: `comment-${Date.now()}-${comment.userId}`,
      timestamp: new Date().toISOString(),
      replies: [],
      resolved: false,
    };

    this.comments.set(newComment.id, newComment);

    const notification: LiveNotification = {
      id: `notif-${Date.now()}`,
      type: 'COMMENT_ADDED',
      userId: comment.userId,
      investigationId: comment.investigationId,
      message: `New comment added`,
      timestamp: new Date().toISOString(),
      metadata: { commentId: newComment.id, entityId: comment.entityId },
    };

    this.addNotification(notification);
    this.emit('commentAdded', newComment);
    this.pubsub.publish('commentAdded', newComment);

    console.log(
      `[COLLABORATION] Comment added: ${newComment.id} by user ${comment.userId}`,
    );
    return newComment;
  }

  /**
   * Get comments for an investigation or entity
   */
  getComments(investigationId: string, entityId?: string): Comment[] {
    const comments: Comment[] = [];

    for (const comment of this.comments.values()) {
      if (comment.investigationId === investigationId) {
        if (!entityId || comment.entityId === entityId) {
          comments.push(comment);
        }
      }
    }

    return comments.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Get recent notifications
   */
  getRecentNotifications(
    investigationId: string,
    limit: number = 20,
  ): LiveNotification[] {
    return this.notifications
      .filter((notif) => notif.investigationId === investigationId)
      .slice(0, limit);
  }

  /**
   * Get pending edits for an investigation
   */
  getPendingEdits(investigationId: string): CollaborativeEdit[] {
    const edits: CollaborativeEdit[] = [];

    for (const edit of this.pendingEdits.values()) {
      if (
        edit.investigationId === investigationId &&
        edit.status === 'PENDING'
      ) {
        edits.push(edit);
      }
    }

    return edits.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Get collaboration statistics
   */
  getCollaborationStats() {
    const activeInvestigations = new Set();
    const totalUsers = this.activeUsers.size;

    for (const presence of this.activeUsers.values()) {
      activeInvestigations.add(presence.investigationId);
    }

    return {
      activeUsers: totalUsers,
      activeInvestigations: activeInvestigations.size,
      pendingEdits: this.pendingEdits.size,
      totalComments: this.comments.size,
      recentNotifications: this.notifications.length,
    };
  }

  private detectEditConflicts(newEdit: CollaborativeEdit): CollaborativeEdit[] {
    const conflicts: CollaborativeEdit[] = [];

    // Check for concurrent edits on the same entity
    for (const edit of this.pendingEdits.values()) {
      if (
        edit.entityId === newEdit.entityId &&
        edit.investigationId === newEdit.investigationId &&
        edit.userId !== newEdit.userId &&
        edit.status === 'PENDING'
      ) {
        // Check if edits are within conflict window (5 minutes)
        const editTime = new Date(edit.timestamp);
        const newEditTime = new Date(newEdit.timestamp);
        const timeDiff = Math.abs(newEditTime.getTime() - editTime.getTime());

        if (timeDiff < 300000) {
          // 5 minutes
          conflicts.push(edit);
        }
      }
    }

    return conflicts;
  }

  private addNotification(notification: LiveNotification): void {
    this.notifications.unshift(notification);

    // Keep only the most recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.emit('notification', notification);
    this.pubsub.publish('notification', notification);
  }

  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes
    let cleanedUp = 0;

    for (const [key, presence] of this.activeUsers.entries()) {
      const lastUpdate = new Date(presence.timestamp);
      const timeDiff = now.getTime() - lastUpdate.getTime();

      if (timeDiff > inactiveThreshold) {
        this.activeUsers.delete(key);
        cacheService.delete(
          `presence:${presence.userId}:${presence.investigationId}`,
        );
        cleanedUp++;
      }
    }

    if (cleanedUp > 0) {
      console.log(
        `[COLLABORATION] Cleaned up ${cleanedUp} inactive user presences`,
      );
    }
  }
}

// Global collaboration service instance
export const collaborationService = new CollaborationService();
