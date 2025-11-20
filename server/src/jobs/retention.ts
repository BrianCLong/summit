import { getPostgresPool } from '../db/postgres.js';
import { DataRetentionEngine } from '../governance/retention/dataRetentionEngine.js';
import { RetentionScheduler } from '../governance/retention/scheduler.js';
import { DatasetMetadata } from '../governance/retention/types.js';
import { queueManager } from '../queue/index.js';
import { QueueName } from '../queue/types.js';

const pool = getPostgresPool();
const scheduler = new RetentionScheduler(60000);
export const retentionEngine = new DataRetentionEngine({ pool, scheduler });

const AI_SUGGESTION_DATASET_ID = 'ai-suggestions';

async function ensureAiSuggestionDataset(days: number): Promise<void> {
  const existing = retentionEngine.getRecord(AI_SUGGESTION_DATASET_ID);
  const intervalMs = days * 24 * 60 * 60 * 1000;

  if (!existing) {
    const metadata: DatasetMetadata = {
      datasetId: AI_SUGGESTION_DATASET_ID,
      name: 'AI Investigative Suggestions',
      description: 'Graph-native AI assistance content surfaced to analysts.',
      dataType: 'analytics',
      containsPersonalData: true,
      containsFinancialData: false,
      containsHealthData: false,
      jurisdictions: ['global'],
      tags: [
        'neo4j:label:AISuggestion',
        'retention:auto',
        'postgres:table:ai_suggestions_shadow',
      ],
      storageSystems: ['neo4j', 'postgres'],
      owner: 'governance@intelgraph.dev',
      createdAt: new Date(),
      recordCount: undefined,
    };

    await retentionEngine.registerDataset(metadata, 'system');
    await scheduleRetentionJob(AI_SUGGESTION_DATASET_ID, intervalMs);
    return;
  }

  if (!existing.schedule) {
    await scheduleRetentionJob(AI_SUGGESTION_DATASET_ID, intervalMs);
  }
}

async function scheduleRetentionJob(datasetId: string, intervalMs: number) {
  // Deprecating in-memory scheduler in favor of distributed BullMQ
  // await retentionEngine.schedulePurge(datasetId, intervalMs);

  // Schedule in BullMQ for robustness and distributed execution
  await queueManager.addJob(
    QueueName.RETENTION,
    `purge-${datasetId}`,
    {
      type: 'retention-purge',
      payload: { datasetId, mode: 'scheduled' }
    },
    {
      repeat: { every: intervalMs }
    }
  );
}

export async function purgeOldSuggestions(days = 90): Promise<void> {
  await ensureAiSuggestionDataset(days);
  // Trigger immediate job
  await queueManager.addJob(
    QueueName.RETENTION,
    `manual-purge-${AI_SUGGESTION_DATASET_ID}-${Date.now()}`,
    {
        type: 'retention-purge',
        payload: { datasetId: AI_SUGGESTION_DATASET_ID, mode: 'manual' }
    }
  );
}

export async function initializeDataRetentionPolicies(): Promise<void> {
  await ensureAiSuggestionDataset(90);
}
