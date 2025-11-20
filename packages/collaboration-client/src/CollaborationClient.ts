/**
 * IntelGraph Collaboration Client SDK
 *
 * Easy-to-use client for integrating collaboration features into applications
 */

export interface ClientConfig {
  apiUrl: string;
  wsUrl?: string;
  apiKey?: string;
  onError?: (error: Error) => void;
  onReconnect?: () => void;
}

export class CollaborationClient {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private sessionId?: string;
  private eventHandlers = new Map<string, Set<Function>>();

  constructor(private config: ClientConfig) {}

  // ========== Connection Management ==========

  /**
   * Connect to real-time collaboration
   */
  async connect(userId: string, workspaceId: string, documentId: string): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.apiUrl.replace('http', 'ws');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${wsUrl}/ws`);

      this.ws.onopen = () => {
        this.send({
          type: 'connect',
          userId,
          workspaceId,
          documentId,
          permissions: ['read', 'write']
        });
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'connected') {
          this.sessionId = message.sessionId;
          this.reconnectAttempts = 0;
          resolve();
        } else {
          this.handleMessage(message);
        }
      };

      this.ws.onerror = (error) => {
        this.config.onError?.(new Error('WebSocket error'));
        reject(error);
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    });
  }

  /**
   * Disconnect from real-time collaboration
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
      this.sessionId = undefined;
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.config.onReconnect?.();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private handleMessage(message: any): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: Function): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  // ========== Real-Time Operations ==========

  /**
   * Send an operation to the server
   */
  sendOperation(operation: any): void {
    this.send({
      type: 'operation',
      sessionId: this.sessionId,
      operation
    });
  }

  /**
   * Update presence information
   */
  updatePresence(cursor?: { position: number; selection?: any }, status?: string): void {
    this.send({
      type: 'presence',
      presence: {
        userId: 'current-user',
        cursor,
        status: status || 'active',
        lastActivity: new Date()
      }
    });
  }

  // ========== REST API Methods ==========

  private async fetch(path: string, options?: RequestInit): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(`${this.config.apiUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // === Workspaces ===

  async createWorkspace(name: string, ownerId: string, options?: any) {
    return this.fetch('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, ownerId, ...options })
    });
  }

  async getWorkspace(id: string) {
    return this.fetch(`/api/workspaces/${id}`);
  }

  async inviteMember(workspaceId: string, email: string, role: string, invitedBy: string) {
    return this.fetch(`/api/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role, invitedBy })
    });
  }

  // === Documents ===

  async createDocument(workspaceId: string, authorId: string, title: string, content: string, options?: any) {
    return this.fetch('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, authorId, title, content, ...options })
    });
  }

  async updateDocument(documentId: string, userId: string, updates: any) {
    return this.fetch(`/api/documents/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...updates })
    });
  }

  async searchDocuments(workspaceId: string, query: string) {
    return this.fetch(`/api/workspaces/${workspaceId}/documents/search?q=${encodeURIComponent(query)}`);
  }

  // === Tasks ===

  async createBoard(workspaceId: string, name: string, createdBy: string, options?: any) {
    return this.fetch('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, name, createdBy, ...options })
    });
  }

  async createTask(workspaceId: string, boardId: string, reporterId: string, title: string, options?: any) {
    return this.fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, boardId, reporterId, title, ...options })
    });
  }

  async updateTaskStatus(taskId: string, status: string, userId: string) {
    return this.fetch(`/api/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, userId })
    });
  }

  // === Comments ===

  async createCommentThread(workspaceId: string, resourceType: string, resourceId: string, createdBy: string, anchor: any, options?: any) {
    return this.fetch('/api/comments/threads', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, resourceType, resourceId, createdBy, anchor, ...options })
    });
  }

  async addComment(threadId: string, authorId: string, content: any[], options?: any) {
    return this.fetch(`/api/comments/threads/${threadId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ authorId, content, ...options })
    });
  }

  async addReaction(commentId: string, userId: string, type: string) {
    return this.fetch(`/api/comments/${commentId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ userId, type })
    });
  }

  // === Notifications ===

  async getNotifications(userId: string, unreadOnly?: boolean) {
    const query = unreadOnly ? '?unread=true' : '';
    return this.fetch(`/api/users/${userId}/notifications${query}`);
  }

  async markNotificationAsRead(notificationId: string) {
    return this.fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST'
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    return this.fetch(`/api/users/${userId}/notifications/read-all`, {
      method: 'POST'
    });
  }

  // === Activity Feed ===

  async getActivityFeed(workspaceId: string, options?: { limit?: number; offset?: number }) {
    const query = new URLSearchParams(options as any).toString();
    return this.fetch(`/api/workspaces/${workspaceId}/activity${query ? '?' + query : ''}`);
  }

  // === Sharing ===

  async createShareLink(workspaceId: string, resourceType: string, resourceId: string, type: string, createdBy: string, options?: any) {
    return this.fetch('/api/share', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, resourceType, resourceId, type, createdBy, ...options })
    });
  }

  async getShareLink(token: string) {
    return this.fetch(`/api/share/${token}`);
  }

  async revokeShareLink(linkId: string) {
    return this.fetch(`/api/share/${linkId}`, {
      method: 'DELETE'
    });
  }

  // === Marketplace ===

  async publishAsset(authorId: string, name: string, description: string, type: string, contentUrl: string, options?: any) {
    return this.fetch('/api/marketplace/assets', {
      method: 'POST',
      body: JSON.stringify({ authorId, name, description, type, contentUrl, ...options })
    });
  }

  async searchAssets(query: string, filters?: any) {
    const params = new URLSearchParams({ q: query, ...filters }).toString();
    return this.fetch(`/api/marketplace/assets/search?${params}`);
  }

  async downloadAsset(assetId: string, userId: string) {
    return this.fetch(`/api/marketplace/assets/${assetId}/download`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // === Meetings ===

  async scheduleMeeting(workspaceId: string, hostId: string, title: string, options?: any) {
    return this.fetch('/api/meetings', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, hostId, title, ...options })
    });
  }

  async startMeeting(meetingId: string) {
    return this.fetch(`/api/meetings/${meetingId}/start`, {
      method: 'POST'
    });
  }
}
