/**
 * Multi-Agent Collaboration Workflows System
 * 
 * Implements standardized protocols for agent-to-agent communication,
 * shared workspace management, conflict resolution, and handoff mechanisms
 * as specified in the agentic roadmap.
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import { trackError } from '../monitoring/middleware.js';

interface AgentMessage {
  id: string;
  type: 'task-assigned' | 'task-completed' | 'task-failed' | 'request-help' | 'share-artifact' | 'request-state' | 'acknowledge' | 'reject' | 'escalate';
  sourceAgent: string;
  targetAgent?: string; // If undefined, broadcast to all agents
  timestamp: string;
  payload: any;
  correlationId: string; // Links related messages
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface SharedArtifact {
  id: string;
  name: string;
  type: 'code' | 'report' | 'analysis' | 'data' | 'model' | 'config';
  content: any;
  ownerAgent: string;
  createdAt: string;
  lastModified: string;
  version: number;
  permissions: 'read' | 'write' | 'read-write';
  metadata: Record<string, any>; // Additional context like confidence, source, etc.
}

interface CollaborationWorkspace {
  id: string;
  name: string;
  participants: string[]; // Agent IDs
  artifacts: SharedArtifact[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  lastActivity: string;
  config: {
    conflictResolutionStrategy: 'majority-vote' | 'hierarchical' | 'weighted' | 'first-writer' | 'human-verification';
    consensusThreshold: number; // For voting strategies (0.0 - 1.0)
    timeoutMs: number;
    escalationThreshold: number;
  };
}

interface AgentTask {
  id: string;
  type: string;
  input: any;
  assignedAgent: string;
  status: 'assigned' | 'in-progress' | 'completed' | 'failed' | 'escalated';
  output?: any;
  error?: string;
  assignedAt: string;
  completedAt?: string;
  dependencies: string[]; // Task IDs that must complete first
  priority: number;
}

interface ConflictResolutionResult {
  resolved: boolean;
  resolution: any;
  strategy: string;
  agentVotes: Array<{ agentId: string; vote: any; confidence: number }>;
  winner: string;
}

/**
 * Multi-Agent Collaboration Manager
 * Coordinates communication, shared state, and collaboration between agents
 */
export class MultiAgentCollaborationManager extends EventEmitter {
  private messageQueue: AgentMessage[];
  private workspaces: Map<string, CollaborationWorkspace>;
  private artifacts: Map<string, SharedArtifact>;
  private pendingTasks: Map<string, AgentTask>;
  private agentRegistry: Map<string, { status: string; capabilities: string[]; lastSeen: string }>;
  private conflictResolver: ConflictResolutionEngine;

  constructor() {
    super();
    this.messageQueue = [];
    this.workspaces = new Map();
    this.artifacts = new Map();
    this.pendingTasks = new Map();
    this.agentRegistry = new Map();
    this.conflictResolver = new ConflictResolutionEngine();
    
    this.initializeMessageProcessor();
    
    logger.info('Multi-Agent Collaboration Manager initialized');
  }

  /**
   * Create a new collaborative workspace for agents
   */
  createCollaborationWorkspace(
    name: string,
    participants: string[],
    config?: Partial<CollaborationWorkspace['config']>
  ): CollaborationWorkspace {
    const workspace: CollaborationWorkspace = {
      id: crypto.randomUUID(),
      name,
      participants,
      artifacts: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      config: {
        conflictResolutionStrategy: config?.conflictResolutionStrategy || 'majority-vote',
        consensusThreshold: config?.consensusThreshold || 0.6,
        timeoutMs: config?.timeoutMs || 30000,
        escalationThreshold: config?.escalationThreshold || 3
      }
    };

    this.workspaces.set(workspace.id, workspace);
    
    // Register agents in the workspace
    for (const agentId of participants) {
      if (!this.agentRegistry.has(agentId)) {
        this.agentRegistry.set(agentId, {
          status: 'registered',
          capabilities: [],
          lastSeen: new Date().toISOString()
        });
      }
    }

    this.emit('workspaceCreated', workspace.id);

    logger.info({
      workspaceId: workspace.id,
      participants,
      config: workspace.config
    }, 'Collaboration workspace created');

    return workspace;
  }

  /**
   * Share an artifact in a workspace
   */
  shareArtifact(
    workspaceId: string,
    artifact: Omit<SharedArtifact, 'id' | 'createdAt' | 'lastModified' | 'version'>
  ): SharedArtifact | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      logger.error({ workspaceId }, 'Workspace not found for artifact sharing');
      return null;
    }

    const artifactEntry: SharedArtifact = {
      id: crypto.randomUUID(),
      ...artifact,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: 1
    };

    workspace.artifacts.push(artifactEntry);
    workspace.lastActivity = new Date().toISOString();
    this.artifacts.set(artifactEntry.id, artifactEntry);

    // Notify all agents in the workspace
    this.broadcastMessage(workspaceId, {
      id: crypto.randomUUID(),
      type: 'share-artifact',
      sourceAgent: artifact.ownerAgent,
      timestamp: new Date().toISOString(),
      payload: { artifact: artifactEntry },
      correlationId: workspaceId,
      priority: 'normal'
    });

    logger.info({
      workspaceId,
      artifactId: artifactEntry.id,
      artifactName: artifactEntry.name,
      owner: artifact.ownerAgent
    }, 'Artifact shared in collaboration workspace');

    return artifactEntry;
  }

  /**
   * Retrieve artifact from workspace
   */
  getArtifact(artifactId: string, requesterAgentId: string): SharedArtifact | null {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      logger.warn({ artifactId, requesterAgentId }, 'Artifact not found');
      return null;
    }

    // Check permissions
    if (artifact.permissions === 'write' || 
        (artifact.permissions === 'read-write' && !this.canAgentRead(requesterAgentId))) {
      logger.warn({
        artifactId,
        requesterAgentId,
        requiredPermission: 'read'
      }, 'Agent lacks permission to read artifact');
      return null;
    }

    return artifact;
  }

  /**
   * Register an agent in the collaboration system
   */
  registerAgent(agentId: string, capabilities: string[]): boolean {
    if (this.agentRegistry.has(agentId)) {
      logger.warn({ agentId }, 'Agent already registered, updating capabilities');
      const existing = this.agentRegistry.get(agentId)!;
      this.agentRegistry.set(agentId, {
        ...existing,
        capabilities: [...new Set([...existing.capabilities, ...capabilities])],
        lastSeen: new Date().toISOString()
      });
    } else {
      this.agentRegistry.set(agentId, {
        status: 'online',
        capabilities,
        lastSeen: new Date().toISOString()
      });

      logger.info({ agentId, capabilities }, 'Agent registered in collaboration system');
    }

    // Broadcast agent registration to all workspaces
    for (const [workspaceId, workspace] of this.workspaces.entries()) {
      if (workspace.participants.includes(agentId) && workspace.status === 'active') {
        this.broadcastMessage(workspaceId, {
          id: crypto.randomUUID(),
          type: 'acknowledge',
          sourceAgent: 'system',
          timestamp: new Date().toISOString(),
          payload: { agentId, status: 'registered' },
          correlationId: workspaceId,
          priority: 'normal'
        });
      }
    }

    return true;
  }

  /**
   * Send a message to specific agent or broadcast to workspace
   */
  sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    if (message.targetAgent) {
      // Direct message to specific agent
      this.processDirectMessage(fullMessage);
    } else {
      // Broadcast to all agents in the specified workspace (correlationId)
      this.processBroadcastMessage(fullMessage);
    }

    logger.debug({
      messageId: fullMessage.id,
      messageType: fullMessage.type,
      source: fullMessage.sourceAgent,
      target: fullMessage.targetAgent,
      correlationId: fullMessage.correlationId
    }, 'Agent message processed');

    return true;
  }

  /**
   * Process direct agent-to-agent message
   */
  private processDirectMessage(message: AgentMessage): void {
    const targetAgent = this.agentRegistry.get(message.targetAgent!);
    if (!targetAgent) {
      logger.warn({
        targetAgent: message.targetAgent,
        sourceAgent: message.sourceAgent,
        messageType: message.type
      }, 'Target agent not found for direct message');
      return;
    }

    // Add to message queue for target agent
    this.messageQueue.push(message);
    this.emit(`message_${message.targetAgent}`, message);
  }

  /**
   * Process broadcast message to workspace participants
   */
  private processBroadcastMessage(message: AgentMessage): void {
    const workspace = this.workspaces.get(message.correlationId);
    if (!workspace) {
      logger.warn({
        workspaceId: message.correlationId,
        sourceAgent: message.sourceAgent
      }, 'Workspace not found for broadcast message');
      return;
    }

    // Send to all participants except sender
    for (const participant of workspace.participants) {
      if (participant !== message.sourceAgent) {
        const broadcastMessage: AgentMessage = {
          ...message,
          targetAgent: participant
        };

        this.messageQueue.push(broadcastMessage);
        this.emit(`message_${participant}`, broadcastMessage);
      }
    }
  }

  /**
   * Assign a task to an appropriate agent based on capabilities and load
   */
  assignTask(
    workspaceId: string,
    task: Omit<AgentTask, 'id' | 'assignedAt' | 'status'>,
    preferredAgent?: string
  ): AgentTask | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      logger.error({ workspaceId }, 'Workspace not found for task assignment');
      return null;
    }

    // Find suitable agent based on capabilities and availability
    let selectedAgent = preferredAgent || this.findBestAgent(task.type, workspace.participants);

    if (!selectedAgent) {
      logger.warn({
        workspaceId,
        taskType: task.type,
        participants: workspace.participants
      }, 'No suitable agent found for task assignment');
      return null;
    }

    const assignedTask: AgentTask = {
      ...task,
      id: crypto.randomUUID(),
      assignedAgent: selectedAgent,
      status: 'assigned',
      assignedAt: new Date().toISOString()
    };

    this.pendingTasks.set(assignedTask.id, assignedTask);

    // Send assignment message to selected agent
    this.sendMessage({
      type: 'task-assigned',
      sourceAgent: 'system',
      targetAgent: selectedAgent,
      payload: { task: assignedTask },
      correlationId: workspaceId,
      priority: task.priority > 5 ? 'high' : 'normal'
    });

    workspace.lastActivity = new Date().toISOString();

    logger.info({
      taskId: assignedTask.id,
      taskType: task.type,
      assignedAgent: selectedAgent,
      workspaceId
    }, 'Task assigned to agent');

    return assignedTask;
  }

  /**
   * Find the best agent for a task based on capabilities and current load
   */
  private findBestAgent(taskType: string, candidates: string[]): string | null {
    // Filter agents by capability
    const capableAgents = candidates.filter(agentId => {
      const agent = this.agentRegistry.get(agentId);
      return agent?.capabilities.includes(taskType) || agent?.capabilities.includes('universal');
    });

    if (capableAgents.length === 0) {
      return null;
    }

    // Select agent with lowest current workload
    let bestAgent = null;
    let lowestLoad = Infinity;

    for (const agentId of capableAgents) {
      const currentLoad = this.getAgentWorkload(agentId);
      if (currentLoad < lowestLoad) {
        lowestLoad = currentLoad;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  /**
   * Process task completion from an agent
   */
  completeTask(taskId: string, agentId: string, result: any): boolean {
    const task = this.pendingTasks.get(taskId);
    if (!task) {
      logger.error({ taskId, agentId }, 'Task not found for completion');
      return false;
    }

    if (task.assignedAgent !== agentId) {
      logger.warn({
        taskId,
        agentId,
        assignedTo: task.assignedAgent
      }, 'Agent completing task not assigned to it');
      return false;
    }

    task.status = 'completed';
    task.output = result;
    task.completedAt = new Date().toISOString();

    // Update workspace
    const workspace = this.workspaces.get(task.id.split('-')[0]); // Extract workspace ID from task ID
    if (workspace) {
      workspace.lastActivity = new Date().toISOString();
    }

    // Notify dependent tasks that this prerequisite is complete
    for (const [otherTaskId, otherTask] of this.pendingTasks.entries()) {
      if (otherTask.dependencies.includes(taskId)) {
        this.checkTaskReadiness(otherTaskId);
      }
    }

    logger.info({
      taskId,
      agentId,
      resultSummary: typeof result === 'object' ? Object.keys(result) : typeof result
    }, 'Task completed by agent');

    return true;
  }

  /**
   * Handle task failure
   */
  failTask(taskId: string, agentId: string, error: string): boolean {
    const task = this.pendingTasks.get(taskId);
    if (!task) {
      logger.error({ taskId, agentId }, 'Task not found for failure handling');
      return false;
    }

    if (task.assignedAgent !== agentId) {
      logger.warn({
        taskId,
        agentId,
        assignedTo: task.assignedAgent
      }, 'Agent failing task not assigned to it');
      return false;
    }

    task.status = 'failed';
    task.error = error;
    task.completedAt = new Date().toISOString();

    // Update workspace
    const workspace = this.workspaces.get(task.id.split('-')[0]);
    if (workspace) {
      workspace.lastActivity = new Date().toISOString();
    }

    // Process any failure handling strategies
    this.handleTaskFailure(task);

    logger.warn({
      taskId,
      agentId,
      error
    }, 'Task failed, initiating failure handling');

    return true;
  }

  /**
   * Handle task failure with appropriate escalation
   */
  private handleTaskFailure(task: AgentTask): void {
    // Attempt to reassign to another agent if possible
    const workspace = Array.from(this.workspaces.values()).find(ws => ws.participants.includes(task.assignedAgent));
    if (workspace) {
      // Try to find an alternate agent
      const otherAgents = workspace.participants.filter(agentId => agentId !== task.assignedAgent);
      if (otherAgents.length > 0) {
        const alternateAgent = this.findBestAgentForTask(task.type, otherAgents);
        if (alternateAgent) {
          logger.info({
            taskId: task.id,
            originalAgent: task.assignedAgent,
            replacementAgent: alternateAgent
          }, 'Reassigning failed task to alternate agent');
          
          // Reassign task logic would go here
        }
      }

      // If no alternate possible, escalate to human
      if (task.status === 'failed') {
        this.escalateToHuman(task);
      }
    }
  }

  /**
   * Escalate task failure to human operator
   */
  private escalateToHuman(task: AgentTask): void {
    this.emit('taskEscalation', {
      taskId: task.id,
      task: task,
      escalationReason: task.error || 'Automatic escalation after failure'
    });

    logger.warn({
      taskId: task.id,
      taskType: task.type,
      error: task.error
    }, 'Task escalated to human operator');
  }

  /**
   * Resolve conflicts between agent outputs
   */
  async resolveConflict(
    workspaceId: string,
    conflictingArtifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): Promise<ConflictResolutionResult | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      logger.error({ workspaceId }, 'Workspace not found for conflict resolution');
      return null;
    }

    const result = await this.conflictResolver.resolve(
      workspace.config.conflictResolutionStrategy,
      workspace.config.consensusThreshold,
      conflictingArtifacts
    );

    if (result.resolved) {
      // Store resolved artifact
      const resolvedArtifact = {
        id: crypto.randomUUID(),
        name: `resolved-${conflictingArtifacts[0].artifact.name}`,
        type: conflictingArtifacts[0].artifact.type,
        content: result.resolution,
        ownerAgent: 'system-conflict-resolver',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: 1,
        permissions: 'read-write',
        metadata: {
          resolutionStrategy: result.strategy,
          originalVersions: conflictingArtifacts.map(ca => ca.artifact.version),
          votes: conflictingArtifacts.map(ca => ({
            agentId: ca.agentId,
            confidence: ca.confidence
          }))
        }
      } as SharedArtifact;

      await this.shareArtifact(workspaceId, resolvedArtifact);

      logger.info({
        workspaceId,
        conflictResolutionStrategy: result.strategy,
        conflictingArtifactsCount: conflictingArtifacts.length,
        resolvedArtifactId: resolvedArtifact.id
      }, 'Conflict resolved successfully');
    }

    return result;
  }

  /**
   * Get current workload for an agent
   */
  private getAgentWorkload(agentId: string): number {
    return Array.from(this.pendingTasks.values())
      .filter(task => task.assignedAgent === agentId && task.status !== 'completed')
      .length;
  }

  /**
   * Initialize message processing and cleanup
   */
  private initializeMessageProcessor(): void {
    // Process messages in queue
    setInterval(() => {
      // Cleanup old messages (older than 1 hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      this.messageQueue = this.messageQueue.filter(msg => 
        new Date(msg.timestamp).getTime() > oneHourAgo
      );
    }, 300000); // Every 5 minutes
  }

  /**
   * Get collaboration workspace status
   */
  getWorkspaceStatus(workspaceId: string): CollaborationWorkspace | null {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * Get active collaborations for an agent
   */
  getActiveCollaborations(agentId: string): string[] {
    return Array.from(this.workspaces.entries())
      .filter(([_, workspace]) => 
        workspace.participants.includes(agentId) && workspace.status === 'active'
      )
      .map(([id, _]) => id);
  }

  /**
   * End collaboration workspace
   */
  endWorkspace(workspaceId: string, reason: string = 'Manual termination'): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return false;
    }

    workspace.status = 'completed';
    
    this.emit('workspaceEnded', {
      workspaceId,
      reason,
      finalStatus: workspace
    });

    logger.info({
      workspaceId,
      reason,
      participantCount: workspace.participants.length
    }, 'Collaboration workspace completed');

    return true;
  }
}

/**
 * Conflict Resolution Engine
 * Implements various strategies for resolving disagreements between agents
 */
class ConflictResolutionEngine {
  /**
   * Resolve conflicts based on configured strategy
   */
  async resolve(
    strategy: 'majority-vote' | 'hierarchical' | 'weighted' | 'first-writer' | 'human-verification',
    threshold: number,
    conflictingArtifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): Promise<ConflictResolutionResult> {
    switch (strategy) {
      case 'majority-vote':
        return this.majorityVoteResolution(conflictingArtifacts, threshold);

      case 'hierarchical':
        return this.hierarchicalResolution(conflictingArtifacts);

      case 'weighted':
        return this.weightedResolution(conflictingArtifacts);

      case 'first-writer':
        return this.firstWriterResolution(conflictingArtifacts);

      case 'human-verification':
        return this.humanVerificationResolution(conflictingArtifacts);
        
      default:
        return this.majorityVoteResolution(conflictingArtifacts, threshold);
    }
  }

  /**
   * Majority vote resolution strategy
   */
  private majorityVoteResolution(
    artifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>,
    threshold: number
  ): ConflictResolutionResult {
    // Group similar results together based on content similarity
    const groups: Map<string, typeof artifacts> = new Map();
    
    for (const item of artifacts) {
      const contentHash = this.hashContent(item.artifact.content);
      
      if (!groups.has(contentHash)) {
        groups.set(contentHash, []);
      }
      groups.get(contentHash)!.push(item);
    }
    
    // Find the largest group
    let largestGroup: typeof artifacts = [];
    for (const group of groups.values()) {
      if (group.length > largestGroup.length) {
        largestGroup = group;
      }
    }
    
    const totalConfidence = artifacts.reduce((sum, item) => sum + item.confidence, 0);
    const winningConfidence = largestGroup.reduce((sum, item) => sum + item.confidence, 0);
    
    const resolved = winningConfidence / totalConfidence >= threshold;
    
    return {
      resolved,
      resolution: largestGroup[0].artifact.content,
      strategy: 'majority-vote',
      agentVotes: artifacts.map(item => ({
        agentId: item.agentId,
        vote: item.artifact.content,
        confidence: item.confidence
      })),
      winner: largestGroup[0].agentId
    };
  }

  /**
   * Hierarchical resolution based on agent authority levels
   */
  private hierarchicalResolution(
    artifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): ConflictResolutionResult {
    // In a real system, this would use agent authority levels
    // For now, simulate authority resolution
    const orderedArtifacts = [...artifacts].sort((a, b) => {
      // Sort by some authority factor (simulated)
      const authorityA = this.getAgentAuthority(a.agentId);
      const authorityB = this.getAgentAuthority(b.agentId);
      return authorityB - authorityA; // Descending order
    });
    
    return {
      resolved: true,
      resolution: orderedArtifacts[0].artifact.content,
      strategy: 'hierarchical',
      agentVotes: artifacts.map(item => ({
        agentId: item.agentId,
        vote: item.artifact.content,
        confidence: item.confidence
      })),
      winner: orderedArtifacts[0].agentId
    };
  }

  /**
   * Weighted resolution based on agent reputation/confidence
   */
  private weightedResolution(
    artifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): ConflictResolutionResult {
    // Calculate weighted average of all artifact contents
    // This is a simplified approach - in reality would be more complex depending on data type
    const totalWeight = artifacts.reduce((sum, item) => sum + item.confidence, 0);
    const weightedValue = artifacts.reduce((sum, item) => sum + (this.getValueFromContent(item.artifact.content) * item.confidence), 0) / totalWeight;
    
    return {
      resolved: true,
      resolution: weightedValue,
      strategy: 'weighted',
      agentVotes: artifacts.map(item => ({
        agentId: item.agentId,
        vote: item.artifact.content,
        confidence: item.confidence
      })),
      winner: artifacts[0].agentId // Placeholder - in weighted resolution all contribute
    };
  }

  /**
   * First-writer wins resolution strategy
   */
  private firstWriterResolution(
    artifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): ConflictResolutionResult {
    // Sort by creation time and take the first one
    const orderedArtifacts = [...artifacts].sort((a, b) => {
      const timeA = new Date(a.artifact.createdAt).getTime();
      const timeB = new Date(b.artifact.createdAt).getTime();
      return timeA - timeB; // Ascending (earlier first)
    });
    
    return {
      resolved: true,
      resolution: orderedArtifacts[0].artifact.content,
      strategy: 'first-writer',
      agentVotes: artifacts.map(item => ({
        agentId: item.agentId,
        vote: item.artifact.content,
        confidence: item.confidence
      })),
      winner: orderedArtifacts[0].agentId
    };
  }

  /**
   * Human verification for complex conflicts
   */
  private humanVerificationResolution(
    artifacts: Array<{ agentId: string; artifact: SharedArtifact; confidence: number }>
  ): ConflictResolutionResult {
    // In real system, this would create a human verification task
    // For simulation, return the highest confidence result
    
    const highestConfidenceItem = artifacts.reduce((prev, current) => 
      (prev.confidence > current.confidence) ? prev : current
    );
    
    return {
      resolved: true, // Will be resolved when human reviews
      resolution: highestConfidenceItem.artifact.content,
      strategy: 'human-verification',
      agentVotes: artifacts.map(item => ({
        agentId: item.agentId,
        vote: item.artifact.content,
        confidence: item.confidence
      })),
      winner: highestConfidenceItem.agentId
    };
  }

  /**
   * Get agent authority level (simplified simulation)
   */
  private getAgentAuthority(agentId: string): number {
    // In a real system, this would come from an authority registry
    // For now, simulate based on agent ID patterns
    if (agentId.includes('lead') || agentId.includes('senior')) return 10;
    if (agentId.includes('expert') || agentId.includes('specialist')) return 8;
    return 5; // Default authority
  }

  /**
   * Generate hash of content for similarity grouping
   */
  private hashContent(content: any): string {
    // For objects, serialize and hash the content
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Extract a numeric value from content for weighted calculation
   */
  private getValueFromContent(content: any): number {
    // Simplified extraction - in reality would be data-type specific
    if (typeof content === 'number') return content;
    if (typeof content === 'string') return content.length;
    if (typeof content === 'object') return Object.keys(content).length;
    return 0; // Default value
  }
}

/**
 * Agent Collaboration Middleware
 */
export const multiAgentCollaborationMiddleware = (collaborationManager: MultiAgentCollaborationManager) => {
  return async (req: any, res: any, next: any) => {
    try {
      const workspaceHeader = req.headers['x-collaboration-workspace'];
      const agentId = req.headers['x-agent-id'] || req.user?.agentId;

      if (workspaceHeader) {
        // Link request to collaboration workspace
        const workspace = collaborationManager.getWorkspaceStatus(workspaceHeader as string);
        if (!workspace) {
          return res.status(400).json({
            error: 'Invalid collaboration workspace',
            code: 'INVALID_WORKSPACE'
          });
        }

        // Add collaboration context to request
        (req as any).collaborationContext = {
          workspaceId: workspaceHeader,
          agentId: agentId,
          participants: workspace.participants,
          isActive: workspace.status === 'active'
        };
      }

      // Check if agent is registered and valid
      if (agentId && !collaborationManager.getAgentWorkload(agentId as string)) {
        // Try to get agent status
        const agentStatus = collaborationManager.agentRegistry.get(agentId as string);
        if (!agentStatus) {
          // Register agent if not already registered
          collaborationManager.registerAgent(agentId as string, ['general']);
        }
      }

      next();
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        agentId: req.headers['x-agent-id']
      }, 'Error in multi-agent collaboration middleware');

      trackError('agents', 'CollaborationMiddlewareError');
      next(error);
    }
  };
};

export default MultiAgentCollaborationManager;