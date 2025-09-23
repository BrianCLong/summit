const { Server } = require('socket.io');
const AuthService = require('../services/AuthService');
const logger = require('../utils/logger');

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
      logger.info(`Realtime disconnect ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() { return ioInstance; }

module.exports = { initSocket, getIO };

