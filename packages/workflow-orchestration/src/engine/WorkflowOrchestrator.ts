/**
 * Workflow Orchestration Engine
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  IWorkflowOrchestrator,
  WorkflowDefinition,
  WorkflowStatus,
  WorkflowExecution,
  DAGNode,
} from '@intelgraph/data-integration';

/**
 * DAG-based workflow orchestrator
 */
export class WorkflowOrchestrator extends EventEmitter implements IWorkflowOrchestrator {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecutionState> = new Map();
  private scheduler: WorkflowScheduler;

  constructor() {
    super();
    this.scheduler = new WorkflowScheduler(this);
  }

  /**
   * Create workflow
   */
  async createWorkflow(definition: WorkflowDefinition): Promise<string> {
    // Validate workflow
    this.validateWorkflow(definition);

    // Store workflow
    this.workflows.set(definition.id, definition);

    // Schedule if needed
    if (definition.schedule) {
      this.scheduler.scheduleWorkflow(definition.id, definition.schedule);
    }

    this.emit('workflow:created', { workflowId: definition.id });
    return definition.id;
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, definition: Partial<WorkflowDefinition>): Promise<void> {
    const existing = this.workflows.get(id);
    if (!existing) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updated = { ...existing, ...definition };
    this.validateWorkflow(updated);

    this.workflows.set(id, updated);

    // Update schedule if changed
    if (definition.schedule) {
      this.scheduler.scheduleWorkflow(id, definition.schedule);
    }

    this.emit('workflow:updated', { workflowId: id });
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    if (!this.workflows.has(id)) {
      throw new Error(`Workflow ${id} not found`);
    }

    this.workflows.delete(id);
    this.scheduler.unscheduleWorkflow(id);

    this.emit('workflow:deleted', { workflowId: id });
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(id: string, parameters?: Record<string, any>): Promise<string> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const executionId = uuidv4();
    const state: WorkflowExecutionState = {
      executionId,
      workflowId: id,
      status: 'running',
      startTime: new Date(),
      parameters: parameters || workflow.parameters || {},
      nodeStates: new Map(),
      completedNodes: new Set(),
      failedNodes: new Set(),
    };

    this.executions.set(executionId, state);
    this.emit('execution:started', { executionId, workflowId: id });

    // Execute workflow asynchronously
    this.executeWorkflowInternal(workflow, state).catch(error => {
      this.emit('execution:failed', { executionId, error });
    });

    return executionId;
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    state.status = 'cancelled';
    state.endTime = new Date();

    this.emit('execution:cancelled', { executionId });
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(executionId: string): Promise<WorkflowStatus> {
    const state = this.executions.get(executionId);
    if (!state) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const totalNodes = state.nodeStates.size;
    const completedNodes = state.completedNodes.size;
    const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

    return {
      executionId: state.executionId,
      workflowId: state.workflowId,
      status: state.status,
      currentNode: state.currentNode,
      startTime: state.startTime,
      endTime: state.endTime,
      progress,
      errors: state.errors,
    };
  }

  /**
   * Get workflow history
   */
  async getWorkflowHistory(id: string, limit: number = 100): Promise<WorkflowExecution[]> {
    const history: WorkflowExecution[] = [];

    for (const [executionId, state] of this.executions) {
      if (state.workflowId === id) {
        history.push({
          id: executionId,
          workflowId: state.workflowId,
          status: state.status,
          startTime: state.startTime,
          endTime: state.endTime,
          duration: state.endTime ? state.endTime.getTime() - state.startTime.getTime() : undefined,
          parameters: state.parameters,
          error: state.errors?.[0],
        });

        if (history.length >= limit) break;
      }
    }

    return history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Execute workflow internal logic
   */
  private async executeWorkflowInternal(
    workflow: WorkflowDefinition,
    state: WorkflowExecutionState
  ): Promise<void> {
    try {
      // Build DAG
      const dag = this.buildDAG(workflow.nodes);

      // Initialize node states
      for (const node of workflow.nodes) {
        state.nodeStates.set(node.id, {
          status: 'pending',
          dependencies: node.dependencies || [],
        });
      }

      // Execute nodes in topological order
      await this.executeDAG(dag, workflow, state);

      // Complete execution
      state.status = 'completed';
      state.endTime = new Date();

      this.emit('execution:completed', { executionId: state.executionId });
    } catch (error) {
      state.status = 'failed';
      state.endTime = new Date();
      state.errors = [error as Error];

      this.emit('execution:failed', { executionId: state.executionId, error });
      throw error;
    }
  }

  /**
   * Build DAG from nodes
   */
  private buildDAG(nodes: DAGNode[]): Map<string, Set<string>> {
    const dag = new Map<string, Set<string>>();

    for (const node of nodes) {
      if (!dag.has(node.id)) {
        dag.set(node.id, new Set());
      }

      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (!dag.has(dep)) {
            dag.set(dep, new Set());
          }
          dag.get(dep)!.add(node.id);
        }
      }
    }

    return dag;
  }

  /**
   * Execute DAG
   */
  private async executeDAG(
    dag: Map<string, Set<string>>,
    workflow: WorkflowDefinition,
    state: WorkflowExecutionState
  ): Promise<void> {
    const nodesToExecute = this.getReadyNodes(dag, state);

    while (nodesToExecute.length > 0 || this.hasRunningNodes(state)) {
      // Execute ready nodes in parallel
      const promises = nodesToExecute.map(nodeId => this.executeNode(nodeId, workflow, state));

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // Check for more ready nodes
      nodesToExecute.length = 0;
      nodesToExecute.push(...this.getReadyNodes(dag, state));

      // Avoid busy waiting
      if (nodesToExecute.length === 0 && this.hasRunningNodes(state)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Get nodes that are ready to execute
   */
  private getReadyNodes(dag: Map<string, Set<string>>, state: WorkflowExecutionState): string[] {
    const ready: string[] = [];

    for (const [nodeId, nodeState] of state.nodeStates) {
      if (nodeState.status === 'pending') {
        const allDepsCompleted = nodeState.dependencies.every(dep =>
          state.completedNodes.has(dep)
        );

        if (allDepsCompleted) {
          ready.push(nodeId);
        }
      }
    }

    return ready;
  }

  /**
   * Check if any nodes are running
   */
  private hasRunningNodes(state: WorkflowExecutionState): boolean {
    for (const nodeState of state.nodeStates.values()) {
      if (nodeState.status === 'running') {
        return true;
      }
    }
    return false;
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    nodeId: string,
    workflow: WorkflowDefinition,
    state: WorkflowExecutionState
  ): Promise<void> {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodeState = state.nodeStates.get(nodeId)!;
    nodeState.status = 'running';
    state.currentNode = nodeId;

    this.emit('node:started', { executionId: state.executionId, nodeId });

    try {
      // Execute node
      await this.executeNodeLogic(node, state);

      // Mark as completed
      nodeState.status = 'completed';
      state.completedNodes.add(nodeId);

      this.emit('node:completed', { executionId: state.executionId, nodeId });
    } catch (error) {
      nodeState.status = 'failed';
      state.failedNodes.add(nodeId);

      this.emit('node:failed', { executionId: state.executionId, nodeId, error });
      throw error;
    }
  }

  /**
   * Execute node logic
   */
  private async executeNodeLogic(node: DAGNode, state: WorkflowExecutionState): Promise<void> {
    // Check condition if specified
    if (node.condition) {
      const shouldExecute =
        typeof node.condition === 'function'
          ? node.condition(state.parameters)
          : this.evaluateCondition(node.condition, state.parameters);

      if (!shouldExecute) {
        return; // Skip node
      }
    }

    // Execute node based on type
    // This would integrate with the actual pipeline execution
    this.emit('node:executing', {
      executionId: state.executionId,
      nodeId: node.id,
      type: node.type,
      config: node.config,
    });

    // Simulate node execution
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(condition: string, context: any): boolean {
    try {
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return func(context);
    } catch (error) {
      throw new Error(`Failed to evaluate condition: ${condition}`);
    }
  }

  /**
   * Validate workflow definition
   */
  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id) {
      throw new Error('Workflow ID is required');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Check for cyclic dependencies
    this.detectCycles(workflow.nodes);

    // Validate node references
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const node of workflow.nodes) {
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          if (!nodeIds.has(dep)) {
            throw new Error(`Node ${node.id} references unknown dependency: ${dep}`);
          }
        }
      }
    }
  }

  /**
   * Detect cycles in DAG
   */
  private detectCycles(nodes: DAGNode[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = nodes.find(n => n.id === nodeId);
      if (node && node.dependencies) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            if (hasCycle(dep)) return true;
          } else if (recursionStack.has(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          throw new Error('Workflow contains cyclic dependencies');
        }
      }
    }
  }
}

// ============================================================================
// Supporting types and classes
// ============================================================================

interface WorkflowExecutionState {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  currentNode?: string;
  parameters: Record<string, any>;
  nodeStates: Map<string, NodeExecutionState>;
  completedNodes: Set<string>;
  failedNodes: Set<string>;
  errors?: Error[];
}

interface NodeExecutionState {
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependencies: string[];
  startTime?: Date;
  endTime?: Date;
  error?: Error;
}

/**
 * Workflow scheduler
 */
class WorkflowScheduler {
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  constructor(private orchestrator: WorkflowOrchestrator) {}

  scheduleWorkflow(workflowId: string, schedule: any): void {
    // Clear existing schedule
    this.unscheduleWorkflow(workflowId);

    // Create new schedule
    // This is simplified - would use cron-parser in production
    if (schedule.type === 'interval' && schedule.interval) {
      const timer = setInterval(() => {
        this.orchestrator.executeWorkflow(workflowId);
      }, schedule.interval);

      this.schedules.set(workflowId, timer);
    }
  }

  unscheduleWorkflow(workflowId: string): void {
    const timer = this.schedules.get(workflowId);
    if (timer) {
      clearInterval(timer);
      this.schedules.delete(workflowId);
    }
  }
}
