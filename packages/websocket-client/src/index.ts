/**
 * WebSocket Client SDK
 * Provides auto-reconnection, message queuing, and type-safe events
 */

import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';

export interface WebSocketClientConfig {
  url: string;
  token: string;
  tenantId?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PresenceInfo {
  userId: string;
  username?: string;
  status: PresenceStatus;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  room: string;
  from: string;
  payload: unknown;
  timestamp: number;
}

interface QueuedMessage {
  event: string;
  data: unknown;
  ack?: (response: unknown) => void;
  timestamp: number;
  attempts: number;
}

export interface WebSocketClientEvents {
  'status:change': (status: ConnectionStatus) => void;
  'connection:established': (data: { connectionId: string; tenantId: string }) => void;
  'connection:error': (error: { code: string; message: string }) => void;
  'presence:update': (data: { room: string; presence: PresenceInfo[] }) => void;
  'presence:join': (data: { room: string; user: PresenceInfo }) => void;
  'presence:leave': (data: { room: string; userId: string }) => void;
  'room:joined': (data: { room: string; metadata?: unknown }) => void;
  'room:left': (data: { room: string }) => void;
  'room:message': (message: Message) => void;
  'system:restart': (data: { reason: string; reconnectIn: number }) => void;
  'system:error': (error: { code: string; message: string }) => void;
  'broadcast': (data: { event: string; payload: unknown }) => void;
}

export class WebSocketClient extends EventEmitter<WebSocketClientEvents> {
  private socket: Socket | null = null;
  private config: Required<WebSocketClientConfig>;
  private status: ConnectionStatus = 'disconnected';
  private messageQueue: QueuedMessage[] = [];
  private maxQueueSize = 1000;
  private reconnectAttempts = 0;

  constructor(config: WebSocketClientConfig) {
    super();

    this.config = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      tenantId: 'default',
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket?.connected) {
      console.warn('Already connected');
      return;
    }

    this.setStatus('connecting');

    this.socket = io(this.config.url, {
      auth: {
        token: this.config.token,
        tenantId: this.config.tenantId,
      },
      reconnection: this.config.reconnection,
      reconnectionAttempts: this.config.reconnectionAttempts,
      reconnectionDelay: this.config.reconnectionDelay,
      reconnectionDelayMax: this.config.reconnectionDelayMax,
      timeout: this.config.timeout,
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.setStatus('disconnected');
    }
  }

  /**
   * Get current connection status
   */
  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.status === 'connected' && this.socket?.connected === true;
  }

  /**
   * Send heartbeat to keep presence alive
   */
  public heartbeat(status?: PresenceStatus): void {
    this.emit('presence:heartbeat', { status });
  }

  /**
   * Update presence status
   */
  public setPresenceStatus(status: PresenceStatus, metadata?: Record<string, unknown>): void {
    this.emitWithQueue('presence:status', { status, metadata });
  }

  /**
   * Join a room
   */
  public async joinRoom(
    room: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.emitWithQueue(
        'room:join',
        { room, metadata },
        (response: { success: boolean; error?: string }) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * Leave a room
   */
  public async leaveRoom(room: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      this.emitWithQueue('room:leave', { room }, (response: { success: boolean }) => {
        resolve(response);
      });
    });
  }

  /**
   * Send message to a room
   */
  public async sendMessage(
    room: string,
    payload: unknown,
    persistent = false
  ): Promise<{ success: boolean; messageId?: string }> {
    return new Promise((resolve) => {
      this.emitWithQueue(
        'room:send',
        { room, payload, persistent },
        (response: { success: boolean; messageId?: string }) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * Query presence in a room
   */
  public async queryPresence(room: string): Promise<PresenceInfo[]> {
    return new Promise((resolve) => {
      this.emitWithQueue('query:presence', { room }, (response: { presence: PresenceInfo[] }) => {
        resolve(response.presence);
      });
    });
  }

  /**
   * Query user's joined rooms
   */
  public async queryRooms(): Promise<string[]> {
    return new Promise((resolve) => {
      this.emitWithQueue('query:rooms', undefined, (response: { rooms: string[] }) => {
        resolve(response.rooms);
      });
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
    });

    this.socket.on('disconnect', (reason) => {
      this.setStatus('disconnected');
      console.log('Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.setStatus('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
    });

    this.socket.io.on('reconnect_failed', () => {
      this.setStatus('disconnected');
      console.error('Reconnection failed');
    });

    // Application events
    this.socket.on('connection:established', (data) => {
      this.emit('connection:established', data);
    });

    this.socket.on('connection:error', (error) => {
      this.emit('connection:error', error);
    });

    this.socket.on('presence:update', (data) => {
      this.emit('presence:update', data);
    });

    this.socket.on('presence:join', (data) => {
      this.emit('presence:join', data);
    });

    this.socket.on('presence:leave', (data) => {
      this.emit('presence:leave', data);
    });

    this.socket.on('room:joined', (data) => {
      this.emit('room:joined', data);
    });

    this.socket.on('room:left', (data) => {
      this.emit('room:left', data);
    });

    this.socket.on('room:message', (message) => {
      this.emit('room:message', message);
    });

    this.socket.on('system:restart', (data) => {
      this.emit('system:restart', data);

      // Auto-reconnect after server restart
      setTimeout(() => {
        this.disconnect();
        this.connect();
      }, data.reconnectIn);
    });

    this.socket.on('system:error', (error) => {
      this.emit('system:error', error);
    });

    this.socket.on('broadcast', (data) => {
      this.emit('broadcast', data);
    });
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status:change', status);
    }
  }

  private emitWithQueue(event: string, data?: unknown, ack?: (response: unknown) => void): void {
    if (this.isConnected() && this.socket) {
      // Send immediately if connected
      if (ack) {
        this.socket.emit(event, data, ack);
      } else {
        this.socket.emit(event, data);
      }
    } else {
      // Queue message if not connected
      this.queueMessage(event, data, ack);
    }
  }

  private queueMessage(event: string, data: unknown, ack?: (response: unknown) => void): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      event,
      data,
      ack,
      timestamp: Date.now(),
      attempts: 0,
    });
  }

  private flushMessageQueue(): void {
    if (!this.isConnected() || !this.socket) return;

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      try {
        if (message.ack) {
          this.socket.emit(message.event, message.data, message.ack);
        } else {
          this.socket.emit(message.event, message.data);
        }
      } catch (error) {
        console.error('Failed to send queued message:', error);

        // Re-queue if failed
        message.attempts++;
        if (message.attempts < 3) {
          this.messageQueue.push(message);
        }
      }
    }

    if (queue.length > 0) {
      console.log(`Flushed ${queue.length} queued messages`);
    }
  }
}

export default WebSocketClient;
