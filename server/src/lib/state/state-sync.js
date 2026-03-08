"use strict";
// server/src/lib/state/state-sync.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateSyncClient = void 0;
const ws_1 = require("ws");
class StateSyncClient {
    ws;
    offlineQueue = [];
    isOnline = false;
    localState = new Map();
    constructor(serverUrl) {
        this.ws = new ws_1.WebSocket(serverUrl);
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
    performOperation(op) {
        const operation = { ...op, timestamp: Date.now() };
        // Optimistic update
        if (operation.type === 'update') {
            this.localState.set(operation.key, operation.value);
        }
        else if (operation.type === 'delete') {
            this.localState.delete(operation.key);
        }
        if (this.isOnline) {
            this.ws.send(JSON.stringify(operation));
        }
        else {
            this.offlineQueue.push(operation);
        }
    }
    /**
     * Sends all pending operations from the offline queue to the server.
     */
    syncOfflineQueue() {
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
    handleServerUpdate(serverOp) {
        // This is a simple reconciliation strategy. A more robust implementation
        // would use CRDTs or a more sophisticated merging algorithm.
        const localValue = this.localState.get(serverOp.key);
        if (serverOp.type === 'update') {
            console.log(`Server update for key '${serverOp.key}':`, serverOp.value);
            this.localState.set(serverOp.key, serverOp.value);
        }
        else if (serverOp.type === 'delete') {
            console.log(`Server delete for key '${serverOp.key}'`);
            this.localState.delete(serverOp.key);
        }
    }
    /**
     * Returns the local state.
     */
    getState() {
        return this.localState;
    }
}
exports.StateSyncClient = StateSyncClient;
