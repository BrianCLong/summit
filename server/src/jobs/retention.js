"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retentionEngine = void 0;
exports.purgeOldSuggestions = purgeOldSuggestions;
exports.initializeDataRetentionPolicies = initializeDataRetentionPolicies;
const postgres_js_1 = require("../db/postgres.js");
const dataRetentionEngine_js_1 = require("../governance/retention/dataRetentionEngine.js");
const scheduler_js_1 = require("../governance/retention/scheduler.js");
const pool = (0, postgres_js_1.getPostgresPool)();
const scheduler = new scheduler_js_1.RetentionScheduler(60000);
exports.retentionEngine = new dataRetentionEngine_js_1.DataRetentionEngine({ pool, scheduler });
const AI_SUGGESTION_DATASET_ID = 'ai-suggestions';
async function ensureAiSuggestionDataset(days) {
    const existing = exports.retentionEngine.getRecord(AI_SUGGESTION_DATASET_ID);
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
        await exports.retentionEngine.registerDataset(metadata, 'system');
        await exports.retentionEngine.schedulePurge(AI_SUGGESTION_DATASET_ID, intervalMs);
        return;
    }
    if (!existing.schedule) {
        await exports.retentionEngine.schedulePurge(AI_SUGGESTION_DATASET_ID, intervalMs);
    }
}
async function purgeOldSuggestions(days = 90) {
    await ensureAiSuggestionDataset(days);
    await exports.retentionEngine.purgeDataset(AI_SUGGESTION_DATASET_ID, 'manual');
}
async function initializeDataRetentionPolicies() {
    await ensureAiSuggestionDataset(90);
}
