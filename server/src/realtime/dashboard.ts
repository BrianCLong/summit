// @ts-nocheck
import { Server, Socket } from 'socket.io';
import pino from 'pino';

const logger = pino();

export function registerDashboardHandlers(io: Server, socket: Socket) {
  // Join the dashboard room
  socket.on('dashboard:join', () => {
    logger.info(`User ${socket.id} joined dashboard`);
    socket.join('dashboard:main');

    // Send initial state (could be fetched from a service)
    socket.emit('dashboard:state', {
      connected: true,
      timestamp: Date.now(),
      message: 'Joined dashboard stream'
    });
  });

  socket.on('dashboard:leave', () => {
    logger.info(`User ${socket.id} left dashboard`);
    socket.leave('dashboard:main');
  });
}
