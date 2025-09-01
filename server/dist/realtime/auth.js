import { verifyToken } from '../lib/auth.js';
export async function authorize(socket, next) {
    try {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');
        if (!token)
            return next(new Error('UNAUTHORIZED'));
        const user = await verifyToken(token);
        // @ts-ignore
        socket.data.user = user;
        next();
    }
    catch {
        next(new Error('UNAUTHORIZED'));
    }
}
//# sourceMappingURL=auth.js.map