"use strict";
// server/src/lib/state/consistency-engine.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsistencyEngine = exports.ConsistencyLevel = void 0;
/**
 * Defines the available consistency levels for data operations.
 */
var ConsistencyLevel;
(function (ConsistencyLevel) {
    /**
     * Strong consistency ensures that all clients see the same data at the same time.
     * All writes are linearized.
     */
    ConsistencyLevel["Strong"] = "strong";
    /**
     * Causal consistency ensures that operations that are causally related are seen in the same order by all clients.
     */
    ConsistencyLevel["Causal"] = "causal";
    /**
     * Eventual consistency ensures that, if no new updates are made to a given data item,
     * all accesses to that item will eventually return the last updated value.
     */
    ConsistencyLevel["Eventual"] = "eventual";
    /**
     * Session consistency ensures that a client sees its own writes within a session.
     */
    ConsistencyLevel["Session"] = "session";
})(ConsistencyLevel || (exports.ConsistencyLevel = ConsistencyLevel = {}));
/**
 * A simple in-memory store to simulate a database.
 */
const dataStore = new Map();
const sessionStore = new Map();
/**
 * A simple consistency engine that enforces different consistency levels.
 * NOTE: This is a simplified simulation for demonstration purposes and is not a production-ready implementation.
 */
class ConsistencyEngine {
    versionVector = new Map();
    /**
     * Reads a value from the data store with the specified consistency level.
     * @param key The key to read.
     * @param options The read options.
     * @returns The value associated with the key.
     */
    read(key, options) {
        switch (options.consistency) {
            case ConsistencyLevel.Strong:
                // In a real system, this would involve a distributed consensus protocol.
                return dataStore.get(key);
            case ConsistencyLevel.Causal:
                // Causal consistency requires a version vector to be passed with the request.
                // For simplicity, we'll just return the value from the data store.
                return dataStore.get(key);
            case ConsistencyLevel.Session:
                if (options.sessionId && sessionStore.has(options.sessionId)) {
                    const sessionData = sessionStore.get(options.sessionId);
                    if (sessionData.has(key)) {
                        return sessionData.get(key);
                    }
                }
                return dataStore.get(key);
            case ConsistencyLevel.Eventual:
            default:
                return dataStore.get(key);
        }
    }
    /**
     * Writes a value to the data store with the specified consistency level.
     * @param key The key to write.
     * @param value The value to write.
     * @param options The write options.
     */
    write(key, value, options) {
        const nodeId = 'node1'; // In a real system, this would be the ID of the current node.
        const currentVersion = this.versionVector.get(nodeId) || 0;
        this.versionVector.set(nodeId, currentVersion + 1);
        switch (options.consistency) {
            case ConsistencyLevel.Strong:
                // In a real system, this would involve a distributed consensus protocol.
                dataStore.set(key, value);
                break;
            case ConsistencyLevel.Causal:
                // Causal consistency requires a version vector to be passed with the request.
                // For simplicity, we'll just set the value in the data store.
                dataStore.set(key, value);
                break;
            case ConsistencyLevel.Session:
                if (options.sessionId) {
                    if (!sessionStore.has(options.sessionId)) {
                        sessionStore.set(options.sessionId, new Map());
                    }
                    sessionStore.get(options.sessionId).set(key, value);
                }
                // Also write to the main store for eventual consistency.
                dataStore.set(key, value);
                break;
            case ConsistencyLevel.Eventual:
            default:
                dataStore.set(key, value);
                break;
        }
    }
    /**
     * Enforces monotonic reads. In a distributed system, this would ensure that
     * a client does not see older versions of data after seeing newer versions.
     * @param lastReadVersion The version of the data last read by the client.
     * @param currentVersion The current version of the data.
     */
    enforceMonotonicReads(lastReadVersion, currentVersion) {
        if (lastReadVersion > currentVersion) {
            throw new Error('Monotonic read violation detected.');
        }
    }
    /**
     * Enforces monotonic writes. In a distributed system, this would ensure that
     * writes from a single client are applied in the order they were issued.
     */
    enforceMonotonicWrites() {
        // This is typically handled by the underlying data store or replication protocol.
        // For this simulation, we assume writes are ordered.
    }
}
exports.ConsistencyEngine = ConsistencyEngine;
