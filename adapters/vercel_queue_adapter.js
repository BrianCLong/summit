"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VercelQueueAdapter = void 0;
const feature_flags_1 = require("../config/feature_flags");
class VercelQueueAdapter {
    async enqueue(job) {
        if (!feature_flags_1.featureFlags.VERCEL_QUEUE_ENABLED) {
            throw new Error('Vercel Queues feature flag is OFF. Enqueue rejected.');
        }
        // Vercel Queues public API abstraction
        // In a real implementation this would call `import { enqueue } from '@vercel/functions'`
        return {
            jobId: job.id,
            status: 'enqueued',
            enqueuedAt: Date.now() // Note: In deterministic evidence we would avoid wall clocks
        };
    }
    async getStatus(jobId) {
        if (!feature_flags_1.featureFlags.VERCEL_QUEUE_ENABLED) {
            throw new Error('Vercel Queues feature flag is OFF. Status check rejected.');
        }
        // Public API abstraction
        return {
            jobId,
            status: 'pending',
            attempts: 0
        };
    }
}
exports.VercelQueueAdapter = VercelQueueAdapter;
