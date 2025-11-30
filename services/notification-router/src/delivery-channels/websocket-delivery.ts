/**
 * WebSocket Delivery Channel
 *
 * Delivers real-time notifications to connected web clients via WebSocket.
 * Uses Socket.IO for connection management and fallback support.
 */

import type {
  DeliveryResult,
  NotificationMessage,
} from '../types.js';
import { BaseDeliveryChannel } from './base-delivery.js';

/**
 * WebSocket connection manager interface
 * (Implementation would use Socket.IO or native WebSocket)
 */
export interface IWebSocketManager {
  /**
   * Send message to user's connections
   */
  sendToUser(userId: string, event: string, data: any): Promise<boolean>;

  /**
   * Get active connection count for a user
   */
  getConnectionCount(userId: string): number;

  /**
   * Check if user has active connections
   */
  isUserConnected(userId: string): boolean;

  /**
   * Get total active connections
   */
  getTotalConnections(): number;
}

export class WebSocketDelivery extends BaseDeliveryChannel {
  readonly name = 'websocket' as const;
  readonly enabled: boolean;
  private wsManager: IWebSocketManager | null = null;

  constructor(wsManager?: IWebSocketManager) {
    super();
    this.wsManager = wsManager || null;
    this.enabled = this.wsManager !== null;
  }

  async deliver(message: NotificationMessage): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      if (!this.wsManager) {
        return {
          success: false,
          channel: 'websocket',
          error: new Error('WebSocket manager not configured'),
          retryable: false,
        };
      }

      // Check if user is connected
      if (!this.wsManager.isUserConnected(message.userId)) {
        // Queue for delivery when user connects
        return {
          success: false,
          channel: 'websocket',
          error: new Error('User not connected'),
          retryable: true,
          metadata: {
            reason: 'offline',
            queueForDelivery: true,
          },
        };
      }

      // Send notification via WebSocket
      const payload = {
        id: message.id,
        type: 'audit.notification',
        severity: message.severity,
        title: message.title,
        body: message.body,
        data: message.data,
        eventId: message.eventId,
        timestamp: new Date().toISOString(),
      };

      const sent = await this.wsManager.sendToUser(
        message.userId,
        'notification',
        payload
      );

      const durationMs = Date.now() - startTime;

      if (sent) {
        this.updateStats(
          { success: true, channel: 'websocket', retryable: false },
          durationMs
        );

        return {
          success: true,
          channel: 'websocket',
          messageId: message.id,
          retryable: false,
          metadata: {
            deliveryTime: durationMs,
            connectionCount: this.wsManager.getConnectionCount(message.userId),
          },
        };
      } else {
        return {
          success: false,
          channel: 'websocket',
          error: new Error('Failed to send via WebSocket'),
          retryable: true,
        };
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.updateStats(
        {
          success: false,
          channel: 'websocket',
          error: error as Error,
          retryable: true,
        },
        durationMs
      );

      return {
        success: false,
        channel: 'websocket',
        error: error as Error,
        retryable: true,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.wsManager) {
      return false;
    }

    // Check if WebSocket server is running
    try {
      const totalConnections = this.wsManager.getTotalConnections();
      return totalConnections >= 0; // Any non-negative number means server is running
    } catch {
      return false;
    }
  }
}

/**
 * In-memory WebSocket manager for testing/development
 */
export class InMemoryWebSocketManager implements IWebSocketManager {
  private connections: Map<string, Set<string>> = new Map();

  async sendToUser(userId: string, event: string, data: any): Promise<boolean> {
    const userConnections = this.connections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      return false;
    }

    // Simulate sending to all user connections
    console.log(`[WebSocket] Sending to user ${userId}:`, event, data);
    return true;
  }

  getConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0;
  }

  isUserConnected(userId: string): boolean {
    return this.getConnectionCount(userId) > 0;
  }

  getTotalConnections(): number {
    let total = 0;
    for (const connections of this.connections.values()) {
      total += connections.size;
    }
    return total;
  }

  // Test helpers
  addConnection(userId: string, connectionId: string): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(connectionId);
  }

  removeConnection(userId: string, connectionId: string): void {
    this.connections.get(userId)?.delete(connectionId);
  }
}
