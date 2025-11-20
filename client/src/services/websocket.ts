/**
 * Real-time WebSocket Service
 * Manages WebSocket connections for live updates, collaboration, and notifications
 */

import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { connected, disconnected } from '../store/socketSlice';

export interface RealtimeMessage {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
}

export interface PresenceUpdate {
  userId: string;
  status: 'active' | 'away' | 'offline';
  location?: {
    route: string;
    investigationId?: string;
    entityId?: string;
  };
}

export interface GraphUpdate {
  type: 'entity_add' | 'entity_update' | 'entity_delete' | 'relationship_add' | 'relationship_update' | 'relationship_delete';
  data: any;
  userId: string;
  timestamp: number;
}

export interface NotificationEvent {
  id: string;
  type: 'alert' | 'mention' | 'assignment' | 'update' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  metadata?: any;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();
  private isConnecting = false;

  /**
   * Initialize WebSocket connection
   */
  connect(token: string): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const serverUrl = process.env.VITE_API_URL || 'http://localhost:4000';

      this.socket = io(`${serverUrl}/realtime`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('[WebSocket] Connected to real-time server');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        store.dispatch(connected());
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        store.dispatch(disconnected());
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        this.reconnectAttempts++;
        this.isConnecting = false;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('error', (error) => {
        console.error('[WebSocket] Socket error:', error);
      });

      // Setup generic message handlers
      this.setupMessageHandlers();
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      store.dispatch(disconnected());
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[WebSocket] Cannot emit '${event}': Socket not connected`);
    }
  }

  /**
   * Join a room (e.g., investigation, workspace)
   */
  joinRoom(room: string): void {
    this.emit('join', { room });
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.emit('leave', { room });
  }

  /**
   * Join an investigation workspace
   */
  joinInvestigation(investigationId: string): void {
    this.emit('join', { investigationId });
  }

  /**
   * Leave an investigation workspace
   */
  leaveInvestigation(investigationId: string): void {
    this.emit('leave', { investigationId });
  }

  /**
   * Update user presence
   */
  updatePresence(update: Partial<PresenceUpdate>): void {
    this.emit('presence:update', update);
  }

  /**
   * Send cursor position
   */
  sendCursorPosition(x: number, y: number, context?: any): void {
    this.emit('cursor:move', { x, y, ...context });
  }

  /**
   * Broadcast graph update
   */
  broadcastGraphUpdate(update: GraphUpdate): void {
    this.emit('graph:update', update);
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string, channel: string, metadata?: any): void {
    this.emit('chat:message', { message, channel, metadata });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    this.emit('alert:acknowledge', { alertId, timestamp: Date.now() });
  }

  /**
   * Setup default message handlers
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // Presence updates
    this.socket.on('presence:update', (data: PresenceUpdate) => {
      this.notifyListeners('presence:update', data);
    });

    this.socket.on('presence:join', (data: { userId: string; timestamp: number }) => {
      this.notifyListeners('presence:join', data);
    });

    this.socket.on('presence:leave', (data: { userId: string }) => {
      this.notifyListeners('presence:leave', data);
    });

    // Graph updates
    this.socket.on('graph:update', (data: GraphUpdate) => {
      this.notifyListeners('graph:update', data);
    });

    this.socket.on('entity_updated', (data: any) => {
      this.notifyListeners('entity_updated', data);
    });

    // Cursor tracking
    this.socket.on('cursor:move', (data: { userId: string; x: number; y: number }) => {
      this.notifyListeners('cursor:move', data);
    });

    // Lock management
    this.socket.on('lock:update', (data: { id: string; kind: string; userId: string; locked: boolean }) => {
      this.notifyListeners('lock:update', data);
    });

    // Chat messages
    this.socket.on('chat:message', (data: any) => {
      this.notifyListeners('chat:message', data);
    });

    // Notifications
    this.socket.on('notification', (data: NotificationEvent) => {
      this.notifyListeners('notification', data);
    });

    // Alerts
    this.socket.on('alert', (data: any) => {
      this.notifyListeners('alert', data);
    });

    // Investigation updates
    this.socket.on('investigation:update', (data: any) => {
      this.notifyListeners('investigation:update', data);
    });
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in listener for '${event}':`, error);
        }
      });
    }
  }
}

// Singleton instance
export const wsService = new WebSocketService();

export default wsService;
