/**
 * Room Subscription Management
 * Handles room-based pub/sub with authorization
 */

import { Socket } from 'socket.io';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

export type RoomAuthorizationHandler = (
  socket: Socket,
  room: string,
  action: 'join' | 'leave' | 'send'
) => Promise<boolean> | boolean;

export class RoomManager extends EventEmitter {
  private roomToSockets = new Map<string, Set<string>>();
  private socketToRooms = new Map<string, Set<string>>();
  private authHandler?: RoomAuthorizationHandler;

  /**
   * Set authorization handler
   */
  public setAuthHandler(handler: RoomAuthorizationHandler): void {
    this.authHandler = handler;
  }

  /**
   * Join a room
   */
  public async join(
    socket: Socket,
    room: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    // Authorization check
    if (this.authHandler) {
      const allowed = await this.authHandler(socket, room, 'join');
      if (!allowed) {
        logger.warn(
          { connectionId: socket.data.connectionId, room },
          'Room join unauthorized'
        );
        return { success: false, error: 'Unauthorized' };
      }
    }

    // Normalize room name with tenant prefix
    const normalizedRoom = this.normalizeRoom(socket.data.tenantId, room);

    // Join Socket.IO room
    socket.join(normalizedRoom);

    // Track in our maps
    if (!this.roomToSockets.has(normalizedRoom)) {
      this.roomToSockets.set(normalizedRoom, new Set());
    }
    this.roomToSockets.get(normalizedRoom)!.add(socket.data.connectionId);

    if (!this.socketToRooms.has(socket.data.connectionId)) {
      this.socketToRooms.set(socket.data.connectionId, new Set());
    }
    this.socketToRooms.get(socket.data.connectionId)!.add(normalizedRoom);

    logger.info(
      {
        connectionId: socket.data.connectionId,
        room: normalizedRoom,
        membersCount: this.roomToSockets.get(normalizedRoom)!.size,
      },
      'Joined room'
    );

    this.emit('room:joined', {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.userId,
      tenantId: socket.data.tenantId,
      room: normalizedRoom,
      metadata,
    });

    return { success: true };
  }

  /**
   * Leave a room
   */
  public async leave(
    socket: Socket,
    room: string
  ): Promise<{ success: boolean }> {
    const normalizedRoom = this.normalizeRoom(socket.data.tenantId, room);

    // Leave Socket.IO room
    socket.leave(normalizedRoom);

    // Update tracking
    const roomSockets = this.roomToSockets.get(normalizedRoom);
    if (roomSockets) {
      roomSockets.delete(socket.data.connectionId);
      if (roomSockets.size === 0) {
        this.roomToSockets.delete(normalizedRoom);
      }
    }

    const socketRooms = this.socketToRooms.get(socket.data.connectionId);
    if (socketRooms) {
      socketRooms.delete(normalizedRoom);
      if (socketRooms.size === 0) {
        this.socketToRooms.delete(socket.data.connectionId);
      }
    }

    logger.info(
      {
        connectionId: socket.data.connectionId,
        room: normalizedRoom,
        remainingMembers: roomSockets?.size || 0,
      },
      'Left room'
    );

    this.emit('room:left', {
      connectionId: socket.data.connectionId,
      userId: socket.data.user.userId,
      tenantId: socket.data.tenantId,
      room: normalizedRoom,
    });

    return { success: true };
  }

  /**
   * Leave all rooms for a connection
   */
  public leaveAll(connectionId: string): void {
    const rooms = this.socketToRooms.get(connectionId);
    if (!rooms) return;

    for (const room of rooms) {
      const roomSockets = this.roomToSockets.get(room);
      if (roomSockets) {
        roomSockets.delete(connectionId);
        if (roomSockets.size === 0) {
          this.roomToSockets.delete(room);
        }
      }

      this.emit('room:left', { connectionId, room });
    }

    this.socketToRooms.delete(connectionId);

    logger.debug({ connectionId, roomCount: rooms.size }, 'Left all rooms');
  }

  /**
   * Get rooms for a connection
   */
  public getSocketRooms(connectionId: string): string[] {
    const rooms = this.socketToRooms.get(connectionId);
    return rooms ? Array.from(rooms) : [];
  }

  /**
   * Get connections in a room
   */
  public getRoomConnections(tenantId: string, room: string): string[] {
    const normalizedRoom = this.normalizeRoom(tenantId, room);
    const sockets = this.roomToSockets.get(normalizedRoom);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Get member count for a room
   */
  public getRoomSize(tenantId: string, room: string): number {
    const normalizedRoom = this.normalizeRoom(tenantId, room);
    return this.roomToSockets.get(normalizedRoom)?.size || 0;
  }

  /**
   * Get all rooms
   */
  public getAllRooms(): string[] {
    return Array.from(this.roomToSockets.keys());
  }

  /**
   * Get room statistics
   */
  public getStats(): {
    totalRooms: number;
    totalSubscriptions: number;
    avgSubscriptionsPerRoom: number;
    largestRoom: { room: string; size: number } | null;
  } {
    const totalRooms = this.roomToSockets.size;
    let totalSubscriptions = 0;
    let largestRoom: { room: string; size: number } | null = null;

    for (const [room, sockets] of this.roomToSockets) {
      const size = sockets.size;
      totalSubscriptions += size;

      if (!largestRoom || size > largestRoom.size) {
        largestRoom = { room, size };
      }
    }

    return {
      totalRooms,
      totalSubscriptions,
      avgSubscriptionsPerRoom: totalRooms > 0 ? totalSubscriptions / totalRooms : 0,
      largestRoom,
    };
  }

  /**
   * Normalize room name with tenant prefix
   */
  private normalizeRoom(tenantId: string, room: string): string {
    // If room already has tenant prefix, return as is
    if (room.startsWith(`${tenantId}:`)) {
      return room;
    }
    return `${tenantId}:${room}`;
  }
}
