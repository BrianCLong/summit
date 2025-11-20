/**
 * StageManager - Manage model stage transitions with approval workflows
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { StageTransition, StageTransitionSchema, ModelStage } from '../types.js';

export interface ApprovalChecklist {
  item: string;
  completed: boolean;
  notes?: string;
}

export class StageManager {
  private pool: Pool;
  private logger: pino.Logger;

  constructor(pool: Pool) {
    this.pool = pool;
    this.logger = pino({ name: 'stage-manager' });
  }

  /**
   * Initialize stage management tables
   */
  async initialize(): Promise<void> {
    const createTransitionsTable = `
      CREATE TABLE IF NOT EXISTS ml_stage_transitions (
        id UUID PRIMARY KEY,
        model_id UUID NOT NULL,
        version VARCHAR(100) NOT NULL,
        from_stage VARCHAR(50) NOT NULL,
        to_stage VARCHAR(50) NOT NULL,
        approved_by VARCHAR(255),
        approval_date TIMESTAMPTZ,
        reason TEXT,
        checklist JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_transitions_model_id ON ml_stage_transitions(model_id);
      CREATE INDEX IF NOT EXISTS idx_transitions_dates ON ml_stage_transitions(created_at DESC);
    `;

    await this.pool.query(createTransitionsTable);
    this.logger.info('Stage manager initialized');
  }

  /**
   * Request a stage transition
   */
  async requestTransition(
    modelId: string,
    version: string,
    toStage: ModelStage,
    reason?: string,
    checklist: ApprovalChecklist[] = []
  ): Promise<StageTransition> {
    // Get current stage
    const modelQuery = 'SELECT stage FROM ml_models WHERE id = $1 AND version = $2';
    const modelResult = await this.pool.query(modelQuery, [modelId, version]);

    if (modelResult.rows.length === 0) {
      throw new Error(`Model ${modelId} version ${version} not found`);
    }

    const fromStage = modelResult.rows[0].stage as ModelStage;

    // Validate transition
    this.validateTransition(fromStage, toStage);

    const id = uuidv4();
    const now = new Date().toISOString();

    const transition: StageTransition = {
      id,
      model_id: modelId,
      version,
      from_stage: fromStage,
      to_stage: toStage,
      reason,
      checklist,
      created_at: now,
    };

    const validated = StageTransitionSchema.parse(transition);

    const query = `
      INSERT INTO ml_stage_transitions (
        id, model_id, version, from_stage, to_stage, reason, checklist, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.model_id,
      validated.version,
      validated.from_stage,
      validated.to_stage,
      validated.reason,
      JSON.stringify(validated.checklist),
      validated.created_at,
    ];

    const result = await this.pool.query(query, values);

    this.logger.info(
      { transitionId: id, modelId, fromStage, toStage },
      'Stage transition requested'
    );

    return this.parseTransitionRow(result.rows[0]);
  }

  /**
   * Approve a stage transition
   */
  async approveTransition(
    transitionId: string,
    approvedBy: string,
    checklist?: ApprovalChecklist[]
  ): Promise<void> {
    const transition = await this.getTransition(transitionId);
    if (!transition) {
      throw new Error(`Transition ${transitionId} not found`);
    }

    // Update checklist if provided
    const finalChecklist = checklist || transition.checklist;

    // Verify all checklist items are completed
    const allCompleted = finalChecklist.every(item => item.completed);
    if (!allCompleted) {
      throw new Error('All checklist items must be completed before approval');
    }

    const now = new Date().toISOString();

    // Update transition
    const updateTransitionQuery = `
      UPDATE ml_stage_transitions
      SET approved_by = $1, approval_date = $2, checklist = $3
      WHERE id = $4
    `;

    await this.pool.query(updateTransitionQuery, [
      approvedBy,
      now,
      JSON.stringify(finalChecklist),
      transitionId,
    ]);

    // Update model stage
    const updateModelQuery = `
      UPDATE ml_models
      SET stage = $1, updated_at = $2
      WHERE id = $3 AND version = $4
    `;

    await this.pool.query(updateModelQuery, [
      transition.to_stage,
      now,
      transition.model_id,
      transition.version,
    ]);

    this.logger.info(
      { transitionId, approvedBy, toStage: transition.to_stage },
      'Stage transition approved'
    );
  }

  /**
   * Get transition by ID
   */
  async getTransition(transitionId: string): Promise<StageTransition | null> {
    const query = 'SELECT * FROM ml_stage_transitions WHERE id = $1';
    const result = await this.pool.query(query, [transitionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseTransitionRow(result.rows[0]);
  }

  /**
   * List transitions for a model
   */
  async listTransitions(modelId: string, version?: string): Promise<StageTransition[]> {
    let query = 'SELECT * FROM ml_stage_transitions WHERE model_id = $1';
    const params: any[] = [modelId];

    if (version) {
      query += ' AND version = $2';
      params.push(version);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);

    return result.rows.map(row => this.parseTransitionRow(row));
  }

  /**
   * Get pending transitions (not approved)
   */
  async getPendingTransitions(): Promise<StageTransition[]> {
    const query = `
      SELECT * FROM ml_stage_transitions
      WHERE approved_by IS NULL
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);

    return result.rows.map(row => this.parseTransitionRow(row));
  }

  /**
   * Get default checklist for a stage transition
   */
  getDefaultChecklist(fromStage: ModelStage, toStage: ModelStage): ApprovalChecklist[] {
    const checklists: Record<string, ApprovalChecklist[]> = {
      'development->staging': [
        { item: 'Model training completed successfully', completed: false },
        { item: 'Model evaluation metrics meet minimum thresholds', completed: false },
        { item: 'Model code reviewed and approved', completed: false },
        { item: 'Unit tests passing', completed: false },
        { item: 'Integration tests passing', completed: false },
      ],
      'staging->production': [
        { item: 'Model performance validated on staging data', completed: false },
        { item: 'A/B test results reviewed', completed: false },
        { item: 'Security review completed', completed: false },
        { item: 'Fairness and bias testing completed', completed: false },
        { item: 'Robustness testing completed', completed: false },
        { item: 'Model monitoring configured', completed: false },
        { item: 'Rollback plan documented', completed: false },
        { item: 'Stakeholder approval obtained', completed: false },
      ],
      'production->archived': [
        { item: 'Replacement model deployed', completed: false },
        { item: 'Traffic migrated to new model', completed: false },
        { item: 'Documentation updated', completed: false },
      ],
    };

    const key = `${fromStage}->${toStage}`;
    return checklists[key] || [];
  }

  /**
   * Validate if a stage transition is allowed
   */
  private validateTransition(fromStage: ModelStage, toStage: ModelStage): void {
    const validTransitions: Record<ModelStage, ModelStage[]> = {
      [ModelStage.DEVELOPMENT]: [ModelStage.STAGING, ModelStage.ARCHIVED],
      [ModelStage.STAGING]: [ModelStage.PRODUCTION, ModelStage.DEVELOPMENT, ModelStage.ARCHIVED],
      [ModelStage.PRODUCTION]: [ModelStage.STAGING, ModelStage.ARCHIVED],
      [ModelStage.ARCHIVED]: [], // Cannot transition from archived
    };

    const allowedTransitions = validTransitions[fromStage];

    if (!allowedTransitions.includes(toStage)) {
      throw new Error(`Invalid stage transition: ${fromStage} -> ${toStage}`);
    }
  }

  /**
   * Parse transition row
   */
  private parseTransitionRow(row: any): StageTransition {
    return StageTransitionSchema.parse({
      ...row,
      checklist: row.checklist || [],
    });
  }
}
