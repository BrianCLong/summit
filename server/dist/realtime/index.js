import { Server } from 'socket.io';
import { createAdapter } from './adapter.js';
import { RT_NS, EVT, } from '../../../packages/contracts/src/realtime.js';
export function attachRealtime(httpServer) {
    const io = new Server(httpServer, {
        path: '/ws',
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
            credentials: true,
        },
    });
    io.adapter(createAdapter());
    const collab = io.of(RT_NS.COLLAB);
    collab.on('connection', (socket) => {
        socket.on(EVT.PRESENCE, (msg) => socket.broadcast.emit(EVT.PRESENCE, msg));
        socket.on(EVT.GRAPH_MUT, (msg) => socket.broadcast.emit(EVT.GRAPH_MUT, msg));
    });
    return io;
}
//# sourceMappingURL=index.js.map