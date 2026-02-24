/**
 * JWT Authentication Middleware for Socket.IO
 */

import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { UserClaims } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { WebSocketConfig } from '../types/index.js';
import * as metrics from '../metrics/prometheus.js';

export function createAuthMiddleware(config: WebSocketConfig) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Extract token from handshake
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        logger.warn({ socketId: socket.id }, 'Connection attempt without token');
        metrics.recordAuthFailure('no_token');
        metrics.recordSecurityAuthDenial('no_token', 'unknown');
        return next(new Error('Authentication token required'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: [config.jwt.algorithm as jwt.Algorithm],
      }) as UserClaims;

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        logger.warn(
          { socketId: socket.id, exp: decoded.exp },
          'Connection attempt with expired token'
        );
        metrics.recordAuthFailure('token_expired');
        metrics.recordSecurityAuthDenial('token_expired', decoded.tenantId || 'unknown');
        return next(new Error('Token expired'));
      }

      // Attach user claims to socket data
      socket.data.user = decoded;
      socket.data.tenantId = decoded.tenantId || 'default';
      socket.data.connectionId = `${socket.data.tenantId}:${decoded.userId}:${socket.id}`;
      socket.data.connectedAt = Date.now();

      logger.info(
        {
          connectionId: socket.data.connectionId,
          userId: decoded.userId,
          tenantId: socket.data.tenantId,
        },
        'WebSocket authentication successful'
      );

      next();
    } catch (error) {
      logger.warn(
        { socketId: socket.id, error: (error as Error).message },
        'WebSocket authentication failed'
      );

      if (error instanceof jwt.JsonWebTokenError) {
        metrics.recordAuthFailure('invalid_token');
        metrics.recordSecurityAuthDenial('invalid_token', 'unknown');
        return next(new Error('Invalid token'));
      }

      if (error instanceof jwt.TokenExpiredError) {
        metrics.recordAuthFailure('token_expired');
        metrics.recordSecurityAuthDenial('token_expired', 'unknown');
        return next(new Error('Token expired'));
      }

      metrics.recordAuthFailure('unknown');
      metrics.recordSecurityAuthDenial('unknown', 'unknown');
      return next(new Error('Authentication failed'));
    }
  };
}

export function requirePermission(permission: string) {
  return (socket: Socket, next: (err?: Error) => void) => {
    if (!socket.data.user?.permissions?.includes(permission)) {
      logger.warn(
        {
          connectionId: socket.data.connectionId,
          permission,
          userPermissions: socket.data.user?.permissions,
        },
        'Permission denied'
      );
      metrics.recordSecurityPermissionDenial(permission, socket.data.tenantId || 'unknown');
      return next(new Error(`Permission denied: ${permission}`));
    }
    next();
  };
}

export function requireRole(role: string) {
  return (socket: Socket, next: (err?: Error) => void) => {
    if (!socket.data.user?.roles?.includes(role)) {
      logger.warn(
        {
          connectionId: socket.data.connectionId,
          role,
          userRoles: socket.data.user?.roles,
        },
        'Role required'
      );
      metrics.recordSecurityPermissionDenial(`role:${role}`, socket.data.tenantId || 'unknown');
      return next(new Error(`Role required: ${role}`));
    }
    next();
  };
}
