
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { Server, Socket } from 'socket.io';
import { PostgresPersistence } from './PostgresPersistence.js';
import { logger } from '../utils/logger.js';
import { SocketData } from '../types/index.js';

const DEBOUNCE_SAVE_MS = 2000;

export class CollabManager {
  private docs: Map<string, Y.Doc> = new Map();
  private persistence: PostgresPersistence;
  private io: Server;

  constructor(io: Server, persistence: PostgresPersistence) {
    this.io = io;
    this.persistence = persistence;
  }

  // Called when a user joins a room/doc
  async handleJoin(socket: Socket, room: string) {
    const doc = await this.getDoc(room);

    // Send Step 1: Write State Vector
    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, doc);
    const buffer = encoding.toUint8Array(encoder);

    socket.emit('collab:sync', { room, buffer });
  }

  // Handle sync messages (step 1 or step 2/update)
  async handleSync(socket: Socket, room: string, buffer: Uint8Array) {
    const doc = await this.getDoc(room);
    const decoder = decoding.createDecoder(buffer);
    const encoder = encoding.createEncoder();

    // Read sync step
    syncProtocol.readSyncMessage(decoder, encoder, doc, socket);

    // If reply needed
    if (encoding.length(encoder) > 0) {
      socket.emit('collab:sync', { room, buffer: encoding.toUint8Array(encoder) });
    }
  }

  // Handle document updates
  async handleUpdate(socket: Socket, room: string, update: Uint8Array) {
    const doc = await this.getDoc(room);
    Y.applyUpdate(doc, update);

    // Broadcast update to others in room
    socket.to(room).emit('collab:update', { room, update });

    this.saveDocDebounced(room, doc);
  }

  private async getDoc(room: string): Promise<Y.Doc> {
    if (this.docs.has(room)) {
      return this.docs.get(room)!;
    }

    const doc = new Y.Doc();

    // Load from DB
    const content = await this.persistence.loadDocument(room);
    if (content) {
      Y.applyUpdate(doc, content);
    }

    // Hook for updates (local updates applied via handleUpdate call applyUpdate,
    // but if we modified doc directly we would need this.
    // Also useful if we want to catch ALL updates for persistence)
    doc.on('update', (update, origin) => {
      if (origin !== this) { // "this" could be used to mark DB loads
         // already handled by handleUpdate for broadcast
      }
    });

    this.docs.set(room, doc);
    return doc;
  }

  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private saveDocDebounced(room: string, doc: Y.Doc) {
    if (this.saveTimeouts.has(room)) {
      clearTimeout(this.saveTimeouts.get(room));
    }

    const timeout = setTimeout(() => {
      this.saveDoc(room, doc);
      this.saveTimeouts.delete(room);
    }, DEBOUNCE_SAVE_MS);

    this.saveTimeouts.set(room, timeout);
  }

  private async saveDoc(room: string, doc: Y.Doc) {
    try {
      const state = Y.encodeStateAsUpdate(doc);
      const json = doc.toJSON();
      await this.persistence.saveDocument(room, state, json);
      // logger.debug({ room }, 'Saved Yjs doc to Postgres');
    } catch (err) {
      logger.error({ room, err }, 'Failed to save Yjs doc');
    }
  }
}
