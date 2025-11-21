import { SocketStream } from '@fastify/websocket';
import { CollaborationHub, SyncMessage, Presence } from '@intelgraph/collaboration';

export class WebSocketHandler {
  private sessions = new Map<string, { userId: string; workspaceId: string; socket: SocketStream }>();

  constructor(private hub: CollaborationHub) {
    this.setupHubListeners();
  }

  async handleConnection(connection: SocketStream, request: any) {
    const { socket } = connection;

    console.log('WebSocket connection established');

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as SyncMessage & {
          sessionId?: string;
          userId?: string;
          workspaceId?: string;
          documentId?: string;
        };

        await this.handleMessage(socket, message);
      } catch (error) {
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

  private async handleMessage(socket: SocketStream, message: any) {
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

  private async handleConnect(socket: SocketStream, message: any) {
    const { userId, workspaceId, documentId, permissions } = message;

    try {
      // Create sync session
      const session = await this.hub.sync.createSession(
        documentId,
        userId,
        workspaceId,
        permissions || ['read', 'write']
      );

      // Store session
      this.sessions.set(session.id, { userId, workspaceId, socket });

      // Send success response with session info
      socket.send(JSON.stringify({
        type: 'connected',
        sessionId: session.id,
        state: message.state
      }));

      console.log(`User ${userId} connected to document ${documentId}, session ${session.id}`);
    } catch (error: any) {
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  private async handleOperation(message: any) {
    const { sessionId, operation } = message;

    try {
      await this.hub.sync.handleOperation(sessionId, operation);
    } catch (error: any) {
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

  private async handlePresence(message: any) {
    const { presence } = message;

    try {
      await this.hub.sync.updatePresence(presence);
    } catch (error: any) {
      console.error('Error updating presence:', error);
    }
  }

  private async handleSyncRequest(socket: SocketStream, message: any) {
    const { documentId, version } = message;

    try {
      const { state, operations } = await this.hub.sync.syncClient(documentId, version);

      socket.send(JSON.stringify({
        type: 'sync_response',
        documentId,
        state,
        operations
      }));
    } catch (error: any) {
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  }

  private setupHubListeners() {
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
