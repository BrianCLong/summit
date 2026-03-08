"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncIngestWorker = exports.AsyncIngestDispatcher = exports.InMemoryAsyncIngestRepository = exports.PgAsyncIngestRepository = void 0;
exports.calculatePayloadHash = calculatePayloadHash;
exports.calculateBackoffDelay = calculateBackoffDelay;
const crypto_1 = require("crypto");
const residency_guard_js_1 = require("../data-residency/residency-guard.js");
const regional_config_js_1 = require("../config/regional-config.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
}
function calculatePayloadHash(payload) {
    return (0, crypto_1.createHash)('sha256')
        .update(stableStringify(payload))
        .digest('hex');
}
function calculateBackoffDelay(attempts, baseMs = 500, maxMs = 30_000) {
    const delay = baseMs * Math.pow(2, Math.max(0, attempts - 1));
    return Math.min(delay, maxMs);
}
class CircuitBreaker {
    threshold;
    cooldownMs;
    failures = new Map();
    openUntil = new Map();
    constructor(threshold = 3, cooldownMs = 10_000) {
        this.threshold = threshold;
        this.cooldownMs = cooldownMs;
    }
    canPass(key, now) {
        const openUntil = this.openUntil.get(key) || 0;
        return openUntil <= now;
    }
    recordSuccess(key) {
        this.failures.delete(key);
        this.openUntil.delete(key);
    }
    recordFailure(key, now) {
        const current = this.failures.get(key) || 0;
        const next = current + 1;
        this.failures.set(key, next);
        if (next >= this.threshold) {
            this.openUntil.set(key, now + this.cooldownMs);
        }
    }
}
class PgAsyncIngestRepository {
    pool;
    workerId;
    constructor(pool, workerId = 'pg-worker') {
        this.pool = pool;
        this.workerId = workerId;
    }
    async insertJobWithOutbox(payload, payloadHash, idempotencyKey) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const existing = await client.query(`SELECT *
         FROM ingest_async_jobs
         WHERE tenant_id = $1
           AND (payload_hash = $2 OR (idempotency_key IS NOT NULL AND idempotency_key = $3))
         LIMIT 1
         FOR UPDATE`, [payload.tenantId, payloadHash, idempotencyKey || null]);
            if (existing.rows.length > 0) {
                await client.query('COMMIT');
                return { job: this.mapRow(existing.rows[0]), duplicate: true };
            }
            const jobId = (0, crypto_1.randomUUID)();
            const jobResult = await client.query(`INSERT INTO ingest_async_jobs (
           id, tenant_id, payload, payload_hash, idempotency_key,
           status, attempts, next_attempt_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'PENDING', 0, NOW(), NOW(), NOW())
         RETURNING *`, [jobId, payload.tenantId, payload, payloadHash, idempotencyKey || null]);
            await client.query(`INSERT INTO ingest_async_outbox (job_id, event_type, payload, next_attempt_at, locked_by)
         VALUES ($1, 'ingest.requested', $2, NOW(), $3)`, [jobId, payload, this.workerId]);
            await client.query('COMMIT');
            return { job: this.mapRow(jobResult.rows[0]), duplicate: false };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async claimPending(batchSize, now) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(`SELECT 
           o.id as outbox_id,
           o.attempts as outbox_attempts,
           o.next_attempt_at,
           o.processed_at,
           o.last_error as outbox_error,
           j.*
         FROM ingest_async_outbox o
         JOIN ingest_async_jobs j ON j.id = o.job_id
         WHERE o.processed_at IS NULL
           AND o.next_attempt_at <= $1
         ORDER BY o.created_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED`, [now, batchSize]);
            const events = [];
            for (const row of rows) {
                await client.query(`UPDATE ingest_async_outbox
             SET attempts = $2, locked_at = NOW(), locked_by = $3
           WHERE id = $1`, [row.outbox_id, Number(row.outbox_attempts || 0) + 1, this.workerId]);
                events.push({
                    id: row.outbox_id,
                    jobId: row.id,
                    attempts: Number(row.outbox_attempts || 0) + 1,
                    nextAttemptAt: row.next_attempt_at,
                    processedAt: row.processed_at,
                    lastError: row.outbox_error,
                    job: this.mapRow(row),
                });
            }
            await client.query('COMMIT');
            return events;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async markJobProcessing(jobId) {
        await this.pool.query(`UPDATE ingest_async_jobs
         SET status = 'PROCESSING',
             attempts = attempts + 1,
             updated_at = NOW(),
             locked_at = NOW(),
             next_attempt_at = NOW()
       WHERE id = $1`, [jobId]);
    }
    async markJobCompleted(jobId) {
        await this.pool.query(`UPDATE ingest_async_jobs
         SET status = 'COMPLETED',
             updated_at = NOW(),
             last_error = NULL
       WHERE id = $1`, [jobId]);
    }
    async markJobFailed(jobId, error) {
        await this.pool.query(`UPDATE ingest_async_jobs
         SET status = 'FAILED',
             updated_at = NOW(),
             last_error = $2
       WHERE id = $1`, [jobId, error]);
    }
    async markOutboxProcessed(outboxId) {
        await this.pool.query(`UPDATE ingest_async_outbox
         SET processed_at = NOW(),
             last_error = NULL,
             locked_at = NULL,
             locked_by = NULL
       WHERE id = $1`, [outboxId]);
    }
    async rescheduleOutbox(outboxId, nextAttemptAt, error) {
        await this.pool.query(`UPDATE ingest_async_outbox
         SET next_attempt_at = $2,
             last_error = $3,
             locked_at = NULL,
             locked_by = NULL
       WHERE id = $1`, [outboxId, nextAttemptAt, error || null]);
    }
    async countProcessingForTenant(tenantId) {
        const { rows } = await this.pool.query(`SELECT COUNT(*)::int AS count
         FROM ingest_async_jobs
        WHERE tenant_id = $1
          AND status = 'PROCESSING'`, [tenantId]);
        return Number(rows[0]?.count || 0);
    }
    async getProcessingCounts(tenantIds) {
        if (tenantIds.length === 0)
            return new Map();
        const { rows } = await this.pool.query(`SELECT tenant_id, COUNT(*)::int AS count
         FROM ingest_async_jobs
        WHERE tenant_id = ANY($1)
          AND status = 'PROCESSING'
        GROUP BY tenant_id`, [tenantIds]);
        const map = new Map();
        // Initialize with 0 for all requested tenants to ensure safe lookups
        tenantIds.forEach((id) => map.set(id, 0));
        rows.forEach((row) => {
            map.set(row.tenant_id, Number(row.count));
        });
        return map;
    }
    mapRow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            payload: row.payload,
            payloadHash: row.payload_hash,
            idempotencyKey: row.idempotency_key,
            status: row.status,
            attempts: Number(row.attempts || 0),
            nextAttemptAt: row.next_attempt_at,
            lastError: row.last_error,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.PgAsyncIngestRepository = PgAsyncIngestRepository;
class InMemoryAsyncIngestRepository {
    jobs = new Map();
    outbox = new Map();
    seq = 1;
    async insertJobWithOutbox(payload, payloadHash, idempotencyKey) {
        const duplicateJob = Array.from(this.jobs.values()).find((job) => job.tenantId === payload.tenantId &&
            (job.payloadHash === payloadHash ||
                (!!idempotencyKey && job.idempotencyKey === idempotencyKey)));
        if (duplicateJob) {
            return { job: duplicateJob, duplicate: true };
        }
        const job = {
            id: (0, crypto_1.randomUUID)(),
            tenantId: payload.tenantId,
            payload,
            payloadHash,
            idempotencyKey: idempotencyKey || null,
            status: 'PENDING',
            attempts: 0,
            nextAttemptAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastError: null,
        };
        this.jobs.set(job.id, job);
        const outbox = {
            id: this.seq++,
            jobId: job.id,
            attempts: 0,
            nextAttemptAt: new Date(),
            processedAt: null,
            job,
        };
        this.outbox.set(outbox.id, outbox);
        return { job, duplicate: false };
    }
    async claimPending(batchSize, now) {
        const events = Array.from(this.outbox.values())
            .filter((evt) => !evt.processedAt &&
            evt.nextAttemptAt.getTime() <= now.getTime() &&
            this.jobs.get(evt.jobId))
            .sort((a, b) => a.id - b.id)
            .slice(0, batchSize);
        const claimed = [];
        for (const event of events) {
            const nextAttempts = event.attempts + 1;
            const updated = {
                ...event,
                attempts: nextAttempts,
                job: this.jobs.get(event.jobId),
            };
            this.outbox.set(event.id, updated);
            claimed.push(updated);
        }
        return claimed;
    }
    async markJobProcessing(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.jobs.set(jobId, {
            ...job,
            status: 'PROCESSING',
            attempts: job.attempts + 1,
            updatedAt: new Date(),
        });
    }
    async markJobCompleted(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.jobs.set(jobId, {
            ...job,
            status: 'COMPLETED',
            updatedAt: new Date(),
            lastError: null,
        });
    }
    async markJobFailed(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job)
            return;
        this.jobs.set(jobId, {
            ...job,
            status: 'FAILED',
            updatedAt: new Date(),
            lastError: error,
        });
    }
    async markOutboxProcessed(outboxId) {
        const evt = this.outbox.get(outboxId);
        if (!evt)
            return;
        this.outbox.set(outboxId, { ...evt, processedAt: new Date() });
    }
    async rescheduleOutbox(outboxId, nextAttemptAt, error) {
        const evt = this.outbox.get(outboxId);
        if (!evt)
            return;
        this.outbox.set(outboxId, {
            ...evt,
            nextAttemptAt,
            lastError: error,
        });
    }
    async countProcessingForTenant(tenantId) {
        return Array.from(this.jobs.values()).filter((job) => job.tenantId === tenantId && job.status === 'PROCESSING').length;
    }
    async getProcessingCounts(tenantIds) {
        const map = new Map();
        tenantIds.forEach((id) => map.set(id, 0));
        const jobs = Array.from(this.jobs.values());
        for (const job of jobs) {
            if (job.status === 'PROCESSING' && tenantIds.includes(job.tenantId)) {
                map.set(job.tenantId, (map.get(job.tenantId) || 0) + 1);
            }
        }
        return map;
    }
}
exports.InMemoryAsyncIngestRepository = InMemoryAsyncIngestRepository;
class AsyncIngestDispatcher {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async enqueue(payload, idempotencyKey) {
        const payloadHash = calculatePayloadHash(payload);
        const { job, duplicate } = await this.repo.insertJobWithOutbox(payload, payloadHash, idempotencyKey);
        return {
            jobId: job.id,
            duplicate,
            status: job.status,
            payloadHash,
        };
    }
}
exports.AsyncIngestDispatcher = AsyncIngestDispatcher;
class AsyncIngestWorker {
    repo;
    ingestService;
    options;
    timer;
    breaker = new CircuitBreaker();
    inFlight = new Map();
    constructor(repo, ingestService, options = {}) {
        this.repo = repo;
        this.ingestService = ingestService;
        this.options = options;
        this.options = {
            batchSize: 25,
            baseBackoffMs: 500,
            maxBackoffMs: 30_000,
            maxTenantConcurrency: Number(process.env.ASYNC_INGEST_TENANT_CONCURRENCY || '2') || 2,
            pollIntervalMs: 1000,
            ...options,
        };
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => {
            this.processOnce().catch((err) => {
                logger_js_1.default.error({ err }, 'Async ingest worker tick failed');
            });
        }, this.options.pollIntervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async processOnce(now = new Date()) {
        const events = await this.repo.claimPending(this.options.batchSize, now);
        const uniqueTenants = Array.from(new Set(events.map((e) => e.job.tenantId)));
        const dbCounts = await this.repo.getProcessingCounts(uniqueTenants);
        for (const event of events) {
            const tenantId = event.job.tenantId;
            if (event.job.status === 'COMPLETED') {
                await this.repo.markOutboxProcessed(event.id);
                continue;
            }
            const active = (this.inFlight.get(tenantId) || 0) + (dbCounts.get(tenantId) || 0);
            if (active >= this.options.maxTenantConcurrency) {
                const delayMs = calculateBackoffDelay(event.attempts, this.options.baseBackoffMs, this.options.maxBackoffMs);
                await this.repo.rescheduleOutbox(event.id, new Date(now.getTime() + delayMs), 'Tenant concurrency cap reached');
                continue;
            }
            if (!this.breaker.canPass('ingest', now.getTime())) {
                const delayMs = this.options.baseBackoffMs;
                await this.repo.rescheduleOutbox(event.id, new Date(now.getTime() + delayMs), 'Circuit breaker open');
                continue;
            }
            this.inFlight.set(tenantId, (this.inFlight.get(tenantId) || 0) + 1);
            await this.repo.markJobProcessing(event.jobId);
            const guard = residency_guard_js_1.ResidencyGuard.getInstance();
            const isAllowed = await guard.isRegionAllowed(tenantId, (0, regional_config_js_1.getCurrentRegion)(), 'storage');
            if (!isAllowed) {
                const delayMs = calculateBackoffDelay(event.attempts, this.options.baseBackoffMs, this.options.maxBackoffMs);
                await this.repo.markOutboxProcessed(event.id); // Or keep it in outbox for retry in correct region?
                // For now, fail it as it's a residency violation to process here.
                await this.repo.markJobFailed(event.jobId, `Residency violation: Current region ${(0, regional_config_js_1.getCurrentRegion)()} is not allowed for tenant.`);
                this.inFlight.set(tenantId, Math.max(0, (this.inFlight.get(tenantId) || 1) - 1));
                continue;
            }
            try {
                await this.ingestService.ingest(event.job.payload);
                await this.repo.markJobCompleted(event.jobId);
                await this.repo.markOutboxProcessed(event.id);
                this.breaker.recordSuccess('ingest');
            }
            catch (error) {
                const delayMs = calculateBackoffDelay(event.attempts, this.options.baseBackoffMs, this.options.maxBackoffMs);
                await this.repo.markJobFailed(event.jobId, error?.message || 'Unknown ingest failure');
                await this.repo.rescheduleOutbox(event.id, new Date(now.getTime() + delayMs), error?.message);
                this.breaker.recordFailure('ingest', now.getTime());
            }
            finally {
                this.inFlight.set(tenantId, Math.max(0, (this.inFlight.get(tenantId) || 1) - 1));
            }
        }
    }
}
exports.AsyncIngestWorker = AsyncIngestWorker;
