import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { RedisPersistence } from './persistence.js';
import { Redis } from 'ioredis';

const messageSync = 0;
const messageAwareness = 1;

export class YjsHandler {
  private docs: Map<string, Y.Doc> = new Map();
  private persistence: RedisPersistence;
  private connections: Map<string, Set<any>> = new Map();
  private wsDocMap: Map<any, string> = new Map();
  private awareness: Map<string, awarenessProtocol.Awareness> = new Map();

  constructor(redis: Redis) {
    this.persistence = new RedisPersistence(redis);
  }

  async handleConnection(ws: any, docName: string) {
    const doc = await this.getDoc(docName);

    // Track connection
    if (!this.connections.has(docName)) {
      this.connections.set(docName, new Set());
    }
    this.connections.get(docName)!.add(ws);
    this.wsDocMap.set(ws, docName);

    // Initialize sync
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    this.send(ws, encoding.toUint8Array(encoder));

    // Initialize awareness
    const awareness = this.getAwareness(docName, doc);
    const awarenessStates = awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, messageAwareness);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          Array.from(awarenessStates.keys())
        )
      );
      this.send(ws, encoding.toUint8Array(awarenessEncoder));
    }
  }

  async handleMessage(ws: any, message: Uint8Array) {
    const docName = this.wsDocMap.get(ws);
    if (!docName) return;

    const doc = await this.getDoc(docName);
    const decoder = decoding.createDecoder(message);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync:
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws); // ws as transaction origin
        if (encoding.length(encoder) > 1) {
          this.send(ws, encoding.toUint8Array(encoder));
        }
        break;

      case messageAwareness:
        const awareness = this.getAwareness(docName, doc);
        awarenessProtocol.applyAwarenessUpdate(
          awareness,
          decoding.readVarUint8Array(decoder),
          ws
        );
        break;
    }
  }

  handleClose(ws: any) {
    const docName = this.wsDocMap.get(ws);
    if (docName) {
      const awareness = this.awareness.get(docName);
      if (awareness) {
        // Remove awareness state for this client if we mapped it (optional, usually client handles this on close but hard close might need cleanup)
        // y-websocket usually handles this by tracking clientID.
        // For simplicity, we rely on awareness timeout or explicit removal if we tracked clientID.
        // But here we don't know the clientID without more logic.
        // Standard y-websocket uses ping/pong to detect disconnects and clear awareness.
      }

      const conns = this.connections.get(docName);
      if (conns) {
        conns.delete(ws);
        if (conns.size === 0) {
            // Optional: Cleanup doc from memory if no connections
            // But we keep it for now for cache
        }
      }
      this.wsDocMap.delete(ws);
    }
  }

  private async getDoc(docName: string): Promise<Y.Doc> {
    if (this.docs.has(docName)) {
      return this.docs.get(docName)!;
    }

    const doc = new Y.Doc();
    doc.gc = true;

    // Bind persistence
    await this.persistence.bindState(docName, doc);

    // Setup updates propagation
    doc.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      // Broadcast to all clients on this doc, except origin
      const clients = this.connections.get(docName);
      if (clients) {
        clients.forEach((client) => {
          if (client !== origin) {
            this.send(client, message);
          }
        });
      }
    });

    this.docs.set(docName, doc);
    return doc;
  }

  private getAwareness(docName: string, doc: Y.Doc): awarenessProtocol.Awareness {
    if (this.awareness.has(docName)) {
      return this.awareness.get(docName)!;
    }

    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);

      const clients = this.connections.get(docName);
      if (clients) {
        clients.forEach((client) => {
            if (client !== origin) {
                this.send(client, message);
            }
        });
      }
    });

    this.awareness.set(docName, awareness);
    return awareness;
  }

  private send(ws: any, message: Uint8Array) {
    try {
        // uWebSockets.js expects ArrayBuffer or String, Uint8Array works if passed buffer
        // or we might need to cast/copy.
        // ws.send accepts TypedArray in many implementations, but uWS might be strict.
        // The safest is to send the buffer.
        ws.send(message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength), true); // true = binary
    } catch (e) {
        console.error('Failed to send message to client', e);
    }
  }
}
