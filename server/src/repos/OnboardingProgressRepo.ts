import type { Pool } from 'pg';
import logger from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';

export type OnboardingStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface OnboardingStepRecord {
  key: string;
  title: string;
  description: string;
  status: OnboardingStepStatus;
  completed: boolean;
  data: Record<string, unknown> | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface OnboardingProgressRecord {
  userId: string;
  steps: OnboardingStepRecord[];
  currentStepKey: string | null;
  completed: boolean;
  completedAt: string | null;
}

export const DEFAULT_ONBOARDING_STEPS: Array<Pick<OnboardingStepRecord, 'key' | 'title' | 'description'>> = [
  {
    key: 'connect-data',
    title: 'Connect Data Sources',
    description: 'Authenticate a data source and configure ingestion windows to bring your first dataset online.',
  },
  {
    key: 'map-entities',
    title: 'Model Entities & Relationships',
    description: 'Align incoming fields with graph entities and relationships to unlock explainable analytics.',
  },
  {
    key: 'create-first-query',
    title: 'Create Your First Query',
    description: 'Author and save a starter Cypher query to validate the ingestion pipeline and surface insights.',
  },
  {
    key: 'share-insights',
    title: 'Share Insights with Stakeholders',
    description: 'Publish dashboards or schedule alerts so teammates can act on the intelligence you curated.',
  },
];

type StepPersistenceRow = {
  step_key: string;
  status: OnboardingStepStatus;
  completed: boolean;
  data: Record<string, unknown> | null;
  completed_at: Date | null;
  updated_at: Date | null;
};

export class OnboardingProgressRepo {
  private readonly pool: Pool;
  private readonly memoryStore: Map<string, Map<string, OnboardingStepRecord>> = new Map();
  private readonly log = logger.child({ module: 'OnboardingProgressRepo' });

  constructor(pool?: Pool) {
    this.pool = pool ?? getPostgresPool();
  }

  async getProgress(userId: string): Promise<OnboardingProgressRecord> {
    const dbRows = await this.fetchRows(userId).catch((error) => {
      this.log.warn({ err: error, userId }, 'Falling back to in-memory onboarding progress store.');
      return [] as StepPersistenceRow[];
    });

    const mergedRows = new Map<string, StepPersistenceRow>();
    for (const row of dbRows) {
      mergedRows.set(row.step_key, row);
    }

    const memorySteps = this.memoryStore.get(userId);
    if (memorySteps) {
      for (const [key, step] of memorySteps.entries()) {
        if (!mergedRows.has(key)) {
          mergedRows.set(key, {
            step_key: key,
            status: step.status,
            completed: step.completed,
            data: step.data,
            completed_at: step.completedAt ? new Date(step.completedAt) : null,
            updated_at: step.updatedAt ? new Date(step.updatedAt) : null,
          });
        }
      }
    }

    const steps: OnboardingStepRecord[] = DEFAULT_ONBOARDING_STEPS.map((definition) => {
      const row = mergedRows.get(definition.key);
      const completed = row?.completed ?? false;
      const status: OnboardingStepStatus = row?.status
        ? row.status
        : completed
        ? 'COMPLETED'
        : 'NOT_STARTED';

      return {
        key: definition.key,
        title: definition.title,
        description: definition.description,
        status,
        completed,
        data: (row?.data as Record<string, unknown> | null) ?? null,
        updatedAt: row?.updated_at ? row.updated_at.toISOString() : null,
        completedAt: row?.completed_at ? row.completed_at.toISOString() : null,
      };
    });

    const completedSteps = steps.filter((step) => step.completed);
    const completedAt = completedSteps.length === steps.length
      ? completedSteps.reduce<string | null>((latest, step) => {
          if (!step.completedAt) {
            return latest;
          }
          if (!latest || step.completedAt > latest) {
            return step.completedAt;
          }
          return latest;
        }, null)
      : null;

    const currentStep = steps.find((step) => !step.completed)?.key ?? null;

    return {
      userId,
      steps,
      currentStepKey: currentStep,
      completed: completedSteps.length === steps.length,
      completedAt,
    };
  }

  async upsertStep(input: {
    userId: string;
    stepKey: string;
    status?: OnboardingStepStatus;
    completed: boolean;
    data?: Record<string, unknown> | null;
  }): Promise<OnboardingProgressRecord> {
    const { userId, stepKey } = input;
    const definition = DEFAULT_ONBOARDING_STEPS.find((step) => step.key === stepKey);
    if (!definition) {
      throw new Error(`Unknown onboarding step: ${stepKey}`);
    }

    const status: OnboardingStepStatus = input.completed
      ? 'COMPLETED'
      : input.status ?? (input.data && Object.keys(input.data).length > 0 ? 'IN_PROGRESS' : 'NOT_STARTED');

    const data = input.data ?? null;

    const payload = [userId, stepKey, status, input.completed, data];

    const query = `
      INSERT INTO onboarding_progress (user_id, step_key, status, completed, data, completed_at)
      VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), CASE WHEN $4 THEN NOW() ELSE NULL END)
      ON CONFLICT (user_id, step_key)
      DO UPDATE
        SET status = EXCLUDED.status,
            completed = EXCLUDED.completed,
            data = EXCLUDED.data,
            completed_at = CASE
              WHEN EXCLUDED.completed THEN COALESCE(onboarding_progress.completed_at, NOW())
              ELSE NULL
            END,
            updated_at = NOW()
      RETURNING step_key, status, completed, data, completed_at, updated_at;
    `;

    let dbResult: StepPersistenceRow | undefined;
    try {
      const result = await this.pool.query(query, payload as any[]);
      dbResult = result.rows?.[0] as StepPersistenceRow | undefined;
    } catch (error) {
      this.log.warn({ err: error, userId, stepKey }, 'Failed to persist onboarding progress to PostgreSQL; using memory store.');
    }

    const now = new Date().toISOString();
    const completedAt = input.completed
      ? dbResult?.completed_at?.toISOString?.() ?? now
      : null;

    const record: OnboardingStepRecord = {
      key: stepKey,
      title: definition.title,
      description: definition.description,
      status,
      completed: input.completed,
      data,
      updatedAt: dbResult?.updated_at?.toISOString?.() ?? now,
      completedAt,
    };

    const userStore = this.getUserStore(userId);
    userStore.set(stepKey, record);

    return await this.getProgress(userId);
  }

  async reset(userId: string): Promise<boolean> {
    try {
      await this.pool.query('DELETE FROM onboarding_progress WHERE user_id = $1', [userId]);
    } catch (error) {
      this.log.warn({ err: error, userId }, 'Failed to reset onboarding progress in PostgreSQL; clearing memory store only.');
    }

    this.memoryStore.delete(userId);
    return true;
  }

  private getUserStore(userId: string): Map<string, OnboardingStepRecord> {
    if (!this.memoryStore.has(userId)) {
      this.memoryStore.set(userId, new Map());
    }

    return this.memoryStore.get(userId)!;
  }

  private async fetchRows(userId: string): Promise<StepPersistenceRow[]> {
    const result = await this.pool.query<StepPersistenceRow>(
      `SELECT step_key, status, completed, data, completed_at, updated_at
       FROM onboarding_progress
       WHERE user_id = $1`,
      [userId],
    );

    return result.rows ?? [];
  }
}
