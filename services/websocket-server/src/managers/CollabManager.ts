import * as Y from 'yjs';
import { AuthenticatedSocket } from '../types/index.js';
import { PostgresPersistence } from './PostgresPersistence.js';
import { logger } from '../utils/logger.js';

export class CollabManager {
  private docs: Map<string, Y.Doc> = new Map();
  private persistence: PostgresPersistence;
  private saveDebounce: Map<string, NodeJS.Timeout> = new Map();
  private readonly SAVE_DEBOUNCE_MS = 2000;

  constructor(persistence: PostgresPersistence) {
    this.persistence = persistence;
  }

  async getDoc(name: string): Promise<Y.Doc> {
    if (this.docs.has(name)) {
      return this.docs.get(name)!;
    }

    const doc = new Y.Doc();
    // Load from persistence
    try {
      const content = await this.persistence.load(name);
      if (content) {
        Y.applyUpdate(doc, content);
      }
    } catch (e) {
      logger.error({ error: e, docName: name }, 'Failed to load doc from persistence');
    }

    // Persist on update
    doc.on('update', (update: Uint8Array, origin: any) => {
      // Debounce save
      if (this.saveDebounce.has(name)) {
        clearTimeout(this.saveDebounce.get(name)!);
      }

      this.saveDebounce.set(name, setTimeout(() => {
        this.saveDoc(name, doc);
      }, this.SAVE_DEBOUNCE_MS));
    });

    this.docs.set(name, doc);
    return doc;
  }

  private async saveDoc(name: string, doc: Y.Doc) {
    try {
      const update = Y.encodeStateAsUpdate(doc);
      const json = doc.toJSON();
      await this.persistence.save(name, update, json);
      this.saveDebounce.delete(name);
      logger.debug({ docName: name }, 'Saved collab doc');
    } catch (error) {
      logger.error({ error, docName: name }, 'Failed to save collab doc');
    }
  }

  /**
   * Handle sync request from client.
   * Client sends their State Vector.
   * Server responds with the missing updates.
   */
  async handleSync(socket: AuthenticatedSocket, room: string, stateVector: Uint8Array) {
    // AuthZ Check
    if (socket.user?.permissions && !socket.user.permissions.includes('case:read') && !socket.user.roles.includes('admin')) {
        logger.warn({ userId: socket.user.userId, room }, 'Unauthorized access to collab room');
        socket.emit('system:error', { code: 'UNAUTHORIZED', message: 'Missing case:read permission' });
        return;
    }

    // Join Room
    await socket.join(room);

    const doc = await this.getDoc(room);

    // Compute the update that the client needs (from server state - client vector)
    const update = Y.encodeStateAsUpdate(doc, stateVector);

    // Send back the update
    // We send it as 'collab:update' or specific sync response?
    // Let's use 'collab:sync_response' to distinguish initial load vs stream updates
    socket.emit('collab:sync_response', { room, payload: Buffer.from(update) });
  }

  /**
   * Handle update from client.
   * Client sends an incremental update.
   */
  async handleUpdate(socket: AuthenticatedSocket, room: string, update: Uint8Array) {
    // AuthZ Check
    if (socket.user?.permissions && !socket.user.permissions.includes('case:read') && !socket.user.roles.includes('admin')) {
        return;
    }

    const doc = await this.getDoc(room);

    // Apply update to local doc
    Y.applyUpdate(doc, update, socket); // Use socket as origin to avoid echo if needed, though Socket.io broadcast excludes sender usually

    // Broadcast to others in the room
    // Note: socket.to(room) excludes the sender
    socket.to(room).emit('collab:update', { room, payload: Buffer.from(update) });
  }
}
