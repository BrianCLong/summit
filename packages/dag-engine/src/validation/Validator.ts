/**
 * DAG validation utilities
 */

import { DAG } from '../core/DAG.js';
import { TaskConfig } from '../core/types.js';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  taskId?: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  taskId?: string;
}

export class DAGValidator {
  /**
   * Perform comprehensive validation
   */
  static validate(dag: DAG): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic DAG validation
    const basicValidation = dag.validate();
    if (!basicValidation.valid) {
      basicValidation.errors.forEach(error => {
        errors.push({ type: 'dag_structure', message: error });
      });
    }

    // Check for circular dependencies
    const circularDeps = this.checkCircularDependencies(dag);
    errors.push(...circularDeps);

    // Check for unreachable tasks
    const unreachable = this.checkUnreachableTasks(dag);
    warnings.push(...unreachable);

    // Check for tasks with no downstream
    const deadends = this.checkDeadEndTasks(dag);
    warnings.push(...deadends);

    // Validate task configurations
    const configErrors = this.validateTaskConfigs(dag);
    errors.push(...configErrors);

    // Check for long paths
    const longPaths = this.checkLongPaths(dag);
    warnings.push(...longPaths);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for circular dependencies
   */
  private static checkCircularDependencies(dag: DAG): ValidationError[] {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const detectCycle = (taskId: string, path: string[]): boolean => {
      visited.add(taskId);
      recStack.add(taskId);
      path.push(taskId);

      const downstream = dag.getDownstreamTasks(taskId);
      for (const downstreamId of downstream) {
        if (!visited.has(downstreamId)) {
          if (detectCycle(downstreamId, [...path])) {
            return true;
          }
        } else if (recStack.has(downstreamId)) {
          const cycleStart = path.indexOf(downstreamId);
          const cycle = path.slice(cycleStart);
          errors.push({
            type: 'circular_dependency',
            message: `Circular dependency detected: ${cycle.join(' -> ')} -> ${downstreamId}`,
          });
          return true;
        }
      }

      recStack.delete(taskId);
      return false;
    };

    dag.getTasks().forEach(task => {
      if (!visited.has(task.taskId)) {
        detectCycle(task.taskId, []);
      }
    });

    return errors;
  }

  /**
   * Check for unreachable tasks (tasks with no path from root)
   */
  private static checkUnreachableTasks(dag: DAG): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const reachable = new Set<string>();

    // BFS from all root tasks
    const roots = dag.getRootTasks();
    const queue = [...roots];

    while (queue.length > 0) {
      const taskId = queue.shift()!;
      if (reachable.has(taskId)) continue;

      reachable.add(taskId);
      const downstream = dag.getDownstreamTasks(taskId);
      queue.push(...downstream);
    }

    // Check for unreachable tasks
    dag.getTasks().forEach(task => {
      if (!reachable.has(task.taskId)) {
        warnings.push({
          type: 'unreachable_task',
          message: `Task ${task.taskId} is not reachable from any root task`,
          taskId: task.taskId,
        });
      }
    });

    return warnings;
  }

  /**
   * Check for dead-end tasks (leaf tasks that might not be intentional)
   */
  private static checkDeadEndTasks(dag: DAG): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const leafTasks = dag.getLeafTasks();

    if (leafTasks.length > 3) {
      warnings.push({
        type: 'many_leaf_tasks',
        message: `DAG has ${leafTasks.length} leaf tasks. Consider if this is intentional.`,
      });
    }

    return warnings;
  }

  /**
   * Validate task configurations
   */
  private static validateTaskConfigs(dag: DAG): ValidationError[] {
    const errors: ValidationError[] = [];

    dag.getTasks().forEach(task => {
      // Check task ID
      if (!task.taskId || task.taskId.trim() === '') {
        errors.push({
          type: 'invalid_task_id',
          message: 'Task ID cannot be empty',
          taskId: task.taskId,
        });
      }

      // Check operator
      if (!task.operator || task.operator.trim() === '') {
        errors.push({
          type: 'missing_operator',
          message: `Task ${task.taskId} has no operator defined`,
          taskId: task.taskId,
        });
      }

      // Check retry policy
      if (task.retryPolicy) {
        if (task.retryPolicy.maxRetries < 0) {
          errors.push({
            type: 'invalid_retry_policy',
            message: `Task ${task.taskId} has negative maxRetries`,
            taskId: task.taskId,
          });
        }

        if (task.retryPolicy.retryDelay && task.retryPolicy.retryDelay < 0) {
          errors.push({
            type: 'invalid_retry_policy',
            message: `Task ${task.taskId} has negative retryDelay`,
            taskId: task.taskId,
          });
        }
      }

      // Check timeout
      if (task.timeout) {
        if (task.timeout.execution && task.timeout.execution < 0) {
          errors.push({
            type: 'invalid_timeout',
            message: `Task ${task.taskId} has negative execution timeout`,
            taskId: task.taskId,
          });
        }
      }

      // Check priority
      if (task.priority !== undefined && task.priority < 0) {
        errors.push({
          type: 'invalid_priority',
          message: `Task ${task.taskId} has negative priority`,
          taskId: task.taskId,
        });
      }
    });

    return errors;
  }

  /**
   * Check for excessively long execution paths
   */
  private static checkLongPaths(dag: DAG): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const maxPathLength = 50;

    const findLongestPath = (taskId: string, visited: Set<string>): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const downstream = dag.getDownstreamTasks(taskId);
      if (downstream.length === 0) return 1;

      let maxLength = 0;
      downstream.forEach(downstreamId => {
        const length = findLongestPath(downstreamId, new Set(visited));
        maxLength = Math.max(maxLength, length);
      });

      return maxLength + 1;
    };

    const roots = dag.getRootTasks();
    roots.forEach(rootId => {
      const pathLength = findLongestPath(rootId, new Set());
      if (pathLength > maxPathLength) {
        warnings.push({
          type: 'long_path',
          message: `Path from ${rootId} has length ${pathLength}, which exceeds recommended maximum of ${maxPathLength}`,
          taskId: rootId,
        });
      }
    });

    return warnings;
  }

  /**
   * Check for task naming conventions
   */
  static validateNamingConventions(dag: DAG): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

    dag.getTasks().forEach(task => {
      if (!validPattern.test(task.taskId)) {
        warnings.push({
          type: 'naming_convention',
          message: `Task ${task.taskId} does not follow naming convention (alphanumeric, underscore, hyphen)`,
          taskId: task.taskId,
        });
      }
    });

    return warnings;
  }
}
