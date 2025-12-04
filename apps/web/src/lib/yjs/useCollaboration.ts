import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface UserAwareness {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: string[];
  clientId?: number;
}

export const useCollaboration = (docName: string, user: { id: string; name: string }, token?: string) => {
  const [doc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<any>(null);
  const [users, setUsers] = useState<UserAwareness[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Initialize Y.js and providers
  useEffect(() => {
    if (!token) return; // Wait for token

    // Airgap support: IndexedDB persistence
    const indexeddbProvider = new IndexeddbPersistence(docName, doc);

    indexeddbProvider.on('synced', () => {
      console.log('Content loaded from local database');
    });

    // Websocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use configured WS URL or fallback to relative or default 9001
    // In dev, if UI is on 5173 and server on 4000/9001.
    // Ideally this comes from a config file.
    let wsServerUrl = import.meta.env.VITE_WS_URL;
    if (!wsServerUrl) {
        // Fallback logic
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
             wsServerUrl = 'ws://localhost:9001/yjs';
        } else {
             wsServerUrl = `${protocol}//${window.location.host}/yjs`;
        }
    }

    const wsProvider = new WebsocketProvider(
      wsServerUrl,
      docName,
      doc,
      { connect: true, params: { token: token } }
    );

    wsProvider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    wsProvider.on('sync', (isSynced: boolean) => {
      setIsSynced(isSynced);
    });

    setProvider(wsProvider);
    setAwareness(wsProvider.awareness);

    return () => {
      wsProvider.destroy();
      indexeddbProvider.destroy();
      doc.destroy();
    };
  }, [docName, doc, token]);

  // Handle awareness/presence
  useEffect(() => {
    if (!awareness || !user.id) return;

    // Set local state
    awareness.setLocalState({
      user: {
        id: user.id,
        name: user.name,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color for now
      }
    });

    const handleAwarenessUpdate = () => {
      const states = awareness.getStates();
      const activeUsers: UserAwareness[] = [];
      states.forEach((state: any, clientId: number) => {
        if (state.user) {
          activeUsers.push({
            ...state.user,
            clientId,
          });
        }
      });
      setUsers(activeUsers);
    };

    awareness.on('change', handleAwarenessUpdate);
    handleAwarenessUpdate(); // Initial check

    return () => {
      awareness.off('change', handleAwarenessUpdate);
    };
  }, [awareness, user]);

  return {
    doc,
    provider,
    awareness,
    users,
    isConnected,
    isSynced,
  };
};
