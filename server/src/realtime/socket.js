const { Server } = require('socket.io');
const AuthService = require('../services/AuthService');
import logger from '../utils/logger.js';

let connections = 0;
let presenceDisabled = false;
const maxConnections = Number(process.env.PRESENCE_MAX_CONNECTIONS || 10000);

let ioInstance = null;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  // Namespace for realtime graph/AI
  const ns = io.of('/realtime');
  const auth = new AuthService();
  ns.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const user = await auth.verifyToken(token);
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch (e) { next(new Error('Unauthorized')); }
  });

  ns.on('connection', (socket) => {
    logger.info(`Realtime connected ${socket.id}`);
    connections += 1;
    if (connections > maxConnections && !presenceDisabled) {
      presenceDisabled = true;
      ns.emit('presence_disabled', { reason: 'load_shed', maxConnections });
    }
    if (!presenceDisabled) {
      // announce join
      ns.emit('presence:join', { userId: socket.user?.id, sid: socket.id, ts: Date.now() });
    }
    socket.on('join_ai_entity', ({ entityId }) => {
      // add any RBAC validation here if required
      if (!entityId) return;
      socket.join(`ai:entity:${entityId}`);
    });
    socket.on('leave_ai_entity', ({ entityId }) => {
      if (!entityId) return;
      socket.leave(`ai:entity:${entityId}`);
    });
    socket.on('disconnect', () => {
      connections = Math.max(0, connections - 1);
      if (presenceDisabled && connections < Math.floor(maxConnections * 0.9)) {
        presenceDisabled = false;
        ns.emit('presence_enabled', { reason: 'load_normalized' });
      }
      if (!presenceDisabled) {
        ns.emit('presence:leave', { userId: socket.user?.id, sid: socket.id, ts: Date.now() });
      }
      logger.info(`Realtime disconnect ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() { return ioInstance; }

module.exports = { initSocket, getIO };
