import { Socket } from 'socket.io';
import { ConnectionManager } from '../managers/ConnectionManager.js';
import { RoomManager } from '../managers/RoomManager.js';
import { MessagePersistence } from '../managers/MessagePersistence.js';
import { logger } from '../utils/logger.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../types/index.js';

export function registerHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    connectionManager: ConnectionManager,
    roomManager: RoomManager,
    messagePersistence: MessagePersistence
) {
    // Register connection
    connectionManager.register(socket);

    // Connection Error Handler
    socket.on('error', (err) => {
        logger.error({ err, connectionId: socket.data.connectionId }, 'Socket error');
    });

    // Disconnect Handler
    socket.on('disconnect', (reason) => {
        logger.info({ reason, connectionId: socket.data.connectionId }, 'Client disconnected');
        connectionManager.unregister(socket.data.connectionId);
        roomManager.leaveAll(socket.data.connectionId);
    });

    // Room Events
    socket.on('room:join', async (data, ack) => {
        try {
            const result = await roomManager.join(socket, data.room, data.metadata as Record<string, unknown>);
            if (ack) ack(result);

            // Send history if joined successfully
            if (result.success) {
                const history = await messagePersistence.getHistory(data.room);
                history.forEach(msg => socket.emit('room:message', {
                    id: `${msg.timestamp}`, // simplistic ID
                    room: msg.room,
                    from: msg.from,
                    payload: msg.data,
                    timestamp: msg.timestamp || Date.now()
                }));
            }
        } catch (error) {
            if (ack) ack({ success: false, error: 'Internal server error' });
        }
    });

    socket.on('room:leave', async (data, ack) => {
        const result = await roomManager.leave(socket, data.room);
        if (ack) ack(result);
    });

    socket.on('room:send', async (data, ack) => {
        try {
            // Check if user is in room
            const rooms = roomManager.getSocketRooms(socket.data.connectionId);
            if (!rooms.includes(data.room) && !rooms.includes(`${socket.data.tenantId}:${data.room}`)) {
                if (ack) ack({ success: false, messageId: undefined }); // Not in room
                return;
            }

            const message = {
                room: data.room,
                from: socket.data.user.userId,
                data: data.payload as Record<string, unknown>,
                timestamp: Date.now()
            };

            // Persist if needed
            if (data.persistent) {
                await messagePersistence.storeMessage(message);
            }

            // Broadcast to room
            socket.to(data.room).emit('room:message', {
                id: `${message.timestamp}`,
                room: message.room,
                from: message.from,
                payload: message.data,
                timestamp: message.timestamp
            });

            if (ack) ack({ success: true, messageId: `${message.timestamp}` });
        } catch (error) {
            logger.error({ error }, 'Failed to send message');
            if (ack) ack({ success: false });
        }
    });
}
