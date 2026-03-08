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

export * from './types';
export * from './websocket';
export * from './sse';
