/**
 * Mesh Coordinator - Core Orchestration Engine
 * Manages mesh topology, node lifecycle, and task distribution
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import type {
  AgenticMesh,
  MeshNode,
  MeshEdge,
  MeshTask,
  MeshMessage,
  MeshEvent,
  MeshTopology,
  LoadBalancingStrategy,
  RoutingStrategy,
  AgentRole,
} from '../types/mesh.js';
import { MeshRegistry } from '../registry/MeshRegistry.js';
import { CommunicationFabric } from '../fabric/CommunicationFabric.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';

export interface MeshCoordinatorConfig {
  enableAutoHealing: boolean;
  enableLoadBalancing: boolean;
  enableDynamicTopology: boolean;
  heartbeatIntervalMs: number;
  healthCheckTimeoutMs: number;
  taskTimeoutMs: number;
  maxRetries: number;
}

export class MeshCoordinator extends EventEmitter {
  private meshes: Map<string, AgenticMesh>;
  private tasks: Map<string, MeshTask>;
  private heartbeatIntervals: Map<string, NodeJS.Timeout>;

  constructor(
    private config: MeshCoordinatorConfig,
    private registry: MeshRegistry,
    private fabric: CommunicationFabric,
    private metrics: MetricsCollector
  ) {
    super();
    this.meshes = new Map();
    this.tasks = new Map();
    this.heartbeatIntervals = new Map();

    // Set up event handlers
    this.setupEventHandlers();
  }

  // =========================================================================
  // Mesh Lifecycle Management
  // =========================================================================

  /**
   * Create a new mesh with specified topology and nodes
   */
  async createMesh(params: {
    name: string;
    description?: string;
    topology: MeshTopology;
    nodes: Omit<MeshNode, 'id' | 'createdAt' | 'updatedAt'>[];
    config?: Partial<AgenticMesh['config']>;
    tenantId: string;
    projectId?: string;
    ownerId: string;
  }): Promise<AgenticMesh> {
    const meshId = nanoid();
    const now = new Date();

    // Initialize nodes with IDs
    const nodes: MeshNode[] = params.nodes.map((node) => ({
      ...node,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      lastHeartbeat: now,
      uptime: 0,
      performanceMetrics: {
        tasksCompleted: 0,
        tasksSuccessful: 0,
        tasksFailed: 0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        throughputPerSecond: 0,
        errorRate: 0,
        successRate: 0,
        qualityScore: 100,
      },
      resourceUtilization: {
        cpuPercent: 0,
        memoryPercent: 0,
        diskPercent: 0,
        networkBytesPerSecond: 0,
        queueDepth: 0,
        activeConnections: 0,
      },
      healthStatus: {
        overall: 'healthy',
        checks: [],
        lastCheckAt: now,
      },
    }));

    // Build edges based on topology
    const edges = this.buildTopology(nodes, params.topology);

    // Create mesh
    const mesh: AgenticMesh = {
      id: meshId,
      name: params.name,
      description: params.description,
      topology: params.topology,
      nodes,
      edges,
      config: {
        topologyParams: {},
        maxHops: 10,
        messageTTL: 300,
        timeoutMs: 30000,
        loadBalancingStrategy: 'least-loaded',
        enableFailover: true,
        redundancyFactor: 2,
        healthCheckIntervalMs: 5000,
        maxConcurrentMessages: 1000,
        messageQueueSize: 10000,
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 10,
        enableEncryption: true,
        enableAuthentication: true,
        enableAuthorization: true,
        enableMetrics: true,
        enableTracing: true,
        enableLogging: true,
        metricsIntervalMs: 10000,
        retryPolicy: {
          maxRetries: 3,
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
        },
        ...params.config,
      },
      status: 'initializing',
      phase: 'setup',
      metrics: {
        totalNodes: nodes.length,
        activeNodes: 0,
        healthyNodes: 0,
        degradedNodes: 0,
        failedNodes: 0,
        totalEdges: edges.length,
        averageConnectivity: 0,
        networkDiameter: 0,
        clusteringCoefficient: 0,
        aggregateMetrics: {
          totalTasksCompleted: 0,
          totalTasksSuccessful: 0,
          totalTasksFailed: 0,
          averageLatencyMs: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          totalThroughput: 0,
          errorRate: 0,
          successRate: 0,
        },
        messageStats: {
          totalSent: 0,
          totalReceived: 0,
          totalDropped: 0,
          totalRetried: 0,
          averageSize: 0,
          averageDeliveryTimeMs: 0,
          messageBacklog: 0,
        },
        resourceStats: {
          averageCpuPercent: 0,
          averageMemoryPercent: 0,
          totalNetworkBytesPerSecond: 0,
          bottleneckNodes: [],
        },
        qualityMetrics: {
          dataQuality: 100,
          serviceQuality: 100,
          userSatisfaction: 100,
          complianceScore: 100,
        },
        timestamp: now,
      },
      policies: [],
      tenantId: params.tenantId,
      projectId: params.projectId,
      ownerId: params.ownerId,
      tags: [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    // Store mesh
    this.meshes.set(meshId, mesh);

    // Register with registry
    await this.registry.registerMesh(mesh);

    // Initialize nodes in fabric
    for (const node of nodes) {
      await this.fabric.registerNode(meshId, node);
    }

    // Start mesh
    await this.startMesh(meshId);

    this.emit('mesh-created', mesh);

    return mesh;
  }

  /**
   * Start a mesh (initialize nodes, establish connections)
   */
  async startMesh(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error(`Mesh not found: ${meshId}`);

    mesh.status = 'initializing';
    mesh.phase = 'discovery';

    // Initialize each node
    for (const node of mesh.nodes) {
      await this.initializeNode(meshId, node.id);
    }

    // Establish connections
    await this.establishConnections(meshId);

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring(meshId);

    // Start metrics collection
    await this.metrics.startCollection(meshId);

    mesh.status = 'healthy';
    mesh.phase = 'operational';
    mesh.updatedAt = new Date();

    this.emit('mesh-started', mesh);
  }

  /**
   * Stop a mesh gracefully
   */
  async stopMesh(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error(`Mesh not found: ${meshId}`);

    mesh.phase = 'teardown';

    // Stop heartbeat monitoring
    this.stopHeartbeatMonitoring(meshId);

    // Stop metrics collection
    await this.metrics.stopCollection(meshId);

    // Disconnect all nodes
    for (const node of mesh.nodes) {
      await this.fabric.unregisterNode(meshId, node.id);
    }

    mesh.status = 'offline';
    mesh.updatedAt = new Date();

    this.emit('mesh-stopped', mesh);
  }

  /**
   * Delete a mesh and clean up resources
   */
  async deleteMesh(meshId: string): Promise<void> {
    await this.stopMesh(meshId);

    const mesh = this.meshes.get(meshId);
    if (mesh) {
      mesh.deletedAt = new Date();
      await this.registry.unregisterMesh(meshId);
    }

    this.meshes.delete(meshId);
    this.emit('mesh-deleted', { meshId });
  }

  // =========================================================================
  // Node Management
  // =========================================================================

  /**
   * Initialize a node in the mesh
   */
  private async initializeNode(meshId: string, nodeId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error(`Mesh not found: ${meshId}`);

    const node = mesh.nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    node.status = 'initializing';

    // Perform health check
    const healthy = await this.performHealthCheck(meshId, nodeId);

    if (healthy) {
      node.status = 'ready';
      node.lastHeartbeat = new Date();
      this.emit('node-ready', { meshId, nodeId, node });
    } else {
      node.status = 'failed';
      this.emit('node-failed', { meshId, nodeId, node });
    }

    mesh.updatedAt = new Date();
  }

  /**
   * Add a node to an existing mesh
   */
  async addNode(
    meshId: string,
    nodeData: Omit<MeshNode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MeshNode> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error(`Mesh not found: ${meshId}`);

    const now = new Date();
    const node: MeshNode = {
      ...nodeData,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
      lastHeartbeat: now,
      uptime: 0,
      performanceMetrics: {
        tasksCompleted: 0,
        tasksSuccessful: 0,
        tasksFailed: 0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        throughputPerSecond: 0,
        errorRate: 0,
        successRate: 0,
        qualityScore: 100,
      },
      resourceUtilization: {
        cpuPercent: 0,
        memoryPercent: 0,
        diskPercent: 0,
        networkBytesPerSecond: 0,
        queueDepth: 0,
        activeConnections: 0,
      },
      healthStatus: {
        overall: 'healthy',
        checks: [],
        lastCheckAt: now,
      },
    };

    mesh.nodes.push(node);
    await this.fabric.registerNode(meshId, node);
    await this.initializeNode(meshId, node.id);

    // Update topology if dynamic
    if (this.config.enableDynamicTopology) {
      await this.updateTopology(meshId);
    }

    mesh.updatedAt = now;
    this.emit('node-added', { meshId, node });

    return node;
  }

  /**
   * Remove a node from the mesh
   */
  async removeNode(meshId: string, nodeId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) throw new Error(`Mesh not found: ${meshId}`);

    const nodeIndex = mesh.nodes.findIndex((n) => n.id === nodeId);
    if (nodeIndex === -1) throw new Error(`Node not found: ${nodeId}`);

    const node = mesh.nodes[nodeIndex];

    // Remove from fabric
    await this.fabric.unregisterNode(meshId, nodeId);

    // Remove from mesh
    mesh.nodes.splice(nodeIndex, 1);

    // Remove edges connected to this node
    mesh.edges = mesh.edges.filter(
      (e) => e.sourceId !== nodeId && e.targetId !== nodeId
    );

    mesh.updatedAt = new Date();
    this.emit('node-removed', { meshId, nodeId, node });
  }

  // =========================================================================
  // Topology Management
  // =========================================================================

  /**
   * Build mesh topology based on type
   */
  private buildTopology(nodes: MeshNode[], topology: MeshTopology): MeshEdge[] {
    const edges: MeshEdge[] = [];

    switch (topology) {
      case 'peer-to-peer':
        return this.buildFullMesh(nodes);

      case 'hierarchical':
        return this.buildHierarchical(nodes);

      case 'star':
        return this.buildStar(nodes);

      case 'ring':
        return this.buildRing(nodes);

      case 'grid':
        return this.buildGrid(nodes);

      case 'hybrid':
        return this.buildHybrid(nodes);

      case 'custom':
        // Custom topology defined by user
        return [];

      default:
        return this.buildFullMesh(nodes);
    }
  }

  /**
   * Full mesh - every node connected to every other node
   */
  private buildFullMesh(nodes: MeshNode[]): MeshEdge[] {
    const edges: MeshEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push(this.createEdge(nodes[i].id, nodes[j].id, true));
      }
    }

    return edges;
  }

  /**
   * Hierarchical topology - tree structure
   */
  private buildHierarchical(nodes: MeshNode[]): MeshEdge[] {
    const edges: MeshEdge[] = [];

    // Find coordinators and workers
    const coordinators = nodes.filter((n) => n.role === 'coordinator');
    const workers = nodes.filter((n) => n.role !== 'coordinator');

    if (coordinators.length === 0) {
      // No coordinators, promote first node
      coordinators.push(nodes[0]);
    }

    // Connect workers to coordinators
    workers.forEach((worker, index) => {
      const coordinator = coordinators[index % coordinators.length];
      edges.push(this.createEdge(coordinator.id, worker.id, false));
    });

    // Connect coordinators to each other
    for (let i = 0; i < coordinators.length - 1; i++) {
      edges.push(
        this.createEdge(coordinators[i].id, coordinators[i + 1].id, true)
      );
    }

    return edges;
  }

  /**
   * Star topology - central hub with spokes
   */
  private buildStar(nodes: MeshNode[]): MeshEdge[] {
    const edges: MeshEdge[] = [];

    // Find hub (first coordinator or first node)
    const hub =
      nodes.find((n) => n.role === 'coordinator') || nodes[0];

    // Connect all other nodes to hub
    nodes.forEach((node) => {
      if (node.id !== hub.id) {
        edges.push(this.createEdge(hub.id, node.id, false));
      }
    });

    return edges;
  }

  /**
   * Ring topology - circular connections
   */
  private buildRing(nodes: MeshNode[]): MeshEdge[] {
    const edges: MeshEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const nextIndex = (i + 1) % nodes.length;
      edges.push(this.createEdge(nodes[i].id, nodes[nextIndex].id, false));
    }

    return edges;
  }

  /**
   * Grid topology - 2D mesh
   */
  private buildGrid(nodes: MeshNode[]): MeshEdge[] {
    const edges: MeshEdge[] = [];
    const gridSize = Math.ceil(Math.sqrt(nodes.length));

    for (let i = 0; i < nodes.length; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;

      // Connect to right neighbor
      if (col < gridSize - 1 && i + 1 < nodes.length) {
        edges.push(this.createEdge(nodes[i].id, nodes[i + 1].id, true));
      }

      // Connect to bottom neighbor
      if (row < gridSize - 1 && i + gridSize < nodes.length) {
        edges.push(
          this.createEdge(nodes[i].id, nodes[i + gridSize].id, true)
        );
      }
    }

    return edges;
  }

  /**
   * Hybrid topology - combination of patterns
   */
  private buildHybrid(nodes: MeshNode[]): MeshEdge[] {
    // Hierarchical for coordinators, P2P for workers
    const coordinators = nodes.filter((n) => n.role === 'coordinator');
    const workers = nodes.filter((n) => n.role !== 'coordinator');

    const coordinatorEdges = this.buildFullMesh(coordinators);
    const workerEdges = this.buildHierarchical(workers);

    return [...coordinatorEdges, ...workerEdges];
  }

  /**
   * Create an edge between two nodes
   */
  private createEdge(
    sourceId: string,
    targetId: string,
    bidirectional: boolean
  ): MeshEdge {
    return {
      id: nanoid(),
      sourceId,
      targetId,
      protocol: 'request-response',
      bidirectional,
      weight: 1,
      latencyMs: 0,
      bandwidth: 0,
      reliability: 1.0,
      metadata: {},
    };
  }

  /**
   * Update topology dynamically
   */
  private async updateTopology(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return;

    // Rebuild edges based on current topology type
    mesh.edges = this.buildTopology(mesh.nodes, mesh.topology);
    mesh.updatedAt = new Date();

    this.emit('topology-updated', { meshId, mesh });
  }

  /**
   * Establish connections between nodes
   */
  private async establishConnections(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return;

    for (const edge of mesh.edges) {
      await this.fabric.establishConnection(meshId, edge);
    }
  }

  // =========================================================================
  // Task Distribution & Execution
  // =========================================================================

  /**
   * Submit a task to the mesh
   */
  async submitTask(params: {
    meshId: string;
    type: string;
    name: string;
    description?: string;
    payload: Record<string, unknown>;
    targetNodes?: string[];
    routingStrategy?: RoutingStrategy;
    priority?: number;
    dependencies?: string[];
  }): Promise<MeshTask> {
    const mesh = this.meshes.get(params.meshId);
    if (!mesh) throw new Error(`Mesh not found: ${params.meshId}`);

    const taskId = nanoid();
    const now = new Date();

    const task: MeshTask = {
      id: taskId,
      meshId: params.meshId,
      type: params.type as any,
      name: params.name,
      description: params.description,
      payload: params.payload,
      targetNodes: params.targetNodes,
      routingStrategy: params.routingStrategy || 'least-loaded',
      status: 'pending',
      priority: params.priority || 50,
      createdAt: now,
      dependencies: params.dependencies || [],
      dependents: [],
      retries: 0,
      maxRetries: this.config.maxRetries,
      tags: [],
      metadata: {},
    };

    this.tasks.set(taskId, task);

    // Route task to appropriate node(s)
    await this.routeTask(task);

    this.emit('task-submitted', task);

    return task;
  }

  /**
   * Route a task to appropriate node(s)
   */
  private async routeTask(task: MeshTask): Promise<void> {
    const mesh = this.meshes.get(task.meshId);
    if (!mesh) throw new Error(`Mesh not found: ${task.meshId}`);

    let targetNode: MeshNode | null = null;

    // If specific nodes are targeted
    if (task.targetNodes && task.targetNodes.length > 0) {
      const nodes = mesh.nodes.filter((n) =>
        task.targetNodes!.includes(n.id)
      );
      targetNode = this.selectNode(nodes, task.routingStrategy);
    } else {
      // Select from all available nodes
      const availableNodes = mesh.nodes.filter(
        (n) => n.status === 'ready' || n.status === 'idle'
      );
      targetNode = this.selectNode(availableNodes, task.routingStrategy);
    }

    if (!targetNode) {
      task.status = 'failed';
      task.error = {
        code: 'NO_AVAILABLE_NODE',
        message: 'No available node to execute task',
        retryable: true,
        timestamp: new Date(),
      };
      this.emit('task-failed', task);
      return;
    }

    // Assign task to node
    task.assignedTo = targetNode.id;
    task.status = 'assigned';

    // Send task to node via fabric
    await this.fabric.sendMessage(task.meshId, {
      id: nanoid(),
      type: 'task-assignment',
      sourceId: 'coordinator',
      targetId: targetNode.id,
      protocol: 'request-response',
      payload: { task },
      timestamp: new Date(),
      ttl: mesh.config.messageTTL,
      priority: task.priority,
      hops: 0,
      route: [],
      delivered: false,
      acknowledged: false,
    });

    this.emit('task-assigned', { task, nodeId: targetNode.id });
  }

  /**
   * Select a node based on routing strategy
   */
  private selectNode(
    nodes: MeshNode[],
    strategy: RoutingStrategy
  ): MeshNode | null {
    if (nodes.length === 0) return null;

    switch (strategy) {
      case 'random':
        return nodes[Math.floor(Math.random() * nodes.length)];

      case 'round-robin':
        // Simple round-robin (would need state for true RR)
        return nodes[0];

      case 'least-loaded':
        return nodes.reduce((least, node) =>
          node.resourceUtilization.queueDepth <
          least.resourceUtilization.queueDepth
            ? node
            : least
        );

      case 'capability-match':
        // Would match based on required capabilities
        return nodes[0];

      default:
        return nodes[0];
    }
  }

  // =========================================================================
  // Health Monitoring
  // =========================================================================

  /**
   * Start heartbeat monitoring for all nodes in mesh
   */
  private startHeartbeatMonitoring(meshId: string): void {
    const interval = setInterval(async () => {
      await this.performHealthChecks(meshId);
    }, this.config.heartbeatIntervalMs);

    this.heartbeatIntervals.set(meshId, interval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(meshId: string): void {
    const interval = this.heartbeatIntervals.get(meshId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(meshId);
    }
  }

  /**
   * Perform health checks on all nodes
   */
  private async performHealthChecks(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return;

    for (const node of mesh.nodes) {
      await this.performHealthCheck(meshId, node.id);
    }

    // Update mesh metrics
    await this.updateMeshMetrics(meshId);
  }

  /**
   * Perform health check on a specific node
   */
  private async performHealthCheck(
    meshId: string,
    nodeId: string
  ): Promise<boolean> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return false;

    const node = mesh.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    try {
      // Send health check via fabric
      const healthy = await this.fabric.healthCheck(meshId, nodeId);

      if (healthy) {
        node.lastHeartbeat = new Date();
        if (node.status === 'failed' || node.status === 'degraded') {
          node.status = 'ready';
          this.emit('node-recovered', { meshId, nodeId });
        }
      } else {
        if (node.status !== 'failed') {
          node.status = 'degraded';
          this.emit('node-degraded', { meshId, nodeId });
        }
      }

      node.healthStatus.lastCheckAt = new Date();
      return healthy;
    } catch (error) {
      node.status = 'failed';
      this.emit('node-failed', { meshId, nodeId, error });
      return false;
    }
  }

  /**
   * Update mesh-level metrics
   */
  private async updateMeshMetrics(meshId: string): Promise<void> {
    const mesh = this.meshes.get(meshId);
    if (!mesh) return;

    mesh.metrics.activeNodes = mesh.nodes.filter(
      (n) => n.status !== 'offline' && n.status !== 'failed'
    ).length;
    mesh.metrics.healthyNodes = mesh.nodes.filter(
      (n) => n.status === 'ready' || n.status === 'idle'
    ).length;
    mesh.metrics.degradedNodes = mesh.nodes.filter(
      (n) => n.status === 'degraded'
    ).length;
    mesh.metrics.failedNodes = mesh.nodes.filter(
      (n) => n.status === 'failed'
    ).length;

    mesh.metrics.timestamp = new Date();
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private setupEventHandlers(): void {
    this.fabric.on('message-delivered', (data) => {
      this.handleMessageDelivered(data);
    });

    this.fabric.on('connection-failed', (data) => {
      this.handleConnectionFailed(data);
    });
  }

  private handleMessageDelivered(data: any): void {
    // Handle task results, status updates, etc.
    if (data.message.type === 'task-result') {
      const { taskId, result } = data.message.payload;
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date();
        task.durationMs =
          task.completedAt.getTime() - task.createdAt.getTime();
        this.emit('task-completed', task);
      }
    }
  }

  private handleConnectionFailed(data: any): void {
    const { meshId, nodeId } = data;
    this.emit('connection-failed', { meshId, nodeId });

    if (this.config.enableAutoHealing) {
      this.attemptAutoHealing(meshId, nodeId);
    }
  }

  private async attemptAutoHealing(
    meshId: string,
    nodeId: string
  ): Promise<void> {
    // Auto-healing logic
    this.emit('auto-healing-started', { meshId, nodeId });
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  getMesh(meshId: string): AgenticMesh | undefined {
    return this.meshes.get(meshId);
  }

  getAllMeshes(): AgenticMesh[] {
    return Array.from(this.meshes.values());
  }

  getTask(taskId: string): MeshTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(meshId?: string): MeshTask[] {
    const tasks = Array.from(this.tasks.values());
    return meshId ? tasks.filter((t) => t.meshId === meshId) : tasks;
  }
}
