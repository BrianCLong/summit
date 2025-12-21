
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { io, Socket } from 'socket.io-client';

interface CollabContextType {
  doc: Y.Doc | null;
  status: 'connecting' | 'connected' | 'disconnected';
  room: string | null;
}

const CollabContext = createContext<CollabContextType | null>(null);

export function useCollab() {
  const context = useContext(CollabContext);
  if (!context) throw new Error('useCollab must be used within CollabProvider');
  return context;
}

export const CollabProvider = ({ children, room, serverUrl }: { children: React.ReactNode, room: string, serverUrl: string }) => {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize Yjs doc
    const ydoc = new Y.Doc();
    setDoc(ydoc);
    setStatus('connecting');

    // Initialize Socket
    const socket = io(serverUrl, {
      transports: ['websocket'],
      query: { room }
    });
    socketRef.current = socket;

    const remoteOrigin = 'remote';

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('collab:join', { room });
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    // Handle Sync
    socket.on('collab:sync', ({ room: msgRoom, buffer }: { room: string, buffer: ArrayBuffer }) => {
       if (msgRoom !== room) return;
       const decoder = decoding.createDecoder(new Uint8Array(buffer));
       const encoder = encoding.createEncoder();

       syncProtocol.readSyncMessage(decoder, encoder, ydoc, remoteOrigin);

       if (encoding.length(encoder) > 0) {
           socket.emit('collab:sync', {
               room,
               buffer: encoding.toUint8Array(encoder)
           });
       }
    });

    // Handle Update
    socket.on('collab:update', ({ room: msgRoom, update }: { room: string, update: ArrayBuffer }) => {
       if (msgRoom !== room) return;
       Y.applyUpdate(ydoc, new Uint8Array(update), remoteOrigin);
    });

    // Listen for local updates
    const updateHandler = (update: Uint8Array, origin: any) => {
       if (origin !== remoteOrigin && socket.connected) {
           socket.emit('collab:update', { room, update });
       }
    };

    ydoc.on('update', updateHandler);

    return () => {
      socket.disconnect();
      ydoc.destroy();
    };
  }, [room, serverUrl]);

  return (
    <CollabContext.Provider value={{ doc, status, room }}>
      {children}
    </CollabContext.Provider>
  );
};
