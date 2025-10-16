import { getPostgresPool } from '../db/postgres.js';
import { DataRetentionEngine } from '../governance/retention/dataRetentionEngine.js';
import { RetentionScheduler } from '../governance/retention/scheduler.js';
const pool = getPostgresPool();
const scheduler = new RetentionScheduler(60000);
export const retentionEngine = new DataRetentionEngine({ pool, scheduler });
const AI_SUGGESTION_DATASET_ID = 'ai-suggestions';
async function ensureAiSuggestionDataset(days) {
    const existing = retentionEngine.getRecord(AI_SUGGESTION_DATASET_ID);
    const intervalMs = days * 24 * 60 * 60 * 1000;
    if (!existing) {
        const metadata = {
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
        await retentionEngine.schedulePurge(AI_SUGGESTION_DATASET_ID, intervalMs);
        return;
    }
    if (!existing.schedule) {
        await retentionEngine.schedulePurge(AI_SUGGESTION_DATASET_ID, intervalMs);
    }
}
export async function purgeOldSuggestions(days = 90) {
    await ensureAiSuggestionDataset(days);
    await retentionEngine.purgeDataset(AI_SUGGESTION_DATASET_ID, 'manual');
}
export async function initializeDataRetentionPolicies() {
    await ensureAiSuggestionDataset(90);
}
//# sourceMappingURL=retention.js.map