import { getPostgresPool } from '../db/postgres.js';
import { logger } from '../config/logger.js';

export interface ReviewItem {
    id: string;
    queueId: string;
    tenantId: string;
    data: any;
    confidence: number;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ABSTAINED';
    createdAt: Date;
    reviewedAt?: Date;
    reviewerId?: string;
    ageMinutes?: number;
}

export interface QueueConfig {
    // Arbitrary config
    [key: string]: any;
}

export interface ReviewQueue {
    id: string;
    tenantId: string;
    name: string;
    priorityConfig: QueueConfig;
    createdAt: Date;
}

export class ReviewQueueService {
    private static instance: ReviewQueueService;

    private constructor() { }

    public static getInstance(): ReviewQueueService {
        if (!ReviewQueueService.instance) {
            ReviewQueueService.instance = new ReviewQueueService();
        }
        return ReviewQueueService.instance;
    }

    async createQueue(tenantId: string, name: string, config: QueueConfig = {}): Promise<ReviewQueue> {
        const pool = getPostgresPool();
        const result = await pool.query<{ id: string, tenant_id: string, name: string, priority_config: any, created_at: Date }>(
            `INSERT INTO ml_review_queues (tenant_id, name, priority_config)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [tenantId, name, config]
        );
        return this.mapQueueRow(result.rows[0]);
    }

    async updateQueue(queueId: string, tenantId: string, updates: Partial<Pick<ReviewQueue, 'name' | 'priorityConfig'>>): Promise<ReviewQueue> {
        const pool = getPostgresPool();
        const result = await pool.query(
            `UPDATE ml_review_queues
             SET name = COALESCE($1, name), priority_config = COALESCE($2, priority_config), updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [updates.name ?? null, updates.priorityConfig ?? null, queueId, tenantId]
        );
        if (result.rowCount === 0) throw new Error('Queue not found');
        return this.mapQueueRow(result.rows[0]);
    }

    async deleteQueue(queueId: string, tenantId: string): Promise<void> {
        const pool = getPostgresPool();
        const result = await pool.query(
            `DELETE FROM ml_review_queues WHERE id = $1 AND tenant_id = $2`,
            [queueId, tenantId]
        );
        if (result.rowCount === 0) throw new Error('Queue not found');
    }

    async listQueues(tenantId: string): Promise<ReviewQueue[]> {
        const pool = getPostgresPool();
        const result = await pool.query(
            `SELECT * FROM ml_review_queues WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
        );
        return result.rows.map((row: any) => this.mapQueueRow(row));
    }

    async enqueueItem(queueId: string, tenantId: string, data: any, confidence: number): Promise<ReviewItem> {
        const pool = getPostgresPool();
        const result = await pool.query(
            `INSERT INTO ml_review_items (queue_id, tenant_id, data, confidence, status)
             VALUES ($1, $2, $3, $4, 'PENDING')
             RETURNING *`,
            [queueId, tenantId, data, confidence]
        );
        const row = result.rows[0];
        return this.mapItemRow(row);
    }

    /**
     * Gets a batch of items for review using priority sampling.
     * Priority = (1 - confidence) * 0.8 + min(age / 120, 0.2)
     */
    async getItemsForReview(queueId: string, tenantId: string, limit: number = 50): Promise<ReviewItem[]> {
        const pool = getPostgresPool();
        // Fetch pending items.
        // For performance on large queues, we might want to LIMIT this fetch, but to sample correctly we strictly need a candidate set.
        // Let's fetch top 500 by age or simple randomness to sample from, or just fetch all if manageable.
        // Assuming queue size isn't massive for this MVP, or we rely on the DB to return a candidate set.
        // Let's fetch 5x the limit to sample from.

        const candidateLimit = limit * 5;
        const result = await pool.query(
            `SELECT *, EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as age_minutes
             FROM ml_review_items
             WHERE queue_id = $1 AND tenant_id = $2 AND status = 'PENDING'
             ORDER BY confidence ASC
             LIMIT $3`,
            [queueId, tenantId, candidateLimit]
        );

        const items = result.rows.map((row: any) => this.mapItemRow(row));

        // Apply Priority Sampler
        return this.sampleItems(items, limit);
    }

    private sampleItems(items: ReviewItem[], k: number): ReviewItem[] {
        if (items.length <= k) return items;

        // Calculate scores
        const scores = items.map(item => {
            const ageMinutes = item.ageMinutes || 0;
            // Lower confidence = higher priority.
            // Decay with age bonus (older items get a bump up to 0.2 score boost).
            return (1.0 - item.confidence) * 0.8 + Math.min(ageMinutes / 120.0, 0.2);
        });

        // Normalize to probabilities
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const probs = totalScore > 0
            ? scores.map(s => s / totalScore)
            : items.map(() => 1.0 / items.length);

        // Weighted random sampling without replacement
        const sampled: ReviewItem[] = [];
        const indices = Array.from({ length: items.length }, (_, i) => i);

        // Simple implementation of weighted sampling:
        // For k items: select one based on prob, remove, re-normalize, repeat.
        // (Or just use the scores to sort if we want deterministic "highest priority" vs "stochastic sampling")
        // The prompt implies "sampler", which usually means stochastic.
        // However, standard weighted choice in JS is manual.

        // Let's implement a simple version:
        // 1. Create a pool of indices with weights.
        // 2. Select k.

        // To avoid complexity of re-normalizing, we can just pick k times.
        // But "priority sampler" often implies strict priority?
        // "Priority sampler: uncertainty (entropy) × recency weighting."
        // The provided python code does `np.random.choice(..., p=probs)`.

        const selectedIndices = new Set<number>();

        while (selectedIndices.size < k && selectedIndices.size < items.length) {
            let r = Math.random();
            let cumulative = 0;
            let selected = -1;

            // Re-calculate total for remaining items to ensure prob sums to 1
            let currentTotal = 0;
            for (let i = 0; i < indices.length; i++) {
                if (!selectedIndices.has(i)) {
                    currentTotal += scores[i];
                }
            }

            if (currentTotal === 0) {
                // Remaining have 0 score, pick random
                const remaining = indices.filter(i => !selectedIndices.has(i));
                selected = remaining[Math.floor(Math.random() * remaining.length)];
            } else {
                for (let i = 0; i < indices.length; i++) {
                    if (selectedIndices.has(i)) continue;

                    const normalizedProb = scores[i] / currentTotal;
                    cumulative += normalizedProb;
                    if (r <= cumulative) {
                        selected = i;
                        break;
                    }
                }
            }

            if (selected !== -1) {
                selectedIndices.add(selected);
            } else {
                // Fallback if rounding errors prevent selection
                const remaining = indices.filter(i => !selectedIndices.has(i));
                if (remaining.length > 0) {
                    selectedIndices.add(remaining[0]);
                } else {
                    break;
                }
            }
        }

        return Array.from(selectedIndices).map(idx => items[idx]);
    }

    async submitDecision(itemId: string, tenantId: string, reviewerId: string, decision: 'ACCEPTED' | 'REJECTED' | 'ABSTAIN', metadata: any = {}): Promise<void> {
        const pool = getPostgresPool();
        const status = decision === 'ABSTAIN' ? 'ABSTAINED' : decision;

        await pool.withTransaction(async (client) => {
            // Update item status
            const updateResult = await client.query(
                `UPDATE ml_review_items
                 SET status = $1, reviewed_at = NOW(), reviewer_id = $2
                 WHERE id = $3 AND tenant_id = $4`,
                [status, reviewerId, itemId, tenantId]
            );

            if (updateResult.rowCount === 0) {
                throw new Error('Item not found or already reviewed');
            }

            // Log decision
            await client.query(
                `INSERT INTO ml_review_decisions (item_id, tenant_id, reviewer_id, decision, metadata)
                 VALUES ($1, $2, $3, $4, $5)`,
                [itemId, tenantId, reviewerId, decision, metadata]
            );
        });
    }

    async submitBatchDecisions(decisions: Array<{ itemId: string, decision: 'ACCEPTED' | 'REJECTED' | 'ABSTAIN', metadata?: any }>, tenantId: string, reviewerId: string): Promise<void> {
        if (decisions.length === 0) return;
        const pool = getPostgresPool();

        await pool.withTransaction(async (client) => {
            // Optimization: Could use UNNEST for bulk updates, but loop in transaction is acceptable for moderate batch sizes (e.g. 50)
            for (const d of decisions) {
                const status = d.decision === 'ABSTAIN' ? 'ABSTAINED' : d.decision;
                // Update item status
                const updateResult = await client.query(
                    `UPDATE ml_review_items
                     SET status = $1, reviewed_at = NOW(), reviewer_id = $2
                     WHERE id = $3 AND tenant_id = $4`,
                    [status, reviewerId, d.itemId, tenantId]
                );

                if (updateResult.rowCount === 0) {
                    // In batch mode, we skip failed items or could collect errors.
                    // For now, skipping to avoid partial failure blocking the rest,
                    // but logging would be good.
                    continue;
                }

                // Log decision
                await client.query(
                    `INSERT INTO ml_review_decisions (item_id, tenant_id, reviewer_id, decision, metadata)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [d.itemId, tenantId, reviewerId, d.decision, d.metadata || {}]
                );
            }
        });
    }

    async getQueueStats(queueId: string, tenantId: string) {
        const pool = getPostgresPool();
        const result = await pool.query(
            `SELECT status, COUNT(*) as count
             FROM ml_review_items
             WHERE queue_id = $1 AND tenant_id = $2
             GROUP BY status`,
            [queueId, tenantId]
        );
        return result.rows;
    }

    private mapItemRow(row: any): ReviewItem {
        return {
            id: row.id,
            queueId: row.queue_id,
            tenantId: row.tenant_id,
            data: row.data,
            confidence: parseFloat(row.confidence),
            status: row.status,
            createdAt: row.created_at,
            reviewedAt: row.reviewed_at,
            reviewerId: row.reviewer_id,
            ageMinutes: row.age_minutes ? parseFloat(row.age_minutes) : undefined
        };
    }

    private mapQueueRow(row: any): ReviewQueue {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            priorityConfig: row.priority_config,
            createdAt: row.created_at
        };
    }
}

export const reviewQueueService = ReviewQueueService.getInstance();
