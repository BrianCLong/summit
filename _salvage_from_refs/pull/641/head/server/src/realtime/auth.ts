import { Socket } from 'socket.io';
import { verifyToken } from '../lib/auth.js';
import pino from 'pino';

const logger = pino();

interface AuthedSocket extends Socket {
  user?: {
    id: string;
    username?: string;
    email?: string;
    role?: string;
  };
  userId?: string;
}

export async function jwtAuth(socket: AuthedSocket, next: (err?: Error) => void) {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    const user = await verifyToken(token);
    socket.user = user;
    socket.userId = user.id;
    next();
  } catch (e) {
    const err = e as Error;
    logger.warn({ error: err.message }, 'Unauthorized socket connection attempt');
    next(new Error('Unauthorized'));
  }
}
