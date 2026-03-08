"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHandler = void 0;
class WebSocketHandler {
    hub;
    sessions = new Map();
    constructor(hub) {
        this.hub = hub;
        this.setupHubListeners();
    }
    async handleConnection(connection, request) {
        const { socket } = connection;
        console.log('WebSocket connection established');
        socket.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                await this.handleMessage(socket, message);
            }
            catch (error) {
                console.error('Error handling WebSocket message:', error);
                socket.send(JSON.stringify({
                    type: 'error',
                    error: 'Invalid message format'
                }));
            }
        });
        socket.on('close', () => {
            // Clean up session
            for (const [sessionId, session] of this.sessions.entries()) {
                if (session.socket === socket) {
                    this.sessions.delete(sessionId);
                    console.log(`Session ${sessionId} closed`);
                    break;
                }
            }
        });
    }
    async handleMessage(socket, message) {
        switch (message.type) {
            case 'connect':
                await this.handleConnect(socket, message);
                break;
            case 'operation':
                await this.handleOperation(message);
                break;
            case 'presence':
                await this.handlePresence(message);
                break;
            case 'sync_request':
                await this.handleSyncRequest(socket, message);
                break;
            case 'ping':
                socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;
            default:
                socket.send(JSON.stringify({
                    type: 'error',
                    error: `Unknown message type: ${message.type}`
                }));
        }
    }
    async handleConnect(socket, message) {
        const { userId, workspaceId, documentId, permissions } = message;
        try {
            // Create sync session
            const session = await this.hub.sync.createSession(documentId, userId, workspaceId, permissions || ['read', 'write']);
            // Store session
            this.sessions.set(session.id, { userId, workspaceId, socket });
            // Send success response with session info
            socket.send(JSON.stringify({
                type: 'connected',
                sessionId: session.id,
                state: message.state
            }));
            console.log(`User ${userId} connected to document ${documentId}, session ${session.id}`);
        }
        catch (error) {
            socket.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
        }
    }
    async handleOperation(message) {
        const { sessionId, operation } = message;
        try {
            await this.hub.sync.handleOperation(sessionId, operation);
        }
        catch (error) {
            const session = this.sessions.get(sessionId);
            if (session) {
                session.socket.send(JSON.stringify({
                    type: 'error',
                    operationId: operation.id,
                    error: error.message
                }));
            }
        }
    }
    async handlePresence(message) {
        const { presence } = message;
        try {
            await this.hub.sync.updatePresence(presence);
        }
        catch (error) {
            console.error('Error updating presence:', error);
        }
    }
    async handleSyncRequest(socket, message) {
        const { documentId, version } = message;
        try {
            const { state, operations } = await this.hub.sync.syncClient(documentId, version);
            socket.send(JSON.stringify({
                type: 'sync_response',
                documentId,
                state,
                operations
            }));
        }
        catch (error) {
            socket.send(JSON.stringify({
                type: 'error',
                error: error.message
            }));
        }
    }
    setupHubListeners() {
        // Broadcast operations to all connected clients
        this.hub.sync.on('operation:applied', ({ documentId, operation, state }) => {
            for (const [sessionId, session] of this.sessions.entries()) {
                // Don't send back to the author
                if (operation.userId !== session.userId) {
                    session.socket.send(JSON.stringify({
                        type: 'operation',
                        operation,
                        version: state.version
                    }));
                }
            }
        });
        // Broadcast presence updates
        this.hub.sync.on('presence:updated', ({ presence }) => {
            for (const session of this.sessions.values()) {
                if (presence.userId !== session.userId && presence.documentId) {
                    session.socket.send(JSON.stringify({
                        type: 'presence',
                        presence
                    }));
                }
            }
        });
        // Broadcast notifications
        this.hub.on('notification:created', ({ notification }) => {
            for (const session of this.sessions.values()) {
                if (session.userId === notification.userId) {
                    session.socket.send(JSON.stringify({
                        type: 'notification',
                        notification
                    }));
                }
            }
        });
    }
}
exports.WebSocketHandler = WebSocketHandler;
