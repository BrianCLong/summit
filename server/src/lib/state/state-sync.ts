
// server/src/lib/state/state-sync.ts

import { WebSocket } from 'ws';

// NOTE: This is a simplified simulation for demonstration purposes and is not a production-ready implementation.
// It does not include a full WebSocket server implementation or robust error handling.

interface SyncOperation {
  type: 'update' | 'delete';
  key: string;
  value?: any;
  timestamp: number;
}

export class StateSyncClient {
  private ws: WebSocket;
  private offlineQueue: SyncOperation[] = [];
  private isOnline: boolean = false;
  private localState: Map<string, any> = new Map();

  constructor(serverUrl: string) {
    this.ws = new WebSocket(serverUrl);
    this.ws.on('open', () => {
      this.isOnline = true;
      this.syncOfflineQueue();
    });
    this.ws.on('message', (data) => {
      this.handleServerUpdate(JSON.parse(data.toString()));
    });
    this.ws.on('close', () => {
      this.isOnline = false;
    });
  }

  /**
   * Performs an optimistic update to the local state and sends the operation to the server.
   * @param op The synchronization operation to perform.
   */
  public performOperation(op: Omit<SyncOperation, 'timestamp'>): void {
    const operation: SyncOperation = { ...op, timestamp: Date.now() };

    // Optimistic update
    if (operation.type === 'update') {
      this.localState.set(operation.key, operation.value);
    } else if (operation.type === 'delete') {
      this.localState.delete(operation.key);
    }

    if (this.isOnline) {
      this.ws.send(JSON.stringify(operation));
    } else {
      this.offlineQueue.push(operation);
    }
  }

  /**
   * Sends all pending operations from the offline queue to the server.
   */
  private syncOfflineQueue(): void {
    while (this.offlineQueue.length > 0) {
      const op = this.offlineQueue.shift();
      if (op) {
        this.ws.send(JSON.stringify(op));
      }
    }
  }

  /**
   * Handles a state update from the server, reconciling it with the local state.
   * @param serverOp The synchronization operation from the server.
   */
  private handleServerUpdate(serverOp: SyncOperation): void {
    // This is a simple reconciliation strategy. A more robust implementation
    // would use CRDTs or a more sophisticated merging algorithm.
    const localValue = this.localState.get(serverOp.key);
    if (serverOp.type === 'update') {
      console.log(`Server update for key '${serverOp.key}':`, serverOp.value);
      this.localState.set(serverOp.key, serverOp.value);
    } else if (serverOp.type === 'delete') {
      console.log(`Server delete for key '${serverOp.key}'`);
      this.localState.delete(serverOp.key);
    }
  }

  /**
   * Returns the local state.
   */
  public getState(): Map<string, any> {
    return this.localState;
  }
}
