import type { Socket } from 'socket.io';
import { verifyToken } from '../lib/auth.js';

export async function authorize(socket: Socket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
    if (!token) return next(new Error('UNAUTHORIZED'));
    const user = await verifyToken(token);
    // @ts-ignore
    socket.data.user = user;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
