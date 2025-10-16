/**
 * Presence Manager for Real-time Collaboration
 * Manages user presence, cursors, selections, and real-time activity tracking
 */

import { EventEmitter } from 'events';
import { CollaborationUser, PresenceUpdate } from './collaborationEngine';

export interface UserPresence {
  userId: string;
  sessionId: string;
  isOnline: boolean;
  lastSeen: Date;
  status: 'active' | 'idle' | 'away' | 'busy' | 'offline';
  cursor: {
    x: number;
    y: number;
    nodeId?: string;
    elementType?: 'node' | 'edge' | 'canvas' | 'panel';
    viewport: string;
  };
  selection: {
    nodes: string[];
    edges: string[];
    properties: string[];
    isMultiSelect: boolean;
  };
  viewport: {
    id: string;
    x: number;
    y: number;
    zoom: number;
    bounds: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    };
  };
  activity: {
    typing: boolean;
    speaking: boolean;
    sharing: boolean;
    editing: string | null; // ID of element being edited
    tool: string | null; // Current tool/mode
  };
  preferences: {
    color: string;
    showCursor: boolean;
    showSelection: boolean;
    showViewport: boolean;
    animateMovements: boolean;
  };
}

export interface PresenceConfig {
  heartbeatInterval: number; // milliseconds
  idleTimeout: number; // milliseconds
  awayTimeout: number; // milliseconds
  offlineTimeout: number; // milliseconds
  cursorUpdateThrottle: number; // milliseconds
  selectionUpdateThrottle: number; // milliseconds
  maxPresenceHistory: number;
  enableActivityTracking: boolean;
  enableCursorSmoothing: boolean;
}

export class PresenceManager extends EventEmitter {
  private presenceData: Map<string, Map<string, UserPresence>> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private activityTimers: Map<string, NodeJS.Timeout> = new Map();
  private presenceHistory: Map<string, PresenceUpdate[]> = new Map();
  private config: PresenceConfig;
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PresenceConfig> = {}) {
    super();
    this.config = {
      heartbeatInterval: 30000, // 30 seconds
      idleTimeout: 300000, // 5 minutes
      awayTimeout: 900000, // 15 minutes
      offlineTimeout: 60000, // 1 minute
      cursorUpdateThrottle: 50, // 20fps
      selectionUpdateThrottle: 100, // 10fps
      maxPresenceHistory: 1000,
      enableActivityTracking: true,
      enableCursorSmoothing: true,
      ...config,
    };

    this.setupCleanupTasks();
  }

  /**
   * Initialize user presence in a session
   */
  initializePresence(sessionId: string, user: CollaborationUser): UserPresence {
    if (!this.presenceData.has(sessionId)) {
      this.presenceData.set(sessionId, new Map());
      this.presenceHistory.set(sessionId, []);
    }

    const presence: UserPresence = {
      userId: user.id,
      sessionId,
      isOnline: true,
      lastSeen: new Date(),
      status: 'active',
      cursor: {
        x: 0,
        y: 0,
        viewport: 'main',
      },
      selection: {
        nodes: [],
        edges: [],
        properties: [],
        isMultiSelect: false,
      },
      viewport: {
        id: 'main',
        x: 0,
        y: 0,
        zoom: 1.0,
        bounds: { left: 0, top: 0, right: 1920, bottom: 1080 },
      },
      activity: {
        typing: false,
        speaking: false,
        sharing: false,
        editing: null,
        tool: null,
      },
      preferences: {
        color: this.generateUserColor(user.id),
        showCursor: true,
        showSelection: true,
        showViewport: false,
        animateMovements: true,
      },
    };

    this.presenceData.get(sessionId)!.set(user.id, presence);
    this.startHeartbeat(sessionId, user.id);

    this.emit('presence_initialized', { sessionId, userId: user.id, presence });
    return presence;
  }

  /**
   * Update cursor position
   */
  updateCursor(
    sessionId: string,
    userId: string,
    cursor: Partial<UserPresence['cursor']>,
  ): void {
    const throttleKey = `cursor-${sessionId}-${userId}`;

    if (this.throttleTimers.has(throttleKey)) {
      return; // Throttled
    }

    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const updatedPresence = {
      ...presence,
      cursor: { ...presence.cursor, ...cursor },
      lastSeen: new Date(),
      status: 'active' as const,
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    // Apply smoothing if enabled
    if (this.config.enableCursorSmoothing) {
      this.smoothCursorMovement(sessionId, userId, cursor);
    }

    this.recordPresenceUpdate(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'cursor',
      data: { cursor: updatedPresence.cursor },
    });

    this.emit('cursor_updated', {
      sessionId,
      userId,
      cursor: updatedPresence.cursor,
    });

    // Set throttle timer
    this.throttleTimers.set(
      throttleKey,
      setTimeout(() => {
        this.throttleTimers.delete(throttleKey);
      }, this.config.cursorUpdateThrottle),
    );
  }

  /**
   * Update selection
   */
  updateSelection(
    sessionId: string,
    userId: string,
    selection: Partial<UserPresence['selection']>,
  ): void {
    const throttleKey = `selection-${sessionId}-${userId}`;

    if (this.throttleTimers.has(throttleKey)) {
      return; // Throttled
    }

    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const updatedPresence = {
      ...presence,
      selection: { ...presence.selection, ...selection },
      lastSeen: new Date(),
      status: 'active' as const,
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    this.recordPresenceUpdate(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'selection',
      data: { selection: updatedPresence.selection },
    });

    this.emit('selection_updated', {
      sessionId,
      userId,
      selection: updatedPresence.selection,
    });

    // Set throttle timer
    this.throttleTimers.set(
      throttleKey,
      setTimeout(() => {
        this.throttleTimers.delete(throttleKey);
      }, this.config.selectionUpdateThrottle),
    );
  }

  /**
   * Update viewport
   */
  updateViewport(
    sessionId: string,
    userId: string,
    viewport: Partial<UserPresence['viewport']>,
  ): void {
    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const updatedPresence = {
      ...presence,
      viewport: { ...presence.viewport, ...viewport },
      lastSeen: new Date(),
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    this.recordPresenceUpdate(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'viewport',
      data: { viewport: updatedPresence.viewport },
    });

    this.emit('viewport_updated', {
      sessionId,
      userId,
      viewport: updatedPresence.viewport,
    });
  }

  /**
   * Update activity status
   */
  updateActivity(
    sessionId: string,
    userId: string,
    activity: Partial<UserPresence['activity']>,
  ): void {
    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const updatedPresence = {
      ...presence,
      activity: { ...presence.activity, ...activity },
      lastSeen: new Date(),
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    this.recordPresenceUpdate(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'activity',
      data: { activity: updatedPresence.activity },
    });

    this.emit('activity_updated', {
      sessionId,
      userId,
      activity: updatedPresence.activity,
    });

    // Reset idle timer
    this.resetActivityTimer(sessionId, userId);
  }

  /**
   * Update user status
   */
  updateStatus(
    sessionId: string,
    userId: string,
    status: UserPresence['status'],
  ): void {
    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const updatedPresence = {
      ...presence,
      status,
      lastSeen: new Date(),
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    this.recordPresenceUpdate(sessionId, {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'activity',
      data: { status },
    });

    this.emit('status_updated', { sessionId, userId, status });
  }

  /**
   * Set user as typing
   */
  setTyping(sessionId: string, userId: string, isTyping: boolean): void {
    this.updateActivity(sessionId, userId, { typing: isTyping });
  }

  /**
   * Set user editing status
   */
  setEditing(
    sessionId: string,
    userId: string,
    elementId: string | null,
  ): void {
    this.updateActivity(sessionId, userId, { editing: elementId });
  }

  /**
   * Set active tool
   */
  setTool(sessionId: string, userId: string, tool: string | null): void {
    this.updateActivity(sessionId, userId, { tool });
  }

  /**
   * Get user presence
   */
  getPresence(sessionId: string, userId: string): UserPresence | null {
    const sessionPresence = this.presenceData.get(sessionId);
    return sessionPresence?.get(userId) || null;
  }

  /**
   * Get all presence data for a session
   */
  getSessionPresence(sessionId: string): UserPresence[] {
    const sessionPresence = this.presenceData.get(sessionId);
    return sessionPresence ? Array.from(sessionPresence.values()) : [];
  }

  /**
   * Get online users in session
   */
  getOnlineUsers(sessionId: string): UserPresence[] {
    return this.getSessionPresence(sessionId).filter((p) => p.isOnline);
  }

  /**
   * Get presence statistics
   */
  getPresenceStats(sessionId: string): any {
    const presence = this.getSessionPresence(sessionId);
    const online = presence.filter((p) => p.isOnline);

    const statusCounts = presence.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const activitiesCounts = {
      typing: online.filter((p) => p.activity.typing).length,
      speaking: online.filter((p) => p.activity.speaking).length,
      sharing: online.filter((p) => p.activity.sharing).length,
      editing: online.filter((p) => p.activity.editing !== null).length,
    };

    return {
      total: presence.length,
      online: online.length,
      offline: presence.length - online.length,
      statusCounts,
      activitiesCounts,
      avgViewportZoom:
        online.reduce((sum, p) => sum + p.viewport.zoom, 0) / online.length ||
        1,
      selectionOverlap: this.calculateSelectionOverlap(online),
    };
  }

  /**
   * Remove user presence
   */
  removePresence(sessionId: string, userId: string): void {
    const sessionPresence = this.presenceData.get(sessionId);
    if (sessionPresence) {
      sessionPresence.delete(userId);
    }

    this.stopHeartbeat(sessionId, userId);
    this.clearActivityTimer(sessionId, userId);

    this.emit('presence_removed', { sessionId, userId });
  }

  /**
   * Clean up session presence data
   */
  cleanupSession(sessionId: string): void {
    const sessionPresence = this.presenceData.get(sessionId);
    if (sessionPresence) {
      for (const userId of sessionPresence.keys()) {
        this.removePresence(sessionId, userId);
      }
      this.presenceData.delete(sessionId);
    }

    this.presenceHistory.delete(sessionId);
    this.emit('session_cleaned', { sessionId });
  }

  /**
   * Start heartbeat for user
   */
  private startHeartbeat(sessionId: string, userId: string): void {
    const key = `${sessionId}:${userId}`;

    if (this.heartbeatTimers.has(key)) {
      clearInterval(this.heartbeatTimers.get(key)!);
    }

    const timer = setInterval(() => {
      const presence = this.getPresence(sessionId, userId);
      if (!presence) {
        this.stopHeartbeat(sessionId, userId);
        return;
      }

      // Check if user should be marked as offline
      const timeSinceLastSeen = Date.now() - presence.lastSeen.getTime();

      if (timeSinceLastSeen > this.config.offlineTimeout) {
        this.updatePresenceStatus(sessionId, userId, false, 'offline');
      } else if (timeSinceLastSeen > this.config.awayTimeout) {
        this.updatePresenceStatus(sessionId, userId, true, 'away');
      } else if (timeSinceLastSeen > this.config.idleTimeout) {
        this.updatePresenceStatus(sessionId, userId, true, 'idle');
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set(key, timer);
  }

  /**
   * Stop heartbeat for user
   */
  private stopHeartbeat(sessionId: string, userId: string): void {
    const key = `${sessionId}:${userId}`;
    const timer = this.heartbeatTimers.get(key);

    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(key);
    }
  }

  /**
   * Reset activity timer
   */
  private resetActivityTimer(sessionId: string, userId: string): void {
    const key = `${sessionId}:${userId}`;

    if (this.activityTimers.has(key)) {
      clearTimeout(this.activityTimers.get(key)!);
    }

    if (this.config.enableActivityTracking) {
      const timer = setTimeout(() => {
        this.updatePresenceStatus(sessionId, userId, true, 'idle');
      }, this.config.idleTimeout);

      this.activityTimers.set(key, timer);
    }
  }

  /**
   * Clear activity timer
   */
  private clearActivityTimer(sessionId: string, userId: string): void {
    const key = `${sessionId}:${userId}`;
    const timer = this.activityTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      this.activityTimers.delete(key);
    }
  }

  /**
   * Update presence status
   */
  private updatePresenceStatus(
    sessionId: string,
    userId: string,
    isOnline: boolean,
    status: UserPresence['status'],
  ): void {
    const presence = this.getPresence(sessionId, userId);
    if (!presence) return;

    const wasOnline = presence.isOnline;
    const wasStatus = presence.status;

    const updatedPresence = {
      ...presence,
      isOnline,
      status,
    };

    this.presenceData.get(sessionId)!.set(userId, updatedPresence);

    if (wasOnline !== isOnline || wasStatus !== status) {
      this.emit('presence_changed', {
        sessionId,
        userId,
        isOnline,
        status,
        previous: { isOnline: wasOnline, status: wasStatus },
      });
    }
  }

  /**
   * Generate unique color for user
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E9',
      '#F8C471',
      '#82E0AA',
      '#F1948A',
      '#85C1E9',
      '#D2B4DE',
    ];

    // Use user ID hash to consistently assign colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Smooth cursor movement for better UX
   */
  private smoothCursorMovement(
    sessionId: string,
    userId: string,
    newCursor: Partial<UserPresence['cursor']>,
  ): void {
    if (!this.config.enableCursorSmoothing) return;

    const presence = this.getPresence(sessionId, userId);
    if (!presence || !newCursor.x || !newCursor.y) return;

    const oldCursor = presence.cursor;
    const distance = Math.sqrt(
      Math.pow(newCursor.x! - oldCursor.x, 2) +
        Math.pow(newCursor.y! - oldCursor.y, 2),
    );

    // If movement is large, emit intermediate positions
    if (distance > 50) {
      const steps = Math.min(5, Math.floor(distance / 20));
      const stepX = (newCursor.x! - oldCursor.x) / steps;
      const stepY = (newCursor.y! - oldCursor.y) / steps;

      for (let i = 1; i < steps; i++) {
        setTimeout(() => {
          this.emit('cursor_intermediate', {
            sessionId,
            userId,
            cursor: {
              x: oldCursor.x + stepX * i,
              y: oldCursor.y + stepY * i,
              viewport: newCursor.viewport || oldCursor.viewport,
            },
          });
        }, i * 10); // 10ms intervals
      }
    }
  }

  /**
   * Calculate selection overlap between users
   */
  private calculateSelectionOverlap(users: UserPresence[]): number {
    if (users.length < 2) return 0;

    let totalOverlap = 0;
    let comparisons = 0;

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];

        const overlap = [
          ...user1.selection.nodes.filter((n) =>
            user2.selection.nodes.includes(n),
          ),
          ...user1.selection.edges.filter((e) =>
            user2.selection.edges.includes(e),
          ),
        ].length;

        const total =
          user1.selection.nodes.length +
          user1.selection.edges.length +
          user2.selection.nodes.length +
          user2.selection.edges.length;

        if (total > 0) {
          totalOverlap += (overlap * 2) / total;
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalOverlap / comparisons : 0;
  }

  /**
   * Record presence update for history/analytics
   */
  private recordPresenceUpdate(
    sessionId: string,
    update: PresenceUpdate,
  ): void {
    const history = this.presenceHistory.get(sessionId);
    if (!history) return;

    history.push(update);

    // Limit history size
    if (history.length > this.config.maxPresenceHistory) {
      history.splice(0, history.length - this.config.maxPresenceHistory);
    }
  }

  /**
   * Set up cleanup tasks
   */
  private setupCleanupTasks(): void {
    setInterval(() => {
      this.cleanupOfflineUsers();
      this.cleanupThrottleTimers();
    }, 60000); // Every minute
  }

  /**
   * Clean up offline users
   */
  private cleanupOfflineUsers(): void {
    const cutoff = Date.now() - this.config.offlineTimeout * 2; // Double timeout for cleanup

    for (const [sessionId, sessionPresence] of this.presenceData.entries()) {
      const usersToRemove = [];

      for (const [userId, presence] of sessionPresence.entries()) {
        if (!presence.isOnline && presence.lastSeen.getTime() < cutoff) {
          usersToRemove.push(userId);
        }
      }

      for (const userId of usersToRemove) {
        this.removePresence(sessionId, userId);
      }
    }
  }

  /**
   * Clean up expired throttle timers
   */
  private cleanupThrottleTimers(): void {
    // Throttle timers clean themselves up, but we can add additional cleanup here if needed
  }
}

export default PresenceManager;
