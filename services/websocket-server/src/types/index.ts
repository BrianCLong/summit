/**
 * WebSocket Infrastructure Type Definitions
 * Summit IntelGraph Platform
 */

import { Socket } from 'socket.io';

export interface UserClaims {
  sub: string;
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

export interface AuthenticatedSocket extends Socket {
  user: UserClaims;
  tenantId: string;
  connectionId: string;
  connectedAt: number;
}

export interface ConnectionMetadata {
  id: string;
  userId: string;
  tenantId: string;
  connectedAt: number;
  lastActivity: number;
  rooms: Set<string>;
  presence: PresenceStatus;
  metadata?: Record<string, unknown>;
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PresenceInfo {
  userId: string;
  username?: string;
  status: PresenceStatus;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface RoomSubscription {
  room: string;
  joinedAt: number;
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  room: string;
  from: string;
  payload: unknown;
  timestamp: number;
  ttl?: number;
  persistent?: boolean;
}

export interface ServerToClientEvents {
  // Connection events
  'connection:established': (data: { connectionId: string; tenantId: string }) => void;
  'connection:error': (error: { code: string; message: string }) => void;

  // Presence events
  'presence:update': (data: { room: string; presence: PresenceInfo[] }) => void;
  'presence:join': (data: { room: string; user: PresenceInfo }) => void;
  'presence:leave': (data: { room: string; userId: string }) => void;

  // Room events
  'room:joined': (data: { room: string; metadata?: unknown }) => void;
  'room:left': (data: { room: string }) => void;
  'room:message': (message: Message) => void;

  // System events
  'system:restart': (data: { reason: string; reconnectIn: number }) => void;
  'system:error': (error: { code: string; message: string }) => void;

  // Broadcast events
  'broadcast': (data: { event: string; payload: unknown }) => void;
}

export interface ClientToServerEvents {
  // Presence events
  'presence:heartbeat': (data: { status?: PresenceStatus }) => void;
  'presence:status': (data: { status: PresenceStatus; metadata?: unknown }) => void;

  // Room events
  'room:join': (data: { room: string; metadata?: unknown }, ack?: (response: { success: boolean; error?: string }) => void) => void;
  'room:leave': (data: { room: string }, ack?: (response: { success: boolean }) => void) => void;
  'room:send': (data: { room: string; payload: unknown; persistent?: boolean }, ack?: (response: { success: boolean; messageId?: string }) => void) => void;

  // Query events
  'query:presence': (data: { room: string }, ack?: (response: { presence: PresenceInfo[] }) => void) => void;
  'query:rooms': (ack?: (response: { rooms: string[] }) => void) => void;
}

export interface InterServerEvents {
  'cluster:broadcast': (data: { event: string; payload: unknown; excludeNode?: string }) => void;
  'cluster:presence:update': (data: { room: string; presence: PresenceInfo[] }) => void;
}

export interface SocketData {
  user: UserClaims;
  tenantId: string;
  connectionId: string;
  connectedAt: number;
}

export interface WebSocketConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  jwt: {
    secret: string;
    algorithm: string;
  };
  rateLimit: {
    maxConnections: number;
    messageRatePerSecond: number;
    burstSize: number;
  };
  heartbeat: {
    interval: number;
    timeout: number;
  };
  persistence: {
    enabled: boolean;
    ttl: number;
    maxMessages: number;
  };
  clustering: {
    enabled: boolean;
    nodeId: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  connections: {
    total: number;
    byTenant: Record<string, number>;
  };
  redis: {
    connected: boolean;
    latency?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cluster?: {
    nodeId: string;
    nodes: number;
  };
}

export interface MetricsSnapshot {
  connections: {
    total: number;
    active: number;
    byStatus: Record<PresenceStatus, number>;
    byTenant: Record<string, number>;
  };
  messages: {
    sent: number;
    received: number;
    persisted: number;
    dropped: number;
  };
  rooms: {
    total: number;
    totalSubscriptions: number;
    avgSubscriptionsPerRoom: number;
  };
  performance: {
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
  };
}
