/**
 * Data Factory Service - Labeling Service
 *
 * Manages labeling jobs, task queues, and label submissions.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import {
  LabelingJob,
  LabelingQueue,
  LabelSet,
  JobStatus,
  LabelStatus,
  TaskType,
  AnnotatorRole,
  Label,
  SubmitLabelRequest,
  ReviewLabelRequest,
  AssignJobRequest,
  QualitySettings,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import { SampleService } from './SampleService.js';
import pino from 'pino';

const logger = pino({ name: 'labeling-service' });

export class LabelingService {
  private auditService: AuditService;
  private sampleService: SampleService;

  constructor(auditService: AuditService, sampleService: SampleService) {
    this.auditService = auditService;
    this.sampleService = sampleService;
  }

  // ============================================================================
  // Queue Management
  // ============================================================================

  async createQueue(
    datasetId: string,
    name: string,
    taskType: TaskType,
    qualitySettings: QualitySettings,
    createdBy: string
  ): Promise<LabelingQueue> {
    const id = uuidv4();

    const result = await query<{
      id: string;
      name: string;
      dataset_id: string;
      task_type: TaskType;
      total_jobs: number;
      pending_jobs: number;
      assigned_jobs: number;
      completed_jobs: number;
      annotator_ids: string;
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO labeling_queues (
        id, name, dataset_id, task_type,
        golden_question_frequency, min_agreement_threshold, review_sampling_rate,
        max_annotations_per_sample, disagreement_resolution, auto_approval_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        name,
        datasetId,
        taskType,
        qualitySettings.goldenQuestionFrequency,
        qualitySettings.minAgreementThreshold,
        qualitySettings.reviewSamplingRate,
        qualitySettings.maxAnnotationsPerSample,
        qualitySettings.disagreementResolution,
        qualitySettings.autoApprovalThreshold || null,
      ]
    );

    const queue = this.mapRowToQueue(result.rows[0]);

    await this.auditService.log({
      entityType: 'labeling_queue',
      entityId: id,
      action: 'create',
      actorId: createdBy,
      actorRole: 'user',
      newState: queue as unknown as Record<string, unknown>,
      metadata: { datasetId },
    });

    logger.info({ queueId: id, datasetId }, 'Labeling queue created');
    return queue;
  }

  async getQueue(id: string): Promise<LabelingQueue | null> {
    const result = await query<{
      id: string;
      name: string;
      dataset_id: string;
      task_type: TaskType;
      total_jobs: number;
      pending_jobs: number;
      assigned_jobs: number;
      completed_jobs: number;
      annotator_ids: string;
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM labeling_queues WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQueue(result.rows[0]);
  }

  async getQueuesByDataset(datasetId: string): Promise<LabelingQueue[]> {
    const result = await query<{
      id: string;
      name: string;
      dataset_id: string;
      task_type: TaskType;
      total_jobs: number;
      pending_jobs: number;
      assigned_jobs: number;
      completed_jobs: number;
      annotator_ids: string;
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM labeling_queues WHERE dataset_id = $1', [datasetId]);

    return result.rows.map((row) => this.mapRowToQueue(row));
  }

  async addAnnotatorToQueue(
    queueId: string,
    annotatorId: string,
    addedBy: string
  ): Promise<void> {
    const queue = await this.getQueue(queueId);
    if (!queue) {
      throw new Error(`Queue not found: ${queueId}`);
    }

    const annotatorIds = [...queue.annotatorIds, annotatorId];
    await query(
      'UPDATE labeling_queues SET annotator_ids = $1 WHERE id = $2',
      [JSON.stringify(annotatorIds), queueId]
    );

    await this.auditService.log({
      entityType: 'labeling_queue',
      entityId: queueId,
      action: 'add_annotator',
      actorId: addedBy,
      actorRole: 'admin',
      metadata: { annotatorId },
    });

    logger.info({ queueId, annotatorId }, 'Annotator added to queue');
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  async createJob(
    datasetId: string,
    sampleId: string,
    taskType: TaskType,
    instructions: string,
    labelSchemaId: string,
    priority: number = 50
  ): Promise<LabelingJob> {
    const id = uuidv4();

    const result = await query<{
      id: string;
      dataset_id: string;
      sample_id: string;
      task_type: TaskType;
      annotator_id: string | null;
      status: JobStatus;
      priority: number;
      assigned_at: Date | null;
      started_at: Date | null;
      submitted_at: Date | null;
      due_at: Date | null;
      instructions: string;
      label_schema_id: string;
      previous_labels: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO labeling_jobs (
        id, dataset_id, sample_id, task_type, instructions, label_schema_id, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [id, datasetId, sampleId, taskType, instructions, labelSchemaId, priority]
    );

    return this.mapRowToJob(result.rows[0]);
  }

  async createJobsForSamples(
    datasetId: string,
    sampleIds: string[],
    taskType: TaskType,
    instructions: string,
    labelSchemaId: string,
    createdBy: string
  ): Promise<number> {
    let created = 0;

    await transaction(async (client) => {
      for (const sampleId of sampleIds) {
        const id = uuidv4();
        await client.query(
          `INSERT INTO labeling_jobs (
            id, dataset_id, sample_id, task_type, instructions, label_schema_id
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, datasetId, sampleId, taskType, instructions, labelSchemaId]
        );
        created++;
      }
    });

    await this.auditService.log({
      entityType: 'labeling_job',
      entityId: datasetId,
      action: 'batch_create',
      actorId: createdBy,
      actorRole: 'admin',
      metadata: { count: created, taskType },
    });

    logger.info({ datasetId, count: created }, 'Labeling jobs created');
    return created;
  }

  async getJob(id: string): Promise<LabelingJob | null> {
    const result = await query<{
      id: string;
      dataset_id: string;
      sample_id: string;
      task_type: TaskType;
      annotator_id: string | null;
      status: JobStatus;
      priority: number;
      assigned_at: Date | null;
      started_at: Date | null;
      submitted_at: Date | null;
      due_at: Date | null;
      instructions: string;
      label_schema_id: string;
      previous_labels: string | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM labeling_jobs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  async getJobsForAnnotator(
    annotatorId: string,
    status?: JobStatus
  ): Promise<LabelingJob[]> {
    const conditions = ['annotator_id = (SELECT id FROM annotators WHERE user_id = $1)'];
    const values: unknown[] = [annotatorId];

    if (status) {
      conditions.push('status = $2');
      values.push(status);
    }

    const result = await query<{
      id: string;
      dataset_id: string;
      sample_id: string;
      task_type: TaskType;
      annotator_id: string | null;
      status: JobStatus;
      priority: number;
      assigned_at: Date | null;
      started_at: Date | null;
      submitted_at: Date | null;
      due_at: Date | null;
      instructions: string;
      label_schema_id: string;
      previous_labels: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM labeling_jobs WHERE ${conditions.join(' AND ')} ORDER BY priority DESC, created_at ASC`,
      values
    );

    return result.rows.map((row) => this.mapRowToJob(row));
  }

  async assignJobs(request: AssignJobRequest): Promise<LabelingJob[]> {
    // Get annotator's internal ID
    const annotatorResult = await query<{ id: string }>(
      'SELECT id FROM annotators WHERE user_id = $1',
      [request.annotatorId]
    );

    if (annotatorResult.rows.length === 0) {
      throw new Error(`Annotator not found: ${request.annotatorId}`);
    }

    const annotatorDbId = annotatorResult.rows[0].id;

    let jobIds: string[];

    if (request.jobIds && request.jobIds.length > 0) {
      jobIds = request.jobIds;
    } else {
      // Auto-assign from queue
      const count = request.count || 5;
      const conditions = ['status = $1'];
      const values: unknown[] = [JobStatus.QUEUED];

      if (request.taskType) {
        conditions.push('task_type = $2');
        values.push(request.taskType);
      }

      const result = await query<{ id: string }>(
        `SELECT id FROM labeling_jobs
         WHERE ${conditions.join(' AND ')}
         ORDER BY priority DESC, created_at ASC
         LIMIT ${count}`,
        values
      );

      jobIds = result.rows.map((r) => r.id);
    }

    if (jobIds.length === 0) {
      return [];
    }

    await query(
      `UPDATE labeling_jobs
       SET annotator_id = $1, status = $2, assigned_at = NOW()
       WHERE id = ANY($3)`,
      [annotatorDbId, JobStatus.ASSIGNED, jobIds]
    );

    const result = await query<{
      id: string;
      dataset_id: string;
      sample_id: string;
      task_type: TaskType;
      annotator_id: string | null;
      status: JobStatus;
      priority: number;
      assigned_at: Date | null;
      started_at: Date | null;
      submitted_at: Date | null;
      due_at: Date | null;
      instructions: string;
      label_schema_id: string;
      previous_labels: string | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM labeling_jobs WHERE id = ANY($1)', [jobIds]);

    logger.info(
      { annotatorId: request.annotatorId, count: jobIds.length },
      'Jobs assigned'
    );

    return result.rows.map((row) => this.mapRowToJob(row));
  }

  async startJob(jobId: string, annotatorId: string): Promise<LabelingJob> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== JobStatus.ASSIGNED) {
      throw new Error(`Job cannot be started from status: ${job.status}`);
    }

    await query(
      `UPDATE labeling_jobs SET status = $1, started_at = NOW() WHERE id = $2`,
      [JobStatus.IN_PROGRESS, jobId]
    );

    // Update sample status
    await this.sampleService.updateStatus(
      job.sampleId,
      LabelStatus.IN_PROGRESS,
      annotatorId
    );

    return (await this.getJob(jobId))!;
  }

  // ============================================================================
  // Label Submission
  // ============================================================================

  async submitLabel(
    request: SubmitLabelRequest,
    annotatorId: string
  ): Promise<LabelSet> {
    const job = await this.getJob(request.jobId);
    if (!job) {
      throw new Error(`Job not found: ${request.jobId}`);
    }

    if (job.status !== JobStatus.IN_PROGRESS && job.status !== JobStatus.ASSIGNED) {
      throw new Error(`Cannot submit label for job in status: ${job.status}`);
    }

    // Get annotator's internal ID and role
    const annotatorResult = await query<{ id: string; role: AnnotatorRole }>(
      'SELECT id, role FROM annotators WHERE user_id = $1',
      [annotatorId]
    );

    if (annotatorResult.rows.length === 0) {
      throw new Error(`Annotator not found: ${annotatorId}`);
    }

    const { id: annotatorDbId, role: annotatorRole } = annotatorResult.rows[0];

    const labelSetId = uuidv4();

    await transaction(async (client) => {
      // Create label set
      await client.query(
        `INSERT INTO label_sets (
          id, sample_id, annotator_id, annotator_role, task_type,
          labels, confidence, notes, time_spent, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          labelSetId,
          job.sampleId,
          annotatorDbId,
          annotatorRole,
          job.taskType,
          JSON.stringify(request.labels),
          request.confidence || null,
          request.notes || null,
          request.timeSpent,
          LabelStatus.COMPLETED,
        ]
      );

      // Update job status
      await client.query(
        `UPDATE labeling_jobs SET status = $1, submitted_at = NOW() WHERE id = $2`,
        [JobStatus.SUBMITTED, request.jobId]
      );

      // Update sample status
      await client.query(
        `UPDATE samples SET status = $1 WHERE id = $2`,
        [LabelStatus.COMPLETED, job.sampleId]
      );

      // Update annotator metrics
      await client.query(
        `UPDATE annotators SET
          total_labeled = total_labeled + 1,
          last_active_at = NOW()
         WHERE id = $1`,
        [annotatorDbId]
      );
    });

    await this.auditService.log({
      entityType: 'label',
      entityId: labelSetId,
      action: 'submit',
      actorId: annotatorId,
      actorRole: annotatorRole,
      newState: { labels: request.labels, confidence: request.confidence },
      metadata: { jobId: request.jobId, sampleId: job.sampleId },
    });

    logger.info(
      { labelSetId, jobId: request.jobId, annotatorId },
      'Label submitted'
    );

    return (await this.getLabelSet(labelSetId))!;
  }

  async getLabelSet(id: string): Promise<LabelSet | null> {
    const result = await query<{
      id: string;
      sample_id: string;
      annotator_id: string;
      annotator_role: AnnotatorRole;
      task_type: TaskType;
      labels: string;
      confidence: number | null;
      notes: string | null;
      time_spent: number;
      status: LabelStatus;
      reviewer_id: string | null;
      review_notes: string | null;
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>('SELECT * FROM label_sets WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      sampleId: row.sample_id,
      annotatorId: row.annotator_id,
      annotatorRole: row.annotator_role,
      taskType: row.task_type,
      labels: JSON.parse(row.labels),
      confidence: row.confidence || undefined,
      notes: row.notes || undefined,
      timeSpent: row.time_spent,
      status: row.status,
      reviewerId: row.reviewer_id || undefined,
      reviewNotes: row.review_notes || undefined,
      reviewedAt: row.reviewed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================================
  // Review
  // ============================================================================

  async reviewLabel(
    request: ReviewLabelRequest,
    reviewerId: string
  ): Promise<LabelSet> {
    const labelSet = await this.getLabelSet(request.labelSetId);
    if (!labelSet) {
      throw new Error(`Label set not found: ${request.labelSetId}`);
    }

    if (labelSet.status !== LabelStatus.COMPLETED) {
      throw new Error(`Cannot review label set in status: ${labelSet.status}`);
    }

    // Get reviewer's internal ID
    const reviewerResult = await query<{ id: string; role: AnnotatorRole }>(
      'SELECT id, role FROM annotators WHERE user_id = $1',
      [reviewerId]
    );

    if (reviewerResult.rows.length === 0) {
      throw new Error(`Reviewer not found: ${reviewerId}`);
    }

    const { id: reviewerDbId, role: reviewerRole } = reviewerResult.rows[0];

    if (
      reviewerRole !== AnnotatorRole.REVIEWER &&
      reviewerRole !== AnnotatorRole.ADMIN &&
      reviewerRole !== AnnotatorRole.QUALITY_LEAD
    ) {
      throw new Error('User does not have reviewer permissions');
    }

    const newStatus = request.approved ? LabelStatus.APPROVED : LabelStatus.REJECTED;

    await query(
      `UPDATE label_sets SET
        status = $1,
        reviewer_id = $2,
        review_notes = $3,
        reviewed_at = NOW()
       WHERE id = $4`,
      [newStatus, reviewerDbId, request.notes || null, request.labelSetId]
    );

    // Update associated job
    await query(
      `UPDATE labeling_jobs SET status = $1
       WHERE sample_id = $2 AND status = 'submitted'`,
      [
        request.approved ? JobStatus.APPROVED : JobStatus.REJECTED,
        labelSet.sampleId,
      ]
    );

    // Update sample status
    await query(
      `UPDATE samples SET status = $1 WHERE id = $2`,
      [newStatus, labelSet.sampleId]
    );

    await this.auditService.log({
      entityType: 'label',
      entityId: request.labelSetId,
      action: 'review',
      actorId: reviewerId,
      actorRole: reviewerRole,
      previousState: { status: labelSet.status },
      newState: { status: newStatus, approved: request.approved },
      metadata: { notes: request.notes },
    });

    logger.info(
      { labelSetId: request.labelSetId, approved: request.approved, reviewerId },
      'Label reviewed'
    );

    return (await this.getLabelSet(request.labelSetId))!;
  }

  async getLabelsNeedingReview(
    datasetId: string,
    limit: number = 20
  ): Promise<LabelSet[]> {
    const result = await query<{
      id: string;
      sample_id: string;
      annotator_id: string;
      annotator_role: AnnotatorRole;
      task_type: TaskType;
      labels: string;
      confidence: number | null;
      notes: string | null;
      time_spent: number;
      status: LabelStatus;
      reviewer_id: string | null;
      review_notes: string | null;
      reviewed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT ls.* FROM label_sets ls
       JOIN samples s ON ls.sample_id = s.id
       WHERE s.dataset_id = $1 AND ls.status = $2
       ORDER BY ls.created_at ASC
       LIMIT $3`,
      [datasetId, LabelStatus.COMPLETED, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      sampleId: row.sample_id,
      annotatorId: row.annotator_id,
      annotatorRole: row.annotator_role,
      taskType: row.task_type,
      labels: JSON.parse(row.labels),
      confidence: row.confidence || undefined,
      notes: row.notes || undefined,
      timeSpent: row.time_spent,
      status: row.status,
      reviewerId: row.reviewer_id || undefined,
      reviewNotes: row.review_notes || undefined,
      reviewedAt: row.reviewed_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getJobStatistics(datasetId: string): Promise<{
    total: number;
    byStatus: Record<JobStatus, number>;
    byTaskType: Record<TaskType, number>;
    averageCompletionTime: number;
  }> {
    const statusResult = await query<{ status: JobStatus; count: string }>(
      `SELECT status, COUNT(*) as count FROM labeling_jobs
       WHERE dataset_id = $1 GROUP BY status`,
      [datasetId]
    );

    const taskTypeResult = await query<{ task_type: TaskType; count: string }>(
      `SELECT task_type, COUNT(*) as count FROM labeling_jobs
       WHERE dataset_id = $1 GROUP BY task_type`,
      [datasetId]
    );

    const avgTimeResult = await query<{ avg_time: string }>(
      `SELECT AVG(EXTRACT(EPOCH FROM (submitted_at - started_at))) as avg_time
       FROM labeling_jobs
       WHERE dataset_id = $1 AND submitted_at IS NOT NULL AND started_at IS NOT NULL`,
      [datasetId]
    );

    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM labeling_jobs WHERE dataset_id = $1',
      [datasetId]
    );

    const byStatus = {} as Record<JobStatus, number>;
    for (const row of statusResult.rows) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    const byTaskType = {} as Record<TaskType, number>;
    for (const row of taskTypeResult.rows) {
      byTaskType[row.task_type] = parseInt(row.count, 10);
    }

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      byStatus,
      byTaskType,
      averageCompletionTime: parseFloat(avgTimeResult.rows[0].avg_time) || 0,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapRowToQueue(row: {
    id: string;
    name: string;
    dataset_id: string;
    task_type: TaskType;
    total_jobs: number;
    pending_jobs: number;
    assigned_jobs: number;
    completed_jobs: number;
    annotator_ids: string;
    golden_question_frequency: number;
    min_agreement_threshold: number;
    review_sampling_rate: number;
    max_annotations_per_sample: number;
    disagreement_resolution: string;
    auto_approval_threshold: number | null;
    created_at: Date;
    updated_at: Date;
  }): LabelingQueue {
    return {
      id: row.id,
      name: row.name,
      datasetId: row.dataset_id,
      taskType: row.task_type,
      totalJobs: row.total_jobs,
      pendingJobs: row.pending_jobs,
      assignedJobs: row.assigned_jobs,
      completedJobs: row.completed_jobs,
      annotatorIds: JSON.parse(row.annotator_ids),
      qualitySettings: {
        goldenQuestionFrequency: Number(row.golden_question_frequency),
        minAgreementThreshold: Number(row.min_agreement_threshold),
        reviewSamplingRate: Number(row.review_sampling_rate),
        maxAnnotationsPerSample: row.max_annotations_per_sample,
        disagreementResolution: row.disagreement_resolution as QualitySettings['disagreementResolution'],
        autoApprovalThreshold: row.auto_approval_threshold
          ? Number(row.auto_approval_threshold)
          : undefined,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToJob(row: {
    id: string;
    dataset_id: string;
    sample_id: string;
    task_type: TaskType;
    annotator_id: string | null;
    status: JobStatus;
    priority: number;
    assigned_at: Date | null;
    started_at: Date | null;
    submitted_at: Date | null;
    due_at: Date | null;
    instructions: string;
    label_schema_id: string;
    previous_labels: string | null;
    created_at: Date;
    updated_at: Date;
  }): LabelingJob {
    return {
      id: row.id,
      datasetId: row.dataset_id,
      sampleId: row.sample_id,
      taskType: row.task_type,
      annotatorId: row.annotator_id || undefined,
      status: row.status,
      priority: row.priority,
      assignedAt: row.assigned_at || undefined,
      startedAt: row.started_at || undefined,
      submittedAt: row.submitted_at || undefined,
      dueAt: row.due_at || undefined,
      instructions: row.instructions,
      labelSchemaId: row.label_schema_id,
      previousLabels: row.previous_labels
        ? JSON.parse(row.previous_labels)
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
