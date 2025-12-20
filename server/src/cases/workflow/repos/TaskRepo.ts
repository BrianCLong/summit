/**
 * Task Repository - Data access layer for case tasks
 */

import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import logger from '../../../config/logger.js';
import {
  CaseTask,
  CaseTaskInput,
  CaseTaskUpdateInput,
  TaskListFilters,
  TaskStatus,
  OverdueTask,
} from '../types.js';

const repoLogger = logger.child({ name: 'TaskRepo' });

export class TaskRepo {
  constructor(private pg: Pool) {}

  /**
   * Create a new task
   */
  async create(input: CaseTaskInput): Promise<CaseTask> {
    const id = uuidv4();

    const { rows } = await this.pg.query(
      `INSERT INTO maestro.case_tasks (
        id, case_id, title, description, task_type, priority,
        assigned_to, assigned_by, due_date, required_role_id,
        depends_on_task_ids, metadata, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        input.caseId,
        input.title,
        input.description || null,
        input.taskType || 'standard',
        input.priority || 'medium',
        input.assignedTo || null,
        input.assignedBy || null,
        input.dueDate || null,
        input.requiredRoleId || null,
        input.dependsOnTaskIds || [],
        JSON.stringify(input.metadata || {}),
        input.createdBy,
      ],
    );

    repoLogger.info(
      { taskId: id, caseId: input.caseId, title: input.title },
      'Task created',
    );

    return this.mapRow(rows[0]);
  }

  /**
   * Update a task
   */
  async update(input: CaseTaskUpdateInput): Promise<CaseTask | null> {
    const updateFields: string[] = [];
    const params: any[] = [input.id];
    let paramIndex = 2;

    if (input.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      params.push(input.title);
      paramIndex++;
    }

    if (input.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      params.push(input.description);
      paramIndex++;
    }

    if (input.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      params.push(input.status);
      paramIndex++;

      // Auto-set completed_at when status is 'completed'
      if (input.status === 'completed') {
        updateFields.push(`completed_at = NOW()`);
      }
    }

    if (input.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      params.push(input.priority);
      paramIndex++;
    }

    if (input.assignedTo !== undefined) {
      updateFields.push(`assigned_to = $${paramIndex}`);
      params.push(input.assignedTo);
      paramIndex++;

      // Set assigned_at if not already set
      updateFields.push(`assigned_at = COALESCE(assigned_at, NOW())`);

      if (input.assignedBy) {
        updateFields.push(`assigned_by = $${paramIndex}`);
        params.push(input.assignedBy);
        paramIndex++;
      }
    }

    if (input.dueDate !== undefined) {
      updateFields.push(`due_date = $${paramIndex}`);
      params.push(input.dueDate);
      paramIndex++;
    }

    if (input.dependsOnTaskIds !== undefined) {
      updateFields.push(`depends_on_task_ids = $${paramIndex}`);
      params.push(input.dependsOnTaskIds);
      paramIndex++;
    }

    if (input.resultData !== undefined) {
      updateFields.push(`result_data = $${paramIndex}`);
      params.push(JSON.stringify(input.resultData));
      paramIndex++;
    }

    if (input.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(input.metadata));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return await this.findById(input.id);
    }

    updateFields.push(`updated_at = NOW()`);

    const { rows } = await this.pg.query(
      `UPDATE maestro.case_tasks
       SET ${updateFields.join(', ')}
       WHERE id = $1
       RETURNING *`,
      params,
    );

    if (rows[0]) {
      repoLogger.info({ taskId: input.id }, 'Task updated');
    }

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Find task by ID
   */
  async findById(id: string): Promise<CaseTask | null> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.case_tasks WHERE id = $1`,
      [id],
    );

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * List tasks with filters
   */
  async list(filters: TaskListFilters): Promise<CaseTask[]> {
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (filters.caseId) {
      conditions.push(`case_id = $${paramIndex}`);
      params.push(filters.caseId);
      paramIndex++;
    }

    if (filters.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex}`);
      params.push(filters.assignedTo);
      paramIndex++;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        conditions.push(`status = ANY($${paramIndex})`);
        params.push(filters.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        params.push(filters.status);
      }
      paramIndex++;
    }

    if (filters.taskType) {
      conditions.push(`task_type = $${paramIndex}`);
      params.push(filters.taskType);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.isOverdue) {
      conditions.push(`due_date < NOW()`);
      conditions.push(`status NOT IN ('completed', 'cancelled')`);
    }

    if (filters.requiredRoleId) {
      conditions.push(`required_role_id = $${paramIndex}`);
      params.push(filters.requiredRoleId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderByMap: Record<string, string> = {
      createdAt: 'created_at',
      dueDate: 'due_date',
      priority: 'priority',
    };
    const orderBy = orderByMap[sortBy] || 'created_at';

    const limit = Math.min(filters.limit || 50, 1000);
    const offset = filters.offset || 0;

    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.case_tasks
       ${whereClause}
       ORDER BY ${orderBy} ${sortOrder.toUpperCase()}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset],
    );

    return rows.map(this.mapRow);
  }

  /**
   * Get tasks for a case
   */
  async getCaseTasks(
    caseId: string,
    status?: TaskStatus | TaskStatus[],
  ): Promise<CaseTask[]> {
    return this.list({ caseId, status });
  }

  /**
   * Assign task to user
   */
  async assignTask(
    taskId: string,
    userId: string,
    assignedBy: string,
  ): Promise<CaseTask | null> {
    return this.update({
      id: taskId,
      assignedTo: userId,
      assignedBy,
      status: 'assigned',
    });
  }

  /**
   * Complete task
   */
  async completeTask(
    taskId: string,
    userId: string,
    resultData?: Record<string, any>,
  ): Promise<CaseTask | null> {
    const { rows } = await this.pg.query(
      `UPDATE maestro.case_tasks
       SET status = 'completed',
           completed_at = NOW(),
           completed_by = $2,
           result_data = COALESCE($3, result_data),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [taskId, userId, resultData ? JSON.stringify(resultData) : null],
    );

    if (rows[0]) {
      repoLogger.info({ taskId, userId }, 'Task completed');
    }

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  /**
   * Get overdue tasks for a case
   */
  async getOverdueTasks(caseId: string): Promise<OverdueTask[]> {
    const { rows } = await this.pg.query(
      `SELECT * FROM maestro.get_overdue_tasks($1)`,
      [caseId],
    );

    return rows.map((row) => ({
      taskId: row.task_id,
      title: row.title,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      daysOverdue: parseFloat(row.days_overdue),
    }));
  }

  /**
   * Check if task dependencies are met
   */
  async areDependenciesMet(taskId: string): Promise<boolean> {
    const task = await this.findById(taskId);
    if (!task || task.dependsOnTaskIds.length === 0) {
      return true;
    }

    const { rows } = await this.pg.query(
      `SELECT COUNT(*) as count
       FROM maestro.case_tasks
       WHERE id = ANY($1)
       AND status != 'completed'`,
      [task.dependsOnTaskIds],
    );

    return parseInt(rows[0].count, 10) === 0;
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pg.query(
      `DELETE FROM maestro.case_tasks WHERE id = $1`,
      [id],
    );

    if (rowCount && rowCount > 0) {
      repoLogger.info({ taskId: id }, 'Task deleted');
    }

    return rowCount !== null && rowCount > 0;
  }

  /**
   * Map database row to domain object
   */
  private mapRow(row: any): CaseTask {
    return {
      id: row.id,
      caseId: row.case_id,
      title: row.title,
      description: row.description,
      taskType: row.task_type,
      status: row.status,
      priority: row.priority,
      assignedTo: row.assigned_to,
      assignedBy: row.assigned_by,
      assignedAt: row.assigned_at,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      requiredRoleId: row.required_role_id,
      dependsOnTaskIds: row.depends_on_task_ids || [],
      resultData: row.result_data || {},
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
