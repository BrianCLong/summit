/**
 * Data Factory Service - Annotator Service
 *
 * Manages annotator profiles, qualifications, and performance metrics.
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import {
  Annotator,
  AnnotatorRole,
  TaskType,
  AnnotatorMetrics,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import pino from 'pino';

const logger = pino({ name: 'annotator-service' });

export interface CreateAnnotatorRequest {
  userId: string;
  displayName: string;
  email: string;
  role: AnnotatorRole;
  taskTypes: TaskType[];
  qualifications?: string[];
}

export class AnnotatorService {
  private auditService: AuditService;

  constructor(auditService: AuditService) {
    this.auditService = auditService;
  }

  async create(
    request: CreateAnnotatorRequest,
    createdBy: string
  ): Promise<Annotator> {
    const id = uuidv4();

    const result = await query<{
      id: string;
      user_id: string;
      display_name: string;
      email: string;
      role: AnnotatorRole;
      task_types: string;
      qualifications: string;
      total_labeled: number;
      accuracy: number;
      golden_question_accuracy: number;
      average_time_per_task: number;
      agreement_rate: number;
      rejection_rate: number;
      last_active_at: Date | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO annotators (
        id, user_id, display_name, email, role, task_types, qualifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        request.userId,
        request.displayName,
        request.email,
        request.role,
        JSON.stringify(request.taskTypes),
        JSON.stringify(request.qualifications || []),
      ]
    );

    const annotator = this.mapRowToAnnotator(result.rows[0]);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'create_annotator',
      actorId: createdBy,
      actorRole: 'admin',
      newState: annotator as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ annotatorId: id, userId: request.userId }, 'Annotator created');
    return annotator;
  }

  async getById(id: string): Promise<Annotator | null> {
    const result = await query<{
      id: string;
      user_id: string;
      display_name: string;
      email: string;
      role: AnnotatorRole;
      task_types: string;
      qualifications: string;
      total_labeled: number;
      accuracy: number;
      golden_question_accuracy: number;
      average_time_per_task: number;
      agreement_rate: number;
      rejection_rate: number;
      last_active_at: Date | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM annotators WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAnnotator(result.rows[0]);
  }

  async getByUserId(userId: string): Promise<Annotator | null> {
    const result = await query<{
      id: string;
      user_id: string;
      display_name: string;
      email: string;
      role: AnnotatorRole;
      task_types: string;
      qualifications: string;
      total_labeled: number;
      accuracy: number;
      golden_question_accuracy: number;
      average_time_per_task: number;
      agreement_rate: number;
      rejection_rate: number;
      last_active_at: Date | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM annotators WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAnnotator(result.rows[0]);
  }

  async list(filters?: {
    role?: AnnotatorRole;
    isActive?: boolean;
    taskType?: TaskType;
  }): Promise<Annotator[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters?.role) {
      conditions.push(`role = $${paramIndex++}`);
      values.push(filters.role);
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(filters.isActive);
    }

    if (filters?.taskType) {
      conditions.push(`task_types @> $${paramIndex++}`);
      values.push(JSON.stringify([filters.taskType]));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<{
      id: string;
      user_id: string;
      display_name: string;
      email: string;
      role: AnnotatorRole;
      task_types: string;
      qualifications: string;
      total_labeled: number;
      accuracy: number;
      golden_question_accuracy: number;
      average_time_per_task: number;
      agreement_rate: number;
      rejection_rate: number;
      last_active_at: Date | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM annotators ${whereClause} ORDER BY display_name`,
      values
    );

    return result.rows.map((row) => this.mapRowToAnnotator(row));
  }

  async update(
    id: string,
    updates: Partial<{
      displayName: string;
      email: string;
      role: AnnotatorRole;
      taskTypes: TaskType[];
      qualifications: string[];
      isActive: boolean;
    }>,
    updatedBy: string
  ): Promise<Annotator> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Annotator not found: ${id}`);
    }

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    if (updates.taskTypes !== undefined) {
      updateFields.push(`task_types = $${paramIndex++}`);
      values.push(JSON.stringify(updates.taskTypes));
    }
    if (updates.qualifications !== undefined) {
      updateFields.push(`qualifications = $${paramIndex++}`);
      values.push(JSON.stringify(updates.qualifications));
    }
    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updateFields.length === 0) {
      return existing;
    }

    values.push(id);
    await query(
      `UPDATE annotators SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    const updated = await this.getById(id);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'update_annotator',
      actorId: updatedBy,
      actorRole: 'admin',
      previousState: existing as unknown as Record<string, unknown>,
      newState: updated as unknown as Record<string, unknown>,
      metadata: { changes: Object.keys(updates) },
    });

    return updated!;
  }

  async updateMetrics(id: string): Promise<AnnotatorMetrics> {
    // Recalculate metrics from label_sets
    const metricsResult = await query<{
      total_labeled: string;
      avg_time: string;
    }>(
      `SELECT
        COUNT(*) as total_labeled,
        AVG(time_spent) as avg_time
       FROM label_sets WHERE annotator_id = $1`,
      [id]
    );

    const goldenResult = await query<{
      total: string;
      correct: string;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN ls.labels::text = s.expected_label::text THEN 1 ELSE 0 END) as correct
       FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE ls.annotator_id = $1 AND s.is_golden = true`,
      [id]
    );

    const rejectionResult = await query<{
      total: string;
      rejected: string;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM label_sets WHERE annotator_id = $1`,
      [id]
    );

    const totalLabeled = parseInt(metricsResult.rows[0].total_labeled, 10) || 0;
    const avgTime = parseFloat(metricsResult.rows[0].avg_time) || 0;
    const goldenTotal = parseInt(goldenResult.rows[0].total, 10) || 0;
    const goldenCorrect = parseInt(goldenResult.rows[0].correct, 10) || 0;
    const rejectionTotal = parseInt(rejectionResult.rows[0].total, 10) || 0;
    const rejectionCount = parseInt(rejectionResult.rows[0].rejected, 10) || 0;

    const goldenAccuracy = goldenTotal > 0 ? goldenCorrect / goldenTotal : 1;
    const rejectionRate = rejectionTotal > 0 ? rejectionCount / rejectionTotal : 0;

    await query(
      `UPDATE annotators SET
        total_labeled = $1,
        average_time_per_task = $2,
        golden_question_accuracy = $3,
        rejection_rate = $4
       WHERE id = $5`,
      [totalLabeled, avgTime, goldenAccuracy, rejectionRate, id]
    );

    return {
      totalLabeled,
      accuracy: goldenAccuracy,
      goldenQuestionAccuracy: goldenAccuracy,
      averageTimePerTask: avgTime,
      agreementRate: 0.85, // Would need more complex calculation
      rejectionRate,
    };
  }

  async getLeaderboard(
    metric: 'totalLabeled' | 'accuracy' | 'speed',
    limit: number = 10
  ): Promise<Array<Annotator & { rank: number }>> {
    let orderBy: string;
    switch (metric) {
      case 'totalLabeled':
        orderBy = 'total_labeled DESC';
        break;
      case 'accuracy':
        orderBy = 'golden_question_accuracy DESC';
        break;
      case 'speed':
        orderBy = 'average_time_per_task ASC';
        break;
      default:
        orderBy = 'total_labeled DESC';
    }

    const result = await query<{
      id: string;
      user_id: string;
      display_name: string;
      email: string;
      role: AnnotatorRole;
      task_types: string;
      qualifications: string;
      total_labeled: number;
      accuracy: number;
      golden_question_accuracy: number;
      average_time_per_task: number;
      agreement_rate: number;
      rejection_rate: number;
      last_active_at: Date | null;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM annotators WHERE is_active = true ORDER BY ${orderBy} LIMIT $1`,
      [limit]
    );

    return result.rows.map((row, index) => ({
      ...this.mapRowToAnnotator(row),
      rank: index + 1,
    }));
  }

  async deactivate(id: string, deactivatedBy: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Annotator not found: ${id}`);
    }

    await query('UPDATE annotators SET is_active = false WHERE id = $1', [id]);

    await this.auditService.log({
      entityType: 'dataset',
      entityId: id,
      action: 'deactivate_annotator',
      actorId: deactivatedBy,
      actorRole: 'admin',
      metadata: {},
    });

    logger.info({ annotatorId: id }, 'Annotator deactivated');
  }

  private mapRowToAnnotator(row: {
    id: string;
    user_id: string;
    display_name: string;
    email: string;
    role: AnnotatorRole;
    task_types: string;
    qualifications: string;
    total_labeled: number;
    accuracy: number;
    golden_question_accuracy: number;
    average_time_per_task: number;
    agreement_rate: number;
    rejection_rate: number;
    last_active_at: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): Annotator {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      role: row.role,
      taskTypes: JSON.parse(row.task_types),
      qualifications: JSON.parse(row.qualifications),
      performanceMetrics: {
        totalLabeled: row.total_labeled,
        accuracy: Number(row.accuracy),
        goldenQuestionAccuracy: Number(row.golden_question_accuracy),
        averageTimePerTask: Number(row.average_time_per_task),
        agreementRate: Number(row.agreement_rate),
        rejectionRate: Number(row.rejection_rate),
        lastActiveAt: row.last_active_at || undefined,
      },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
