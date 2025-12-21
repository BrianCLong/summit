import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';

interface CollabContextType {
  doc: Y.Doc;
  status: 'connected' | 'disconnected' | 'connecting';
  socket: Socket | null;
}

const CollabContext = createContext<CollabContextType | null>(null);

interface CollabProviderProps {
  children: React.ReactNode;
  caseId: string;
  url: string;
  token: string;
}

export const CollabProvider: React.FC<CollabProviderProps> = ({ children, caseId, url, token }) => {
  const [doc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setStatus('connecting');
    const socket = io(url, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      // Send initial sync request
      const vector = Y.encodeStateVector(doc);
      socket.emit('collab:sync', { room: `case:${caseId}`, payload: vector });
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('collab:sync_response', (data: { room: string; payload: any }) => {
      const payload = data.payload instanceof ArrayBuffer ? new Uint8Array(data.payload) : new Uint8Array(Object.values(data.payload));
      Y.applyUpdate(doc, payload, 'server');
    });

    socket.on('collab:update', (data: { room: string; payload: any }) => {
      const payload = data.payload instanceof ArrayBuffer ? new Uint8Array(data.payload) : new Uint8Array(Object.values(data.payload));
      Y.applyUpdate(doc, payload, 'server');
    });

    // Listen for local updates
    const handleUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'server') {
        socket.emit('collab:update', { room: `case:${caseId}`, payload: update });
      }
    };
    doc.on('update', handleUpdate);

    return () => {
      doc.off('update', handleUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [caseId, url, token, doc]);

  return (
    <CollabContext.Provider value={{ doc, status, socket: socketRef.current }}>
      {children}
    </CollabContext.Provider>
  );
};

export const useCollab = () => {
  const context = useContext(CollabContext);
  if (!context) {
    throw new Error('useCollab must be used within a CollabProvider');
  }
  return context;
};
