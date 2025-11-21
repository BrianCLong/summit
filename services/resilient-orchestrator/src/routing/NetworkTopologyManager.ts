/**
 * Network Topology Manager
 * Manages network topology, adaptive routing, and path optimization
 * for hybrid, denied, and degraded network environments
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import type {
  NetworkNode,
  Endpoint,
  Route,
  NetworkCondition,
  CommChannel
} from '../types.js';
import { logger } from '../utils/logger.js';

interface TopologyEvents {
  'node:added': (node: NetworkNode) => void;
  'node:removed': (nodeId: string) => void;
  'node:condition-changed': (nodeId: string, condition: NetworkCondition) => void;
  'route:calculated': (route: Route) => void;
  'route:failed': (routeId: string, reason: string) => void;
  'topology:degraded': (affectedNodes: string[]) => void;
  'topology:recovered': (recoveredNodes: string[]) => void;
}

export class NetworkTopologyManager extends EventEmitter<TopologyEvents> {
  private nodes: Map<string, NetworkNode> = new Map();
  private routes: Map<string, Route> = new Map();
  private adjacencyMatrix: Map<string, Map<string, number>> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

  private readonly HEARTBEAT_INTERVAL_MS = 5000;
  private readonly NODE_TIMEOUT_MS = 15000;
  private readonly MAX_ROUTE_HOPS = 8;

  constructor() {
    super();
    this.startTopologyMonitor();
  }

  /**
   * Register a new node in the topology
   */
  registerNode(node: Omit<NetworkNode, 'id' | 'lastSeen'>): NetworkNode {
    const fullNode: NetworkNode = {
      ...node,
      id: uuid(),
      lastSeen: new Date(),
    };

    this.nodes.set(fullNode.id, fullNode);
    this.updateAdjacencyMatrix();
    this.emit('node:added', fullNode);

    logger.info('Node registered', { nodeId: fullNode.id, name: fullNode.name });
    return fullNode;
  }

  /**
   * Remove a node from the topology
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    this.nodes.delete(nodeId);
    this.adjacencyMatrix.delete(nodeId);

    // Remove from all adjacency lists
    for (const [, neighbors] of this.adjacencyMatrix) {
      neighbors.delete(nodeId);
    }

    // Invalidate affected routes
    this.invalidateRoutesThrough(nodeId);
    this.emit('node:removed', nodeId);

    logger.info('Node removed', { nodeId });
    return true;
  }

  /**
   * Update node condition (network status)
   */
  updateNodeCondition(nodeId: string, condition: NetworkCondition): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const previousCondition = node.condition;
    node.condition = condition;
    node.lastSeen = new Date();

    if (previousCondition !== condition) {
      this.emit('node:condition-changed', nodeId, condition);

      if (condition === 'denied' || condition === 'offline') {
        this.handleNodeDegraded(nodeId);
      } else if (previousCondition === 'denied' || previousCondition === 'offline') {
        this.handleNodeRecovered(nodeId);
      }
    }
  }

  /**
   * Calculate optimal route between two nodes
   * Uses Dijkstra's algorithm with reliability weighting
   */
  calculateRoute(sourceId: string, destId: string, preferredChannel?: CommChannel): Route | null {
    const source = this.nodes.get(sourceId);
    const dest = this.nodes.get(destId);

    if (!source || !dest) {
      logger.warn('Route calculation failed: node not found', { sourceId, destId });
      return null;
    }

    // Filter available nodes
    const availableNodes = new Map<string, NetworkNode>();
    for (const [id, node] of this.nodes) {
      if (node.condition !== 'offline' && node.condition !== 'denied') {
        availableNodes.set(id, node);
      }
    }

    // Dijkstra's algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const unvisited = new Set<string>();

    for (const id of availableNodes.keys()) {
      distances.set(id, id === sourceId ? 0 : Infinity);
      unvisited.add(id);
    }

    while (unvisited.size > 0) {
      // Find minimum distance node
      let minNode: string | null = null;
      let minDist = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDist) {
          minDist = dist;
          minNode = nodeId;
        }
      }

      if (minNode === null || minNode === destId) break;

      unvisited.delete(minNode);

      // Update neighbors
      const neighbors = this.adjacencyMatrix.get(minNode);
      if (neighbors) {
        for (const [neighborId, weight] of neighbors) {
          if (!unvisited.has(neighborId)) continue;

          const alt = (distances.get(minNode) ?? 0) + weight;
          if (alt < (distances.get(neighborId) ?? Infinity)) {
            distances.set(neighborId, alt);
            previous.set(neighborId, minNode);
          }
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | undefined = destId;

    while (current && current !== sourceId) {
      path.unshift(current);
      current = previous.get(current);
    }

    if (current !== sourceId) {
      logger.warn('No route found', { sourceId, destId });
      return null;
    }

    path.unshift(sourceId);

    if (path.length > this.MAX_ROUTE_HOPS) {
      logger.warn('Route exceeds max hops', { sourceId, destId, hops: path.length });
      return null;
    }

    // Determine channel based on conditions
    const channel = this.selectChannel(path, preferredChannel);

    const route: Route = {
      id: uuid(),
      source: sourceId,
      destination: destId,
      hops: path.slice(1, -1), // Exclude source and dest
      channel,
      estimatedLatencyMs: this.estimateLatency(path),
      reliability: this.calculateReliability(path),
      priority: this.calculatePriority(source, dest),
      active: true,
    };

    this.routes.set(route.id, route);
    this.emit('route:calculated', route);

    return route;
  }

  /**
   * Find alternative routes for failover
   */
  findAlternativeRoutes(sourceId: string, destId: string, excludeNodes: string[] = []): Route[] {
    const alternatives: Route[] = [];
    const tempExcluded = new Set(excludeNodes);

    // Try finding up to 3 alternative routes
    for (let i = 0; i < 3; i++) {
      const route = this.calculateRouteExcluding(sourceId, destId, tempExcluded);
      if (route) {
        alternatives.push(route);
        // Exclude the primary hop for next iteration
        if (route.hops.length > 0) {
          tempExcluded.add(route.hops[0]);
        }
      }
    }

    return alternatives;
  }

  /**
   * Get all available nodes by type
   */
  getNodesByType(type: NetworkNode['type']): NetworkNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  /**
   * Get satellite-capable nodes for denied environment routing
   */
  getSatelliteNodes(): NetworkNode[] {
    return Array.from(this.nodes.values()).filter(node =>
      node.endpoints.some(e => e.protocol === 'satellite' && e.available)
    );
  }

  /**
   * Get mesh network nodes for degraded routing
   */
  getMeshNodes(): NetworkNode[] {
    return Array.from(this.nodes.values()).filter(node =>
      node.endpoints.some(e => e.protocol === 'mesh' && e.available)
    );
  }

  private calculateRouteExcluding(
    sourceId: string,
    destId: string,
    excludeNodes: Set<string>
  ): Route | null {
    // Similar to calculateRoute but excludes specified nodes
    const availableNodes = new Map<string, NetworkNode>();
    for (const [id, node] of this.nodes) {
      if (
        !excludeNodes.has(id) &&
        node.condition !== 'offline' &&
        node.condition !== 'denied'
      ) {
        availableNodes.set(id, node);
      }
    }

    // Simplified Dijkstra for alternative routes
    const distances = new Map<string, number>();
    const previous = new Map<string, string>();
    const unvisited = new Set<string>();

    for (const id of availableNodes.keys()) {
      distances.set(id, id === sourceId ? 0 : Infinity);
      unvisited.add(id);
    }

    while (unvisited.size > 0) {
      let minNode: string | null = null;
      let minDist = Infinity;

      for (const nodeId of unvisited) {
        const dist = distances.get(nodeId) ?? Infinity;
        if (dist < minDist) {
          minDist = dist;
          minNode = nodeId;
        }
      }

      if (minNode === null || minNode === destId) break;
      unvisited.delete(minNode);

      const neighbors = this.adjacencyMatrix.get(minNode);
      if (neighbors) {
        for (const [neighborId, weight] of neighbors) {
          if (!unvisited.has(neighborId) || excludeNodes.has(neighborId)) continue;

          const alt = (distances.get(minNode) ?? 0) + weight;
          if (alt < (distances.get(neighborId) ?? Infinity)) {
            distances.set(neighborId, alt);
            previous.set(neighborId, minNode);
          }
        }
      }
    }

    const path: string[] = [];
    let current: string | undefined = destId;

    while (current && current !== sourceId) {
      path.unshift(current);
      current = previous.get(current);
    }

    if (current !== sourceId || path.length === 0) return null;
    path.unshift(sourceId);

    return {
      id: uuid(),
      source: sourceId,
      destination: destId,
      hops: path.slice(1, -1),
      channel: this.selectChannel(path),
      estimatedLatencyMs: this.estimateLatency(path),
      reliability: this.calculateReliability(path) * 0.9, // Slightly lower reliability
      priority: 1,
      active: true,
    };
  }

  private selectChannel(path: string[], preferred?: CommChannel): CommChannel {
    // Check if any node in path requires satellite
    for (const nodeId of path) {
      const node = this.nodes.get(nodeId);
      if (node?.condition === 'satellite-only') {
        return 'satellite';
      }
    }

    // Check for degraded nodes that need mesh
    for (const nodeId of path) {
      const node = this.nodes.get(nodeId);
      if (node?.condition === 'degraded') {
        const hasMesh = node.endpoints.some(e => e.protocol === 'mesh' && e.available);
        if (hasMesh) return 'mesh';
      }
    }

    return preferred ?? 'primary';
  }

  private estimateLatency(path: string[]): number {
    let totalLatency = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = this.nodes.get(path[i]);
      const toNode = this.nodes.get(path[i + 1]);

      if (fromNode && toNode) {
        // Base latency
        let hopLatency = 10; // Base 10ms

        // Add latency based on conditions
        if (fromNode.condition === 'degraded' || toNode.condition === 'degraded') {
          hopLatency += 50;
        }
        if (fromNode.condition === 'satellite-only' || toNode.condition === 'satellite-only') {
          hopLatency += 500; // Satellite latency
        }

        totalLatency += hopLatency;
      }
    }

    return totalLatency;
  }

  private calculateReliability(path: string[]): number {
    let reliability = 1.0;

    for (const nodeId of path) {
      const node = this.nodes.get(nodeId);
      if (node) {
        switch (node.condition) {
          case 'nominal':
            reliability *= 0.99;
            break;
          case 'degraded':
            reliability *= 0.85;
            break;
          case 'satellite-only':
            reliability *= 0.90;
            break;
          default:
            reliability *= 0.5;
        }
      }
    }

    return reliability;
  }

  private calculatePriority(source: NetworkNode, dest: NetworkNode): number {
    // Higher priority for command nodes
    let priority = 0;
    if (source.type === 'command' || dest.type === 'command') priority += 2;
    if (source.type === 'coalition' || dest.type === 'coalition') priority += 1;
    return priority;
  }

  private updateAdjacencyMatrix(): void {
    // Build adjacency matrix based on node connectivity
    for (const [nodeId, node] of this.nodes) {
      if (!this.adjacencyMatrix.has(nodeId)) {
        this.adjacencyMatrix.set(nodeId, new Map());
      }

      // Connect to other nodes based on capabilities and conditions
      for (const [otherNodeId, otherNode] of this.nodes) {
        if (nodeId === otherNodeId) continue;

        const weight = this.calculateEdgeWeight(node, otherNode);
        if (weight < Infinity) {
          this.adjacencyMatrix.get(nodeId)?.set(otherNodeId, weight);
        }
      }
    }
  }

  private calculateEdgeWeight(from: NetworkNode, to: NetworkNode): number {
    // Check if nodes can communicate
    const compatibleProtocols = from.endpoints.filter(fe =>
      to.endpoints.some(te => te.protocol === fe.protocol && fe.available && te.available)
    );

    if (compatibleProtocols.length === 0) return Infinity;

    // Calculate weight based on latency and conditions
    let weight = 1;

    const minLatency = Math.min(...compatibleProtocols.map(e => e.latencyMs));
    weight += minLatency / 100;

    if (from.condition === 'degraded' || to.condition === 'degraded') weight *= 2;
    if (from.condition === 'satellite-only' || to.condition === 'satellite-only') weight *= 1.5;

    return weight;
  }

  private invalidateRoutesThrough(nodeId: string): void {
    for (const [routeId, route] of this.routes) {
      if (
        route.source === nodeId ||
        route.destination === nodeId ||
        route.hops.includes(nodeId)
      ) {
        route.active = false;
        this.emit('route:failed', routeId, `Node ${nodeId} unavailable`);
      }
    }
  }

  private handleNodeDegraded(nodeId: string): void {
    const affectedRoutes = Array.from(this.routes.values()).filter(
      r => r.source === nodeId || r.destination === nodeId || r.hops.includes(nodeId)
    );

    if (affectedRoutes.length > 0) {
      this.emit('topology:degraded', [nodeId]);
    }
  }

  private handleNodeRecovered(nodeId: string): void {
    this.updateAdjacencyMatrix();
    this.emit('topology:recovered', [nodeId]);
  }

  private startTopologyMonitor(): void {
    setInterval(() => {
      const now = Date.now();
      const timedOutNodes: string[] = [];

      for (const [nodeId, node] of this.nodes) {
        if (now - node.lastSeen.getTime() > this.NODE_TIMEOUT_MS) {
          if (node.condition !== 'offline') {
            this.updateNodeCondition(nodeId, 'offline');
            timedOutNodes.push(nodeId);
          }
        }
      }

      if (timedOutNodes.length > 0) {
        logger.warn('Nodes timed out', { nodes: timedOutNodes });
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Process heartbeat from a node
   */
  processHeartbeat(nodeId: string, condition: NetworkCondition): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastSeen = new Date();
      this.updateNodeCondition(nodeId, condition);
    }
  }

  /**
   * Get topology snapshot for reporting
   */
  getTopologySnapshot(): {
    nodes: NetworkNode[];
    routes: Route[];
    healthySummary: { total: number; healthy: number; degraded: number; offline: number };
  } {
    const nodes = Array.from(this.nodes.values());
    const routes = Array.from(this.routes.values()).filter(r => r.active);

    const healthySummary = {
      total: nodes.length,
      healthy: nodes.filter(n => n.condition === 'nominal').length,
      degraded: nodes.filter(n => n.condition === 'degraded' || n.condition === 'satellite-only').length,
      offline: nodes.filter(n => n.condition === 'offline' || n.condition === 'denied').length,
    };

    return { nodes, routes, healthySummary };
  }

  dispose(): void {
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();
    this.removeAllListeners();
  }
}
