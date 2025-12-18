/**
 * Data Factory Service - Workflow Service
 *
 * Manages multi-stage labeling workflows with configurable stages and quality settings.
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../db/connection.js';
import {
  LabelingWorkflow,
  WorkflowStage,
  TaskType,
  QualitySettings,
  CompletionCriteria,
  AnnotatorRole,
} from '../types/index.js';
import { AuditService } from './AuditService.js';
import { LabelingService } from './LabelingService.js';
import { SampleService } from './SampleService.js';
import pino from 'pino';

const logger = pino({ name: 'workflow-service' });

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  datasetId: string;
  taskType: TaskType;
  stages: Array<{
    name: string;
    type: 'annotation' | 'review' | 'adjudication' | 'export';
    requiredRole: AnnotatorRole;
    minAnnotators: number;
    samplingStrategy: 'all' | 'random' | 'stratified' | 'active_learning';
    samplingRate?: number;
    completionCriteria: CompletionCriteria;
  }>;
  qualitySettings: QualitySettings;
}

export class WorkflowService {
  private auditService: AuditService;
  private labelingService: LabelingService;
  private sampleService: SampleService;

  constructor(
    auditService: AuditService,
    labelingService: LabelingService,
    sampleService: SampleService
  ) {
    this.auditService = auditService;
    this.labelingService = labelingService;
    this.sampleService = sampleService;
  }

  async create(
    request: CreateWorkflowRequest,
    createdBy: string
  ): Promise<LabelingWorkflow> {
    const id = uuidv4();
    const stages = request.stages.map((stage) => ({
      ...stage,
      id: uuidv4(),
    }));

    const result = await query<{
      id: string;
      name: string;
      description: string;
      dataset_id: string;
      task_type: TaskType;
      stages: string;
      current_stage_index: number;
      status: 'draft' | 'active' | 'paused' | 'completed';
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      completed_at: Date | null;
    }>(
      `INSERT INTO labeling_workflows (
        id, name, description, dataset_id, task_type, stages, status,
        golden_question_frequency, min_agreement_threshold, review_sampling_rate,
        max_annotations_per_sample, disagreement_resolution, auto_approval_threshold,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        request.name,
        request.description,
        request.datasetId,
        request.taskType,
        JSON.stringify(stages),
        'draft',
        request.qualitySettings.goldenQuestionFrequency,
        request.qualitySettings.minAgreementThreshold,
        request.qualitySettings.reviewSamplingRate,
        request.qualitySettings.maxAnnotationsPerSample,
        request.qualitySettings.disagreementResolution,
        request.qualitySettings.autoApprovalThreshold || null,
        createdBy,
      ]
    );

    const workflow = this.mapRowToWorkflow(result.rows[0]);

    await this.auditService.log({
      entityType: 'workflow',
      entityId: id,
      action: 'create',
      actorId: createdBy,
      actorRole: 'user',
      newState: workflow as unknown as Record<string, unknown>,
      metadata: { datasetId: request.datasetId },
    });

    logger.info({ workflowId: id, name: request.name }, 'Workflow created');
    return workflow;
  }

  async getById(id: string): Promise<LabelingWorkflow | null> {
    const result = await query<{
      id: string;
      name: string;
      description: string;
      dataset_id: string;
      task_type: TaskType;
      stages: string;
      current_stage_index: number;
      status: 'draft' | 'active' | 'paused' | 'completed';
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      completed_at: Date | null;
    }>('SELECT * FROM labeling_workflows WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWorkflow(result.rows[0]);
  }

  async getByDataset(datasetId: string): Promise<LabelingWorkflow[]> {
    const result = await query<{
      id: string;
      name: string;
      description: string;
      dataset_id: string;
      task_type: TaskType;
      stages: string;
      current_stage_index: number;
      status: 'draft' | 'active' | 'paused' | 'completed';
      golden_question_frequency: number;
      min_agreement_threshold: number;
      review_sampling_rate: number;
      max_annotations_per_sample: number;
      disagreement_resolution: string;
      auto_approval_threshold: number | null;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      completed_at: Date | null;
    }>(
      'SELECT * FROM labeling_workflows WHERE dataset_id = $1 ORDER BY created_at DESC',
      [datasetId]
    );

    return result.rows.map((row) => this.mapRowToWorkflow(row));
  }

  async start(id: string, startedBy: string): Promise<LabelingWorkflow> {
    const workflow = await this.getById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    if (workflow.status !== 'draft' && workflow.status !== 'paused') {
      throw new Error(`Cannot start workflow in status: ${workflow.status}`);
    }

    await transaction(async (client) => {
      // Update workflow status
      await client.query(
        `UPDATE labeling_workflows SET status = 'active' WHERE id = $1`,
        [id]
      );

      // Create labeling jobs for the first stage
      const currentStage = workflow.stages[workflow.currentStageIndex];
      await this.createJobsForStage(workflow, currentStage, startedBy);
    });

    await this.auditService.log({
      entityType: 'workflow',
      entityId: id,
      action: 'start',
      actorId: startedBy,
      actorRole: 'admin',
      previousState: { status: workflow.status },
      newState: { status: 'active' },
      metadata: {},
    });

    logger.info({ workflowId: id }, 'Workflow started');
    return (await this.getById(id))!;
  }

  async pause(id: string, pausedBy: string): Promise<LabelingWorkflow> {
    const workflow = await this.getById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Cannot pause workflow in status: ${workflow.status}`);
    }

    await query(
      `UPDATE labeling_workflows SET status = 'paused' WHERE id = $1`,
      [id]
    );

    await this.auditService.log({
      entityType: 'workflow',
      entityId: id,
      action: 'pause',
      actorId: pausedBy,
      actorRole: 'admin',
      metadata: {},
    });

    logger.info({ workflowId: id }, 'Workflow paused');
    return (await this.getById(id))!;
  }

  async advanceStage(id: string, advancedBy: string): Promise<LabelingWorkflow> {
    const workflow = await this.getById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Cannot advance workflow in status: ${workflow.status}`);
    }

    const currentStage = workflow.stages[workflow.currentStageIndex];
    const isComplete = await this.checkStageCompletion(workflow, currentStage);

    if (!isComplete) {
      throw new Error('Current stage completion criteria not met');
    }

    const nextStageIndex = workflow.currentStageIndex + 1;

    if (nextStageIndex >= workflow.stages.length) {
      // Workflow complete
      await query(
        `UPDATE labeling_workflows
         SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await this.auditService.log({
        entityType: 'workflow',
        entityId: id,
        action: 'complete',
        actorId: advancedBy,
        actorRole: 'admin',
        metadata: {},
      });

      logger.info({ workflowId: id }, 'Workflow completed');
    } else {
      // Move to next stage
      await transaction(async (client) => {
        await client.query(
          `UPDATE labeling_workflows SET current_stage_index = $1 WHERE id = $2`,
          [nextStageIndex, id]
        );

        const nextStage = workflow.stages[nextStageIndex];
        await this.createJobsForStage(workflow, nextStage, advancedBy);
      });

      await this.auditService.log({
        entityType: 'workflow',
        entityId: id,
        action: 'advance_stage',
        actorId: advancedBy,
        actorRole: 'admin',
        previousState: { stageIndex: workflow.currentStageIndex },
        newState: { stageIndex: nextStageIndex },
        metadata: {},
      });

      logger.info(
        { workflowId: id, stageIndex: nextStageIndex },
        'Workflow advanced to next stage'
      );
    }

    return (await this.getById(id))!;
  }

  async getProgress(id: string): Promise<{
    workflow: LabelingWorkflow;
    currentStage: WorkflowStage;
    stageProgress: {
      samplesTotal: number;
      samplesLabeled: number;
      samplesApproved: number;
      agreementScore: number;
      qualityScore: number;
    };
    overallProgress: number;
  }> {
    const workflow = await this.getById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    const currentStage = workflow.stages[workflow.currentStageIndex];

    // Get sample statistics
    const sampleStats = await this.sampleService.getStatistics(workflow.datasetId);

    // Get labeling statistics
    const jobStats = await this.labelingService.getJobStatistics(workflow.datasetId);

    const samplesLabeled = sampleStats.byStatus?.completed || 0;
    const samplesApproved = sampleStats.byStatus?.approved || 0;

    // Calculate agreement score (simplified)
    const agreementScore = await this.calculateAgreementScore(workflow.datasetId);

    // Calculate quality score based on golden question accuracy
    const qualityScore = await this.calculateQualityScore(workflow.datasetId);

    const overallProgress =
      workflow.stages.length > 0
        ? (workflow.currentStageIndex +
            (samplesLabeled > 0 ? samplesLabeled / sampleStats.total : 0)) /
          workflow.stages.length
        : 0;

    return {
      workflow,
      currentStage,
      stageProgress: {
        samplesTotal: sampleStats.total,
        samplesLabeled,
        samplesApproved,
        agreementScore,
        qualityScore,
      },
      overallProgress: Math.min(1, overallProgress),
    };
  }

  async delete(id: string, deletedBy: string): Promise<void> {
    const workflow = await this.getById(id);
    if (!workflow) {
      throw new Error(`Workflow not found: ${id}`);
    }

    if (workflow.status === 'active') {
      throw new Error('Cannot delete active workflow. Pause it first.');
    }

    await query('DELETE FROM labeling_workflows WHERE id = $1', [id]);

    await this.auditService.log({
      entityType: 'workflow',
      entityId: id,
      action: 'delete',
      actorId: deletedBy,
      actorRole: 'admin',
      previousState: workflow as unknown as Record<string, unknown>,
      metadata: {},
    });

    logger.info({ workflowId: id }, 'Workflow deleted');
  }

  private async createJobsForStage(
    workflow: LabelingWorkflow,
    stage: WorkflowStage,
    createdBy: string
  ): Promise<void> {
    // Get samples for this stage based on sampling strategy
    let sampleIds: string[];

    if (stage.samplingStrategy === 'all') {
      const result = await query<{ id: string }>(
        'SELECT id FROM samples WHERE dataset_id = $1',
        [workflow.datasetId]
      );
      sampleIds = result.rows.map((r) => r.id);
    } else if (stage.samplingStrategy === 'random') {
      const rate = stage.samplingRate || 1;
      const result = await query<{ id: string }>(
        `SELECT id FROM samples WHERE dataset_id = $1
         ORDER BY RANDOM()
         LIMIT (SELECT CEIL(COUNT(*) * $2) FROM samples WHERE dataset_id = $1)`,
        [workflow.datasetId, rate]
      );
      sampleIds = result.rows.map((r) => r.id);
    } else {
      // Default to all for now
      const result = await query<{ id: string }>(
        'SELECT id FROM samples WHERE dataset_id = $1',
        [workflow.datasetId]
      );
      sampleIds = result.rows.map((r) => r.id);
    }

    if (sampleIds.length > 0) {
      const instructions = this.getInstructionsForStage(stage);
      await this.labelingService.createJobsForSamples(
        workflow.datasetId,
        sampleIds,
        workflow.taskType,
        instructions,
        `${workflow.id}-${stage.id}`,
        createdBy
      );
    }

    logger.info(
      { workflowId: workflow.id, stageId: stage.id, sampleCount: sampleIds.length },
      'Jobs created for workflow stage'
    );
  }

  private async checkStageCompletion(
    workflow: LabelingWorkflow,
    stage: WorkflowStage
  ): Promise<boolean> {
    const criteria = stage.completionCriteria;

    if (criteria.minSamplesLabeled) {
      const stats = await this.sampleService.getStatistics(workflow.datasetId);
      const labeledCount =
        (stats.byStatus?.completed || 0) + (stats.byStatus?.approved || 0);
      if (labeledCount < criteria.minSamplesLabeled) {
        return false;
      }
    }

    if (criteria.minAgreementThreshold) {
      const agreementScore = await this.calculateAgreementScore(workflow.datasetId);
      if (agreementScore < criteria.minAgreementThreshold) {
        return false;
      }
    }

    if (criteria.minQualityScore) {
      const qualityScore = await this.calculateQualityScore(workflow.datasetId);
      if (qualityScore < criteria.minQualityScore) {
        return false;
      }
    }

    return true;
  }

  private async calculateAgreementScore(datasetId: string): Promise<number> {
    // Calculate inter-annotator agreement
    // This is a simplified version - a full implementation would use Cohen's Kappa or similar
    const result = await query<{ agreement: string }>(
      `WITH sample_labels AS (
        SELECT
          ls.sample_id,
          ls.labels,
          COUNT(*) OVER (PARTITION BY ls.sample_id) as label_count
        FROM label_sets ls
        JOIN samples s ON ls.sample_id = s.id
        WHERE s.dataset_id = $1 AND ls.status IN ('completed', 'approved')
      )
      SELECT
        COALESCE(AVG(CASE WHEN label_count >= 2 THEN 1.0 ELSE 0.0 END), 0) as agreement
      FROM sample_labels`,
      [datasetId]
    );

    return parseFloat(result.rows[0].agreement) || 0;
  }

  private async calculateQualityScore(datasetId: string): Promise<number> {
    // Calculate quality based on golden question accuracy
    const result = await query<{ accuracy: string }>(
      `SELECT
        COALESCE(
          AVG(CASE WHEN ls.labels::text = s.expected_label::text THEN 1.0 ELSE 0.0 END),
          1.0
        ) as accuracy
       FROM samples s
       JOIN label_sets ls ON s.id = ls.sample_id
       WHERE s.dataset_id = $1
         AND s.is_golden = true
         AND ls.status IN ('completed', 'approved')`,
      [datasetId]
    );

    return parseFloat(result.rows[0].accuracy) || 1;
  }

  private getInstructionsForStage(stage: WorkflowStage): string {
    const baseInstructions: Record<string, string> = {
      annotation:
        'Please review the sample and provide accurate labels according to the guidelines.',
      review:
        'Review the submitted labels for accuracy and consistency. Approve or reject as appropriate.',
      adjudication:
        'Resolve disagreements between annotators. Make the final decision on the correct label.',
      export: 'Verify the data is ready for export.',
    };

    return baseInstructions[stage.type] || 'Complete the assigned task.';
  }

  private mapRowToWorkflow(row: {
    id: string;
    name: string;
    description: string;
    dataset_id: string;
    task_type: TaskType;
    stages: string;
    current_stage_index: number;
    status: 'draft' | 'active' | 'paused' | 'completed';
    golden_question_frequency: number;
    min_agreement_threshold: number;
    review_sampling_rate: number;
    max_annotations_per_sample: number;
    disagreement_resolution: string;
    auto_approval_threshold: number | null;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
  }): LabelingWorkflow {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      datasetId: row.dataset_id,
      taskType: row.task_type,
      stages: JSON.parse(row.stages),
      currentStageIndex: row.current_stage_index,
      status: row.status,
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
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
    };
  }
}
