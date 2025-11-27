/**
 * Connection State Management
 * Tracks all active WebSocket connections and their metadata
 */

import { Socket } from 'socket.io';
import { ConnectionMetadata, PresenceStatus } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export class ConnectionManager extends EventEmitter {
  private connections = new Map<string, ConnectionMetadata>();
  private userToConnections = new Map<string, Set<string>>();
  private tenantToConnections = new Map<string, Set<string>>();

  /**
   * Register a new connection
   */
  public register(socket: Socket): void {
    const metadata: ConnectionMetadata = {
      id: socket.data.connectionId,
      userId: socket.data.user.userId,
      tenantId: socket.data.tenantId,
      connectedAt: socket.data.connectedAt,
      lastActivity: Date.now(),
      rooms: new Set<string>(),
      presence: 'online',
      metadata: {},
    };

    this.connections.set(socket.data.connectionId, metadata);

    // Track by user
    if (!this.userToConnections.has(socket.data.user.userId)) {
      this.userToConnections.set(socket.data.user.userId, new Set());
    }
    this.userToConnections.get(socket.data.user.userId)!.add(socket.data.connectionId);

    // Track by tenant
    if (!this.tenantToConnections.has(socket.data.tenantId)) {
      this.tenantToConnections.set(socket.data.tenantId, new Set());
    }
    this.tenantToConnections.get(socket.data.tenantId)!.add(socket.data.connectionId);

    logger.info(
      {
        connectionId: socket.data.connectionId,
        userId: socket.data.user.userId,
        tenantId: socket.data.tenantId,
        totalConnections: this.connections.size,
      },
      'Connection registered'
    );

    this.emit('connection:registered', metadata);
  }

  /**
   * Unregister a connection
   */
  public unregister(connectionId: string): void {
    const metadata = this.connections.get(connectionId);
    if (!metadata) return;

    // Remove from user tracking
    const userConnections = this.userToConnections.get(metadata.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userToConnections.delete(metadata.userId);
      }
    }

    // Remove from tenant tracking
    const tenantConnections = this.tenantToConnections.get(metadata.tenantId);
    if (tenantConnections) {
      tenantConnections.delete(connectionId);
      if (tenantConnections.size === 0) {
        this.tenantToConnections.delete(metadata.tenantId);
      }
    }

    this.connections.delete(connectionId);

    logger.info(
      {
        connectionId,
        userId: metadata.userId,
        tenantId: metadata.tenantId,
        totalConnections: this.connections.size,
      },
      'Connection unregistered'
    );

    this.emit('connection:unregistered', metadata);
  }

  /**
   * Update connection activity timestamp
   */
  public updateActivity(connectionId: string): void {
    const metadata = this.connections.get(connectionId);
    if (metadata) {
      metadata.lastActivity = Date.now();
    }
  }

  /**
   * Update connection presence status
   */
  public updatePresence(connectionId: string, status: PresenceStatus): void {
    const metadata = this.connections.get(connectionId);
    if (metadata) {
      const oldStatus = metadata.presence;
      metadata.presence = status;
      metadata.lastActivity = Date.now();

      this.emit('presence:changed', {
        connectionId,
        userId: metadata.userId,
        tenantId: metadata.tenantId,
        oldStatus,
        newStatus: status,
      });
    }
  }

  /**
   * Add room to connection
   */
  public addRoom(connectionId: string, room: string): void {
    const metadata = this.connections.get(connectionId);
    if (metadata) {
      metadata.rooms.add(room);
      this.emit('room:joined', { connectionId, room });
    }
  }

  /**
   * Remove room from connection
   */
  public removeRoom(connectionId: string, room: string): void {
    const metadata = this.connections.get(connectionId);
    if (metadata) {
      metadata.rooms.delete(room);
      this.emit('room:left', { connectionId, room });
    }
  }

  /**
   * Get connection metadata
   */
  public getConnection(connectionId: string): ConnectionMetadata | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections for a user
   */
  public getUserConnections(userId: string): ConnectionMetadata[] {
    const connectionIds = this.userToConnections.get(userId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((m): m is ConnectionMetadata => m !== undefined);
  }

  /**
   * Get all connections for a tenant
   */
  public getTenantConnections(tenantId: string): ConnectionMetadata[] {
    const connectionIds = this.tenantToConnections.get(tenantId) || new Set();
    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((m): m is ConnectionMetadata => m !== undefined);
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    const connections = this.userToConnections.get(userId);
    return connections ? connections.size > 0 : false;
  }

  /**
   * Get total connection count
   */
  public getTotalConnections(): number {
    return this.connections.size;
  }

  /**
   * Get connections by tenant
   */
  public getConnectionsByTenant(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [tenantId, connections] of this.tenantToConnections) {
      result[tenantId] = connections.size;
    }
    return result;
  }

  /**
   * Get connections by presence status
   */
  public getConnectionsByStatus(): Record<PresenceStatus, number> {
    const result: Record<PresenceStatus, number> = {
      online: 0,
      away: 0,
      busy: 0,
      offline: 0,
    };

    for (const metadata of this.connections.values()) {
      result[metadata.presence]++;
    }

    return result;
  }

  /**
   * Get all connections
   */
  public getAllConnections(): ConnectionMetadata[] {
    return Array.from(this.connections.values());
  }

  /**
   * Clean up stale connections (not active for threshold)
   */
  public cleanupStale(thresholdMs: number): string[] {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [connectionId, metadata] of this.connections) {
      if (now - metadata.lastActivity > thresholdMs) {
        staleConnections.push(connectionId);
        this.unregister(connectionId);
      }
    }

    if (staleConnections.length > 0) {
      logger.info(
        { count: staleConnections.length, thresholdMs },
        'Cleaned up stale connections'
      );
    }

    return staleConnections;
  }
}
