/**
 * Real-time Collaboration Engine for IntelGraph
 * WebSocket-based collaboration with operational transforms, presence awareness, and conflict resolution
 */

import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'viewer' | 'editor' | 'admin' | 'owner';
  permissions: string[];
  lastSeen: Date;
  isOnline: boolean;
  cursor?: {
    x: number;
    y: number;
    node?: string;
    viewport?: string;
  };
  selection?: {
    nodes: string[];
    edges: string[];
  };
}

export interface CollaborationSession {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  participants: CollaborationUser[];
  isActive: boolean;
  settings: {
    maxParticipants: number;
    allowGuests: boolean;
    requireApproval: boolean;
    recordSession: boolean;
    chatEnabled: boolean;
    voiceEnabled: boolean;
    screenShareEnabled: boolean;
  };
  metadata: Record<string, any>;
}

export interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'update' | 'move' | 'transform';
  userId: string;
  sessionId: string;
  timestamp: Date;
  data: {
    target: string; // node/edge/property ID
    targetType: 'node' | 'edge' | 'property' | 'graph' | 'workspace';
    action: string;
    payload: any;
    position?: number;
    oldValue?: any;
    newValue?: any;
  };
  dependencies: string[]; // Operation IDs this depends on
  metadata: {
    clientId: string;
    version: number;
    checksum: string;
  };
}

export interface TransformedOperation extends Operation {
  transformed: boolean;
  transformedAgainst: string[];
  conflictResolution?: 'auto' | 'manual' | 'merge';
}

export interface PresenceUpdate {
  userId: string;
  sessionId: string;
  timestamp: Date;
  type: 'cursor' | 'selection' | 'viewport' | 'activity' | 'typing' | 'voice';
  data: any;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  type: 'text' | 'system' | 'announcement' | 'reaction' | 'thread';
  content: string;
  metadata?: {
    replyTo?: string;
    mentions?: string[];
    attachments?: any[];
    reactions?: Record<string, string[]>;
  };
}

export interface ConflictResolution {
  id: string;
  operationIds: string[];
  conflictType:
    | 'concurrent_edit'
    | 'version_mismatch'
    | 'permission_denied'
    | 'data_validation';
  resolution: 'auto_merge' | 'user_choice' | 'last_write_wins' | 'manual_merge';
  resolvedBy?: string;
  timestamp: Date;
  details: any;
}

export class CollaborationEngine extends EventEmitter {
  private sessions: Map<string, CollaborationSession> = new Map();
  private connections: Map<string, WebSocket> = new Map();
  private operations: Map<string, Operation[]> = new Map();
  private presenceData: Map<string, Map<string, PresenceUpdate>> = new Map();
  private chatHistory: Map<string, ChatMessage[]> = new Map();
  private operationTransformer: OperationTransformer;
  private conflictResolver: ConflictResolver;
  private wsServer: WebSocketServer;

  constructor(port: number = 8080) {
    super();
    this.operationTransformer = new OperationTransformer();
    this.conflictResolver = new ConflictResolver();
    this.setupWebSocketServer(port);
    this.setupCleanupTasks();
  }

  /**
   * Create a new collaboration session
   */
  async createSession(
    workspaceId: string,
    name: string,
    createdBy: string,
    settings: Partial<CollaborationSession['settings']> = {},
  ): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: uuidv4(),
      workspaceId,
      name,
      createdBy,
      createdAt: new Date(),
      participants: [],
      isActive: true,
      settings: {
        maxParticipants: 50,
        allowGuests: false,
        requireApproval: false,
        recordSession: false,
        chatEnabled: true,
        voiceEnabled: false,
        screenShareEnabled: false,
        ...settings,
      },
      metadata: {},
    };

    this.sessions.set(session.id, session);
    this.operations.set(session.id, []);
    this.presenceData.set(session.id, new Map());
    this.chatHistory.set(session.id, []);

    this.emit('session_created', session);
    return session;
  }

  /**
   * Join a collaboration session
   */
  async joinSession(
    sessionId: string,
    user: CollaborationUser,
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    // Check permissions and limits
    if (session.participants.length >= session.settings.maxParticipants) {
      return false;
    }

    if (!session.settings.allowGuests && user.role === 'viewer') {
      if (session.settings.requireApproval) {
        await this.requestApproval(sessionId, user);
        return false; // Pending approval
      }
    }

    // Add user to session
    const existingUserIndex = session.participants.findIndex(
      (p) => p.id === user.id,
    );
    if (existingUserIndex >= 0) {
      session.participants[existingUserIndex] = {
        ...user,
        isOnline: true,
        lastSeen: new Date(),
      };
    } else {
      session.participants.push({
        ...user,
        isOnline: true,
        lastSeen: new Date(),
      });
    }

    // Initialize presence data
    const presenceMap = this.presenceData.get(sessionId)!;
    presenceMap.set(user.id, {
      userId: user.id,
      sessionId,
      timestamp: new Date(),
      type: 'activity',
      data: { status: 'joined' },
    });

    // Send session state to new participant
    await this.sendSessionState(sessionId, user.id);

    // Notify other participants
    await this.broadcastToSession(
      sessionId,
      {
        type: 'user_joined',
        data: { user },
      },
      user.id,
    );

    this.emit('user_joined', { sessionId, user });
    return true;
  }

  /**
   * Leave a collaboration session
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Update user status
    const userIndex = session.participants.findIndex((p) => p.id === userId);
    if (userIndex >= 0) {
      session.participants[userIndex].isOnline = false;
      session.participants[userIndex].lastSeen = new Date();
    }

    // Clean up presence data
    const presenceMap = this.presenceData.get(sessionId);
    if (presenceMap) {
      presenceMap.delete(userId);
    }

    // Remove WebSocket connection
    this.connections.delete(`${sessionId}:${userId}`);

    // Notify other participants
    await this.broadcastToSession(
      sessionId,
      {
        type: 'user_left',
        data: { userId },
      },
      userId,
    );

    this.emit('user_left', { sessionId, userId });
  }

  /**
   * Apply an operation to the session state
   */
  async applyOperation(
    sessionId: string,
    operation: Operation,
  ): Promise<TransformedOperation> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Validate operation
    if (!this.validateOperation(operation, session)) {
      throw new Error('Invalid operation');
    }

    // Get existing operations for conflict detection
    const existingOps = this.operations.get(sessionId) || [];

    // Transform operation against concurrent operations
    const transformedOp = await this.operationTransformer.transform(
      operation,
      existingOps,
    );

    // Check for conflicts
    const conflicts = await this.conflictResolver.detectConflicts(
      transformedOp,
      existingOps,
    );

    if (conflicts.length > 0) {
      // Handle conflicts
      const resolution = await this.conflictResolver.resolveConflicts(
        conflicts,
        transformedOp,
      );
      this.emit('conflict_resolved', {
        sessionId,
        operation: transformedOp,
        resolution,
      });
    }

    // Store operation
    existingOps.push(transformedOp);
    this.operations.set(sessionId, existingOps);

    // Broadcast to all participants
    await this.broadcastToSession(
      sessionId,
      {
        type: 'operation',
        data: transformedOp,
      },
      operation.userId,
    );

    this.emit('operation_applied', { sessionId, operation: transformedOp });
    return transformedOp;
  }

  /**
   * Update user presence information
   */
  async updatePresence(
    sessionId: string,
    userId: string,
    presenceUpdate: Partial<PresenceUpdate>,
  ): Promise<void> {
    const presenceMap = this.presenceData.get(sessionId);
    if (!presenceMap) return;

    const update: PresenceUpdate = {
      userId,
      sessionId,
      timestamp: new Date(),
      type: 'cursor',
      data: {},
      ...presenceUpdate,
    };

    presenceMap.set(userId, update);

    // Update user object in session
    const session = this.sessions.get(sessionId);
    if (session) {
      const user = session.participants.find((p) => p.id === userId);
      if (user) {
        if (update.type === 'cursor' && update.data.cursor) {
          user.cursor = update.data.cursor;
        }
        if (update.type === 'selection' && update.data.selection) {
          user.selection = update.data.selection;
        }
        user.lastSeen = new Date();
      }
    }

    // Broadcast presence update
    await this.broadcastToSession(
      sessionId,
      {
        type: 'presence_update',
        data: update,
      },
      userId,
    );
  }

  /**
   * Send a chat message
   */
  async sendChatMessage(
    sessionId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
  ): Promise<ChatMessage> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.settings.chatEnabled) {
      throw new Error('Chat not available');
    }

    const chatMessage: ChatMessage = {
      id: uuidv4(),
      timestamp: new Date(),
      ...message,
    };

    const history = this.chatHistory.get(sessionId)!;
    history.push(chatMessage);

    // Limit history size
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Broadcast message
    await this.broadcastToSession(sessionId, {
      type: 'chat_message',
      data: chatMessage,
    });

    this.emit('chat_message', { sessionId, message: chatMessage });
    return chatMessage;
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    const operations = this.operations.get(sessionId) || [];
    const presence = Array.from(
      this.presenceData.get(sessionId)?.values() || [],
    );
    const chat = this.chatHistory.get(sessionId) || [];

    return {
      session,
      operations: operations.slice(-100), // Last 100 operations
      presence,
      chat: chat.slice(-50), // Last 50 messages
    };
  }

  /**
   * Get collaboration analytics
   */
  getAnalytics(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    const operations = this.operations.get(sessionId) || [];
    const chat = this.chatHistory.get(sessionId) || [];

    if (!session) return null;

    const activeUsers = session.participants.filter((p) => p.isOnline).length;
    const totalOperations = operations.length;
    const operationsByUser = operations.reduce(
      (acc, op) => {
        acc[op.userId] = (acc[op.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const chatMessages = chat.length;
    const messagesByUser = chat.reduce(
      (acc, msg) => {
        acc[msg.userId] = (acc[msg.userId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      sessionId,
      activeUsers,
      totalUsers: session.participants.length,
      totalOperations,
      operationsByUser,
      chatMessages,
      messagesByUser,
      sessionDuration: Date.now() - session.createdAt.getTime(),
      lastActivity: Math.max(
        ...operations.map((op) => op.timestamp.getTime()),
        ...chat.map((msg) => msg.timestamp.getTime()),
      ),
    };
  }

  /**
   * Set up WebSocket server
   */
  private setupWebSocketServer(port: number): void {
    this.wsServer = new WebSocketServer({ port });

    this.wsServer.on('connection', (ws: WebSocket, request: any) => {
      const url = new URL(request.url!, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !userId) {
        ws.close(1002, 'Missing session or user ID');
        return;
      }

      const connectionId = `${sessionId}:${userId}`;
      this.connections.set(connectionId, ws);

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(sessionId, userId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(
            JSON.stringify({ type: 'error', data: { message: error.message } }),
          );
        }
      });

      ws.on('close', () => {
        this.connections.delete(connectionId);
        this.leaveSession(sessionId, userId);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send initial session state
      this.sendSessionState(sessionId, userId);
    });
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(
    sessionId: string,
    userId: string,
    message: any,
  ): Promise<void> {
    switch (message.type) {
      case 'operation':
        await this.applyOperation(sessionId, {
          ...message.data,
          userId,
          sessionId,
          timestamp: new Date(),
        });
        break;

      case 'presence_update':
        await this.updatePresence(sessionId, userId, message.data);
        break;

      case 'chat_message':
        await this.sendChatMessage(sessionId, {
          ...message.data,
          userId,
          sessionId,
        });
        break;

      case 'ping':
        const connectionId = `${sessionId}:${userId}`;
        const ws = this.connections.get(connectionId);
        if (ws) {
          ws.send(
            JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }),
          );
        }
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Send session state to a specific user
   */
  private async sendSessionState(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const connectionId = `${sessionId}:${userId}`;
    const ws = this.connections.get(connectionId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const state = this.getSessionState(sessionId);
      ws.send(
        JSON.stringify({
          type: 'session_state',
          data: state,
        }),
      );
    }
  }

  /**
   * Broadcast message to all session participants except sender
   */
  private async broadcastToSession(
    sessionId: string,
    message: any,
    excludeUserId?: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageStr = JSON.stringify(message);

    for (const participant of session.participants) {
      if (participant.id === excludeUserId || !participant.isOnline) continue;

      const connectionId = `${sessionId}:${participant.id}`;
      const ws = this.connections.get(connectionId);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    }
  }

  /**
   * Validate operation permissions and structure
   */
  private validateOperation(
    operation: Operation,
    session: CollaborationSession,
  ): boolean {
    const user = session.participants.find((p) => p.id === operation.userId);
    if (!user || !user.isOnline) return false;

    // Check permissions
    switch (operation.type) {
      case 'insert':
      case 'update':
      case 'move':
        return user.role !== 'viewer';
      case 'delete':
        return ['editor', 'admin', 'owner'].includes(user.role);
      default:
        return false;
    }
  }

  /**
   * Request approval for joining session
   */
  private async requestApproval(
    sessionId: string,
    user: CollaborationUser,
  ): Promise<void> {
    // Notify admins/owners for approval
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const admins = session.participants.filter((p) =>
      ['admin', 'owner'].includes(p.role),
    );

    await this.broadcastToSession(sessionId, {
      type: 'approval_request',
      data: { user },
    });

    this.emit('approval_requested', { sessionId, user });
  }

  /**
   * Clean up inactive sessions and old data
   */
  private setupCleanupTasks(): void {
    setInterval(() => {
      this.cleanupInactiveSessions();
      this.cleanupOldOperations();
    }, 300000); // Every 5 minutes
  }

  private cleanupInactiveSessions(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      const hasActiveUsers = session.participants.some((p) => p.isOnline);
      const lastActivity = Math.max(
        ...session.participants.map((p) => p.lastSeen.getTime()),
      );

      if (!hasActiveUsers && lastActivity < cutoff) {
        this.sessions.delete(sessionId);
        this.operations.delete(sessionId);
        this.presenceData.delete(sessionId);
        this.chatHistory.delete(sessionId);

        this.emit('session_cleaned_up', { sessionId });
      }
    }
  }

  private cleanupOldOperations(): void {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [sessionId, operations] of this.operations.entries()) {
      const recentOps = operations.filter(
        (op) => op.timestamp.getTime() > cutoff,
      );
      if (recentOps.length < operations.length) {
        this.operations.set(sessionId, recentOps);
      }
    }
  }
}

/**
 * Operation Transformer - Handles operational transforms for conflict resolution
 */
class OperationTransformer {
  async transform(
    operation: Operation,
    existingOps: Operation[],
  ): Promise<TransformedOperation> {
    let transformedOp: TransformedOperation = {
      ...operation,
      transformed: false,
      transformedAgainst: [],
    };

    // Find concurrent operations (operations that happened after this one started)
    const concurrentOps = existingOps.filter(
      (op) =>
        op.timestamp > operation.timestamp && this.affectsTarget(op, operation),
    );

    if (concurrentOps.length === 0) {
      return transformedOp;
    }

    // Apply operational transforms
    for (const concurrentOp of concurrentOps) {
      transformedOp = await this.transformAgainst(transformedOp, concurrentOp);
      transformedOp.transformedAgainst.push(concurrentOp.id);
    }

    transformedOp.transformed = true;
    return transformedOp;
  }

  private async transformAgainst(
    op1: TransformedOperation,
    op2: Operation,
  ): Promise<TransformedOperation> {
    // Operational transform logic based on operation types
    if (op1.type === 'insert' && op2.type === 'insert') {
      return this.transformInsertInsert(op1, op2);
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      return this.transformDeleteDelete(op1, op2);
    }

    if (op1.type === 'update' && op2.type === 'update') {
      return this.transformUpdateUpdate(op1, op2);
    }

    // Cross-type transforms
    if (
      (op1.type === 'insert' && op2.type === 'delete') ||
      (op1.type === 'delete' && op2.type === 'insert')
    ) {
      return this.transformInsertDelete(op1, op2);
    }

    return op1;
  }

  private transformInsertInsert(
    op1: TransformedOperation,
    op2: Operation,
  ): TransformedOperation {
    // Adjust position if inserting at same location
    if (
      op1.data.target === op2.data.target &&
      op1.data.position >= op2.data.position
    ) {
      return {
        ...op1,
        data: {
          ...op1.data,
          position: op1.data.position + 1,
        },
      };
    }
    return op1;
  }

  private transformDeleteDelete(
    op1: TransformedOperation,
    op2: Operation,
  ): TransformedOperation {
    // If same target, operation is void
    if (op1.data.target === op2.data.target) {
      return {
        ...op1,
        data: {
          ...op1.data,
          action: 'void',
        },
      };
    }
    return op1;
  }

  private transformUpdateUpdate(
    op1: TransformedOperation,
    op2: Operation,
  ): TransformedOperation {
    // Merge updates or use conflict resolution
    if (op1.data.target === op2.data.target) {
      return {
        ...op1,
        conflictResolution: 'merge',
        data: {
          ...op1.data,
          oldValue: op2.data.newValue, // Update old value to reflect concurrent change
        },
      };
    }
    return op1;
  }

  private transformInsertDelete(
    op1: TransformedOperation,
    op2: Operation,
  ): TransformedOperation {
    // Adjust positions based on insertions/deletions
    if (
      op1.type === 'insert' &&
      op2.type === 'delete' &&
      op1.data.position > op2.data.position
    ) {
      return {
        ...op1,
        data: {
          ...op1.data,
          position: op1.data.position - 1,
        },
      };
    }
    return op1;
  }

  private affectsTarget(op1: Operation, op2: Operation): boolean {
    return (
      op1.data.target === op2.data.target ||
      op1.data.targetType === op2.data.targetType
    );
  }
}

/**
 * Conflict Resolver - Handles conflict detection and resolution
 */
class ConflictResolver {
  async detectConflicts(
    operation: TransformedOperation,
    existingOps: Operation[],
  ): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];

    // Find operations that conflict with the current one
    const conflictingOps = existingOps.filter((op) =>
      this.isConflicting(operation, op),
    );

    if (conflictingOps.length > 0) {
      conflicts.push({
        id: uuidv4(),
        operationIds: [operation.id, ...conflictingOps.map((op) => op.id)],
        conflictType: this.getConflictType(operation, conflictingOps[0]),
        resolution: this.getAutoResolutionStrategy(
          operation,
          conflictingOps[0],
        ),
        timestamp: new Date(),
        details: {
          operation,
          conflictingOperations: conflictingOps,
        },
      });
    }

    return conflicts;
  }

  async resolveConflicts(
    conflicts: ConflictResolution[],
    operation: TransformedOperation,
  ): Promise<ConflictResolution> {
    // For now, use the first conflict's resolution
    // In a real implementation, this would be more sophisticated
    const conflict = conflicts[0];

    switch (conflict.resolution) {
      case 'auto_merge':
        return this.autoMergeConflict(conflict, operation);
      case 'last_write_wins':
        return this.lastWriteWinsConflict(conflict, operation);
      default:
        return conflict;
    }
  }

  private isConflicting(op1: Operation, op2: Operation): boolean {
    // Same target, different changes
    return (
      op1.data.target === op2.data.target &&
      op1.userId !== op2.userId &&
      Math.abs(op1.timestamp.getTime() - op2.timestamp.getTime()) < 5000
    ); // Within 5 seconds
  }

  private getConflictType(
    op1: Operation,
    op2: Operation,
  ): ConflictResolution['conflictType'] {
    if (op1.type === op2.type && op1.data.target === op2.data.target) {
      return 'concurrent_edit';
    }
    return 'version_mismatch';
  }

  private getAutoResolutionStrategy(
    op1: Operation,
    op2: Operation,
  ): ConflictResolution['resolution'] {
    // Simple strategy: last write wins for most operations
    if (op1.timestamp > op2.timestamp) {
      return 'last_write_wins';
    }

    // For updates, try to merge
    if (op1.type === 'update' && op2.type === 'update') {
      return 'auto_merge';
    }

    return 'manual_merge';
  }

  private autoMergeConflict(
    conflict: ConflictResolution,
    operation: TransformedOperation,
  ): ConflictResolution {
    // Implement auto-merge logic
    return {
      ...conflict,
      resolution: 'auto_merge',
      resolvedBy: 'system',
    };
  }

  private lastWriteWinsConflict(
    conflict: ConflictResolution,
    operation: TransformedOperation,
  ): ConflictResolution {
    return {
      ...conflict,
      resolution: 'last_write_wins',
      resolvedBy: 'system',
    };
  }
}

export default CollaborationEngine;
