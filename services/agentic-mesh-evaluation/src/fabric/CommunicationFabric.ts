/**
 * Communication Fabric - High-Performance Message Routing
 * Handles all inter-agent communication with routing, retries, and delivery guarantees
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import Queue from 'bull';
import WebSocket from 'ws';
import { nanoid } from 'nanoid';
import type {
  MeshMessage,
  MeshNode,
  MeshEdge,
  CommunicationProtocol,
} from '../types/mesh.js';

export interface FabricConfig {
  redisUrl: string;
  enableRetries: boolean;
  maxRetries: number;
  retryDelayMs: number;
  enableDeadLetterQueue: boolean;
  messageTimeoutMs: number;
}

export class CommunicationFabric extends EventEmitter {
  private redis: Redis;
  private messageQueue: Queue.Queue;
  private connections: Map<string, WebSocket>;
  private routes: Map<string, Map<string, string[]>>; // meshId -> nodeId -> path

  constructor(private config: FabricConfig) {
    super();
    this.redis = new Redis(config.redisUrl);
    this.messageQueue = new Queue('mesh-messages', config.redisUrl);
    this.connections = new Map();
    this.routes = new Map();

    this.setupMessageProcessor();
  }

  /**
   * Register a node in the fabric
   */
  async registerNode(meshId: string, node: MeshNode): Promise<void> {
    const nodeKey = `${meshId}:${node.id}`;

    // Store node endpoint
    await this.redis.hset(
      'fabric:nodes',
      nodeKey,
      JSON.stringify({
        endpoint: node.endpoint,
        protocol: node.protocol,
        status: node.status,
      })
    );

    // Establish WebSocket connection if supported
    if (node.protocol.includes('websocket')) {
      await this.establishWebSocketConnection(meshId, node);
    }

    this.emit('node-registered', { meshId, nodeId: node.id });
  }

  /**
   * Unregister a node
   */
  async unregisterNode(meshId: string, nodeId: string): Promise<void> {
    const nodeKey = `${meshId}:${nodeId}`;

    // Close WebSocket connection
    const ws = this.connections.get(nodeKey);
    if (ws) {
      ws.close();
      this.connections.delete(nodeKey);
    }

    await this.redis.hdel('fabric:nodes', nodeKey);

    this.emit('node-unregistered', { meshId, nodeId });
  }

  /**
   * Establish WebSocket connection to a node
   */
  private async establishWebSocketConnection(
    meshId: string,
    node: MeshNode
  ): Promise<void> {
    try {
      const ws = new WebSocket(node.endpoint);

      ws.on('open', () => {
        this.connections.set(`${meshId}:${node.id}`, ws);
        this.emit('connection-established', { meshId, nodeId: node.id });
      });

      ws.on('message', (data) => {
        this.handleIncomingMessage(meshId, node.id, data);
      });

      ws.on('error', (error) => {
        this.emit('connection-error', {
          meshId,
          nodeId: node.id,
          error,
        });
      });

      ws.on('close', () => {
        this.connections.delete(`${meshId}:${node.id}`);
        this.emit('connection-closed', { meshId, nodeId: node.id });
      });
    } catch (error) {
      this.emit('connection-failed', { meshId, nodeId: node.id, error });
    }
  }

  /**
   * Establish connection based on edge definition
   */
  async establishConnection(meshId: string, edge: MeshEdge): Promise<void> {
    // Store routing information
    const routeKey = `route:${meshId}:${edge.sourceId}:${edge.targetId}`;
    await this.redis.set(
      routeKey,
      JSON.stringify({
        protocol: edge.protocol,
        weight: edge.weight,
        latency: edge.latencyMs,
      })
    );

    this.emit('route-established', { meshId, edge });
  }

  /**
   * Send a message through the fabric
   */
  async sendMessage(meshId: string, message: MeshMessage): Promise<void> {
    // Store message
    await this.redis.setex(
      `message:${message.id}`,
      message.ttl,
      JSON.stringify(message)
    );

    // Route message based on protocol
    switch (message.protocol) {
      case 'direct':
        await this.sendDirect(meshId, message);
        break;

      case 'broadcast':
        await this.sendBroadcast(meshId, message);
        break;

      case 'multicast':
        await this.sendMulticast(meshId, message);
        break;

      case 'pubsub':
        await this.publishMessage(meshId, message);
        break;

      case 'request-response':
        await this.sendRequestResponse(meshId, message);
        break;

      case 'fire-and-forget':
        await this.sendFireAndForget(meshId, message);
        break;

      default:
        await this.sendDirect(meshId, message);
    }

    this.emit('message-sent', { meshId, message });
  }

  /**
   * Send direct point-to-point message
   */
  private async sendDirect(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    const targetId = Array.isArray(message.targetId)
      ? message.targetId[0]
      : message.targetId;

    const nodeKey = `${meshId}:${targetId}`;
    const ws = this.connections.get(nodeKey);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      message.delivered = true;
      message.deliveredAt = new Date();
      this.emit('message-delivered', { meshId, message });
    } else {
      // Queue for later delivery
      await this.messageQueue.add('deliver', { meshId, message });
    }
  }

  /**
   * Broadcast message to all nodes
   */
  private async sendBroadcast(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    const nodeKeys = Array.from(this.connections.keys()).filter((key) =>
      key.startsWith(`${meshId}:`)
    );

    for (const nodeKey of nodeKeys) {
      const ws = this.connections.get(nodeKey);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }

    message.delivered = true;
    message.deliveredAt = new Date();
    this.emit('message-broadcast', { meshId, message });
  }

  /**
   * Multicast to specific nodes
   */
  private async sendMulticast(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    const targetIds = Array.isArray(message.targetId)
      ? message.targetId
      : [message.targetId];

    for (const targetId of targetIds) {
      const nodeKey = `${meshId}:${targetId}`;
      const ws = this.connections.get(nodeKey);

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }

    message.delivered = true;
    message.deliveredAt = new Date();
    this.emit('message-multicast', { meshId, message });
  }

  /**
   * Publish message to pub/sub channel
   */
  private async publishMessage(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    await this.redis.publish(
      `mesh:${meshId}:messages`,
      JSON.stringify(message)
    );
    this.emit('message-published', { meshId, message });
  }

  /**
   * Send request-response message
   */
  private async sendRequestResponse(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    await this.sendDirect(meshId, message);

    // Wait for response with timeout
    const responseKey = `response:${message.id}`;
    const timeout = this.config.messageTimeoutMs;

    // Set up response listener
    const response = await this.waitForResponse(responseKey, timeout);

    if (response) {
      this.emit('response-received', { meshId, message, response });
    } else {
      this.emit('response-timeout', { meshId, message });
    }
  }

  /**
   * Fire and forget - no delivery guarantee
   */
  private async sendFireAndForget(
    meshId: string,
    message: MeshMessage
  ): Promise<void> {
    await this.sendDirect(meshId, message);
    // Don't wait for acknowledgment
  }

  /**
   * Wait for response to a message
   */
  private async waitForResponse(
    responseKey: string,
    timeoutMs: number
  ): Promise<any> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), timeoutMs);

      const checkResponse = async () => {
        const response = await this.redis.get(responseKey);
        if (response) {
          clearTimeout(timeout);
          resolve(JSON.parse(response));
        } else {
          setTimeout(checkResponse, 100);
        }
      };

      checkResponse();
    });
  }

  /**
   * Handle incoming message from node
   */
  private async handleIncomingMessage(
    meshId: string,
    nodeId: string,
    data: WebSocket.Data
  ): Promise<void> {
    try {
      const message = JSON.parse(data.toString());

      // Update message tracking
      message.delivered = true;
      message.deliveredAt = new Date();
      message.hops += 1;
      message.route.push(nodeId);

      await this.redis.setex(
        `message:${message.id}`,
        message.ttl,
        JSON.stringify(message)
      );

      this.emit('message-received', { meshId, nodeId, message });

      // Handle response messages
      if (message.correlationId) {
        await this.redis.setex(
          `response:${message.correlationId}`,
          60,
          JSON.stringify(message)
        );
      }
    } catch (error) {
      this.emit('message-error', { meshId, nodeId, error });
    }
  }

  /**
   * Health check for a node
   */
  async healthCheck(meshId: string, nodeId: string): Promise<boolean> {
    const nodeKey = `${meshId}:${nodeId}`;
    const ws = this.connections.get(nodeKey);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Send ping
    const pingMessage: MeshMessage = {
      id: nanoid(),
      type: 'heartbeat',
      sourceId: 'fabric',
      targetId: nodeId,
      protocol: 'request-response',
      payload: { type: 'ping' },
      timestamp: new Date(),
      ttl: 30,
      priority: 100,
      hops: 0,
      route: [],
      delivered: false,
      acknowledged: false,
    };

    try {
      ws.send(JSON.stringify(pingMessage));
      const response = await this.waitForResponse(
        `response:${pingMessage.id}`,
        5000
      );
      return response !== null;
    } catch {
      return false;
    }
  }

  /**
   * Set up message queue processor
   */
  private setupMessageProcessor(): void {
    this.messageQueue.process('deliver', async (job) => {
      const { meshId, message } = job.data;

      if (message.retries < this.config.maxRetries) {
        await this.sendMessage(meshId, message);
        message.retries += 1;
      } else {
        // Move to dead letter queue
        if (this.config.enableDeadLetterQueue) {
          await this.redis.lpush(
            `dlq:${meshId}`,
            JSON.stringify(message)
          );
        }
        this.emit('message-failed', { meshId, message });
      }
    });
  }

  /**
   * Get fabric statistics
   */
  async getStatistics(meshId: string): Promise<any> {
    const stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageLatency: 0,
    };

    const nodeKeys = Array.from(this.connections.keys()).filter((key) =>
      key.startsWith(`${meshId}:`)
    );

    stats.totalConnections = nodeKeys.length;
    stats.activeConnections = nodeKeys.filter((key) => {
      const ws = this.connections.get(key);
      return ws && ws.readyState === WebSocket.OPEN;
    }).length;

    // Get message stats from Redis
    const messageKeys = await this.redis.keys(`message:${meshId}:*`);
    stats.messagesSent = messageKeys.length;

    return stats;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();
    await this.messageQueue.close();
    await this.redis.quit();
  }
}
