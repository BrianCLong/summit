import { Server, Socket } from 'socket.io';
import pino from 'pino';

const logger = (pino as any)();

export function registerDashboardHandlers(io: Server, socket: Socket): void {
  // Join the dashboard room
  socket.on('dashboard:join', (): void => {
    logger.info(`User ${socket.id} joined dashboard`);
    socket.join('dashboard:main');

    // Send initial state (could be fetched from a service)
    socket.emit('dashboard:state', {
      connected: true,
      timestamp: Date.now(),
      message: 'Joined dashboard stream'
    });
  });

  socket.on('dashboard:leave', (): void => {
    logger.info(`User ${socket.id} left dashboard`);
    socket.leave('dashboard:main');
  });
}
