"use strict";
/**
 * Streaming API Framework
 *
 * Provides real-time streaming capabilities via WebSocket and SSE
 *
 * @example
 * ```typescript
 * import { StreamingWebSocketServer, SSEServer } from '@intelgraph/streaming-api';
 *
 * // WebSocket
 * const wsServer = new StreamingWebSocketServer({ port: 8080 });
 *
 * wsServer.on('subscribe', ({ connectionId, topic }) => {
 *   console.log(`${connectionId} subscribed to ${topic}`);
 * });
 *
 * // Broadcast events
 * wsServer.broadcast('entities', {
 *   id: '123',
 *   topic: 'entities',
 *   type: 'created',
 *   data: { id: 'entity-1', name: 'New Entity' },
 *   timestamp: new Date(),
 * });
 *
 * // SSE
 * const sseServer = new SSEServer();
 *
 * app.get('/stream', (req, res) => {
 *   sseServer.handleConnection(req, res, {
 *     topics: ['entities', 'relationships'],
 *   });
 * });
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./types.js"), exports);
__exportStar(require("./websocket.js"), exports);
__exportStar(require("./sse.js"), exports);
