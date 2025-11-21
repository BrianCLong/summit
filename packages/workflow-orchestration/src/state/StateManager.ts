/**
 * State Manager for persisting workflow and task execution state
 */

import {
  WorkflowExecution,
  TaskExecution,
  TaskState,
  DAGConfig,
} from '../types/dag-types.js';
import { EventEmitter } from '../utils/EventEmitter.js';

export interface StateSnapshot {
  workflowExecutions: WorkflowExecution[];
  taskExecutions: Map<string, Map<string, TaskExecution>>;
  timestamp: Date;
}

export interface StateQuery {
  dagId?: string;
  executionId?: string;
  state?: TaskState;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface StateManagerEvents {
  'state:workflow:updated': (execution: WorkflowExecution) => void;
  'state:task:updated': (execution: TaskExecution) => void;
  'state:snapshot:created': (snapshot: StateSnapshot) => void;
}

export class StateManager extends EventEmitter<StateManagerEvents> {
  private workflowExecutions: Map<string, WorkflowExecution>;
  private taskExecutions: Map<string, Map<string, TaskExecution>>;
  private dagConfigs: Map<string, DAGConfig>;
  private snapshots: StateSnapshot[];
  private maxSnapshots: number;

  constructor(config: { maxSnapshots?: number } = {}) {
    super();
    this.workflowExecutions = new Map();
    this.taskExecutions = new Map();
    this.dagConfigs = new Map();
    this.snapshots = [];
    this.maxSnapshots = config.maxSnapshots || 10;
  }

  /**
   * Store DAG configuration
   */
  storeDagConfig(config: DAGConfig): void {
    this.dagConfigs.set(config.dagId, config);
  }

  /**
   * Get DAG configuration
   */
  getDagConfig(dagId: string): DAGConfig | undefined {
    return this.dagConfigs.get(dagId);
  }

  /**
   * Get all DAG configurations
   */
  getAllDagConfigs(): DAGConfig[] {
    return Array.from(this.dagConfigs.values());
  }

  /**
   * Store workflow execution
   */
  storeWorkflowExecution(execution: WorkflowExecution): void {
    this.workflowExecutions.set(execution.executionId, execution);
    if (!this.taskExecutions.has(execution.executionId)) {
      this.taskExecutions.set(execution.executionId, new Map());
    }
    this.emit('state:workflow:updated', execution);
  }

  /**
   * Update workflow execution state
   */
  updateWorkflowState(executionId: string, state: TaskState): void {
    const execution = this.workflowExecutions.get(executionId);
    if (execution) {
      execution.state = state;
      if (state === 'success' || state === 'failed' || state === 'cancelled') {
        execution.endTime = new Date();
      }
      this.emit('state:workflow:updated', execution);
    }
  }

  /**
   * Get workflow execution
   */
  getWorkflowExecution(executionId: string): WorkflowExecution | undefined {
    return this.workflowExecutions.get(executionId);
  }

  /**
   * Store task execution
   */
  storeTaskExecution(execution: TaskExecution): void {
    const workflowTasks = this.taskExecutions.get(execution.workflowExecutionId);
    if (workflowTasks) {
      workflowTasks.set(execution.taskId, execution);
      this.emit('state:task:updated', execution);
    }
  }

  /**
   * Update task execution state
   */
  updateTaskState(
    workflowExecutionId: string,
    taskId: string,
    state: TaskState
  ): void {
    const workflowTasks = this.taskExecutions.get(workflowExecutionId);
    if (workflowTasks) {
      const taskExecution = workflowTasks.get(taskId);
      if (taskExecution) {
        taskExecution.state = state;
        if (state === 'success' || state === 'failed' || state === 'cancelled') {
          taskExecution.endTime = new Date();
          if (taskExecution.startTime) {
            taskExecution.duration =
              taskExecution.endTime.getTime() - taskExecution.startTime.getTime();
          }
        }
        this.emit('state:task:updated', taskExecution);
      }
    }
  }

  /**
   * Get task execution
   */
  getTaskExecution(
    workflowExecutionId: string,
    taskId: string
  ): TaskExecution | undefined {
    return this.taskExecutions.get(workflowExecutionId)?.get(taskId);
  }

  /**
   * Get all task executions for a workflow
   */
  getWorkflowTaskExecutions(workflowExecutionId: string): TaskExecution[] {
    const tasks = this.taskExecutions.get(workflowExecutionId);
    return tasks ? Array.from(tasks.values()) : [];
  }

  /**
   * Query workflow executions
   */
  queryWorkflowExecutions(query: StateQuery): WorkflowExecution[] {
    let results = Array.from(this.workflowExecutions.values());

    // Filter by DAG ID
    if (query.dagId) {
      results = results.filter(e => e.dagId === query.dagId);
    }

    // Filter by execution ID
    if (query.executionId) {
      results = results.filter(e => e.executionId === query.executionId);
    }

    // Filter by state
    if (query.state) {
      results = results.filter(e => e.state === query.state);
    }

    // Filter by date range
    if (query.startDate) {
      results = results.filter(e => e.startTime >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(e => e.startTime <= query.endDate!);
    }

    // Sort by start time (descending)
    results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get workflow execution history for a DAG
   */
  getWorkflowHistory(
    dagId: string,
    limit: number = 10
  ): WorkflowExecution[] {
    return this.queryWorkflowExecutions({ dagId, limit });
  }

  /**
   * Get active workflow executions
   */
  getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.workflowExecutions.values()).filter(
      e => e.state === 'running' || e.state === 'queued'
    );
  }

  /**
   * Create state snapshot
   */
  createSnapshot(): StateSnapshot {
    const snapshot: StateSnapshot = {
      workflowExecutions: Array.from(this.workflowExecutions.values()),
      taskExecutions: new Map(this.taskExecutions),
      timestamp: new Date(),
    };

    this.snapshots.push(snapshot);

    // Trim snapshots if exceeds max
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.emit('state:snapshot:created', snapshot);
    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: StateSnapshot): void {
    this.workflowExecutions = new Map(
      snapshot.workflowExecutions.map(e => [e.executionId, e])
    );
    this.taskExecutions = new Map(snapshot.taskExecutions);
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): StateSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear old executions
   */
  clearOldExecutions(beforeDate: Date): void {
    const toDelete: string[] = [];

    this.workflowExecutions.forEach((execution, id) => {
      if (execution.startTime < beforeDate) {
        toDelete.push(id);
      }
    });

    toDelete.forEach(id => {
      this.workflowExecutions.delete(id);
      this.taskExecutions.delete(id);
    });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const executions = Array.from(this.workflowExecutions.values());

    return {
      totalWorkflows: executions.length,
      successfulWorkflows: executions.filter(e => e.state === 'success').length,
      failedWorkflows: executions.filter(e => e.state === 'failed').length,
      runningWorkflows: executions.filter(e => e.state === 'running').length,
      totalTasks: Array.from(this.taskExecutions.values()).reduce(
        (sum, tasks) => sum + tasks.size,
        0
      ),
    };
  }
}
