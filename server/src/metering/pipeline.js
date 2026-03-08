"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meteringPipeline = exports.MeteringPipeline = void 0;
// @ts-nocheck
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const postgres_repository_js_1 = require("./postgres-repository.js");
const persistence_js_1 = require("./persistence.js");
const schema_js_1 = require("./schema.js");
const dateKey = (d) => d.toISOString().slice(0, 10);
const MAX_CACHE_SIZE = 10000;
class MeteringPipeline {
    processedKeys = new Set();
    deadLetters = [];
    rollups = new Map();
    cleanupTimer;
    constructor() {
        // Periodically clean up cache to avoid memory leak
        this.cleanupTimer = setInterval(() => this.cleanupCache(), 1000 * 60 * 60); // Every hour
        this.cleanupTimer.unref?.();
    }
    cleanupCache() {
        if (this.processedKeys.size > MAX_CACHE_SIZE) {
            this.processedKeys.clear();
            logger_js_1.default.info('Cleared metering idempotency cache');
        }
    }
    async enqueue(event) {
        try {
            await this.handleEvent(event);
        }
        catch (error) {
            this.deadLetters.push({
                event,
                reason: error.message,
            });
            logger_js_1.default.warn({ error, event }, 'MeteringPipeline moved event to DLQ');
        }
    }
    async replayDLQ(transform) {
        const stillDead = [];
        let replayed = 0;
        for (const dlq of this.deadLetters) {
            const event = transform ? transform(dlq.event) : dlq.event;
            try {
                await this.handleEvent(event);
                replayed++;
            }
            catch (error) {
                stillDead.push({
                    event,
                    reason: error.message,
                });
            }
        }
        this.deadLetters = stillDead;
        return { replayed, remaining: this.deadLetters.length };
    }
    getDeadLetters() {
        return [...this.deadLetters];
    }
    getDailyRollups() {
        return Array.from(this.rollups.values());
    }
    reset() {
        this.processedKeys.clear();
        this.deadLetters = [];
        this.rollups.clear();
    }
    async handleEvent(event) {
        const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
        // Ensure unique key for tests without idempotencyKey
        const idempotencyKey = event.idempotencyKey || event.correlationId || this.buildSyntheticKey(event);
        // In-memory dedup for speed
        if (this.processedKeys.has(idempotencyKey)) {
            return;
        }
        this.validate(event);
        // Persist to Postgres (Handles Idempotency)
        const eventWithKey = { ...event, idempotencyKey };
        try {
            const inserted = await postgres_repository_js_1.postgresMeterRepository.recordEvent(eventWithKey);
            if (inserted === false) {
                this.processedKeys.add(idempotencyKey);
                return;
            }
        }
        catch (err) {
            logger_js_1.default.error({ err }, 'Failed to persist meter event');
        }
        // Write to Integrity Log (File Store)
        try {
            await persistence_js_1.meterStore.append(event);
        }
        catch (err) {
            logger_js_1.default.error({ err }, 'Failed to append to meter store');
            // We might want to throw here to DLQ, but for now we log.
            throw err;
        }
        this.processedKeys.add(idempotencyKey);
        const day = dateKey(occurred);
        const key = `${event.tenantId}:${day}`;
        const current = this.rollups.get(key) ||
            {
                tenantId: event.tenantId,
                date: day,
                ingestUnits: 0,
                queryCredits: 0,
                storageBytesEstimate: 0,
                activeSeats: 0,
                llmTokens: 0,
                computeMs: 0,
                apiRequests: 0,
                policySimulations: 0,
                workflowExecutions: 0,
                receiptWrites: 0,
                correlationIds: [],
                lastEventAt: occurred.toISOString(),
            };
        switch (event.kind) {
            case schema_js_1.MeterEventKind.INGEST_UNITS:
                current.ingestUnits += event.units;
                break;
            case schema_js_1.MeterEventKind.QUERY_CREDITS:
                current.queryCredits += event.credits;
                break;
            case schema_js_1.MeterEventKind.STORAGE_BYTES_ESTIMATE:
                current.storageBytesEstimate += event.bytes;
                break;
            case schema_js_1.MeterEventKind.USER_SEAT_ACTIVE:
                current.activeSeats += event.seatCount ?? 1;
                break;
            case schema_js_1.MeterEventKind.LLM_TOKENS:
                current.llmTokens = (current.llmTokens || 0) + event.tokens;
                break;
            case schema_js_1.MeterEventKind.MAESTRO_COMPUTE_MS:
                current.computeMs = (current.computeMs || 0) + event.durationMs;
                break;
            case schema_js_1.MeterEventKind.API_REQUEST:
                current.apiRequests = (current.apiRequests || 0) + 1;
                break;
            case schema_js_1.MeterEventKind.POLICY_SIMULATION:
                current.policySimulations = (current.policySimulations || 0) + 1;
                break;
            case schema_js_1.MeterEventKind.WORKFLOW_EXECUTION:
                current.workflowExecutions = (current.workflowExecutions || 0) + 1;
                break;
            case schema_js_1.MeterEventKind.RECEIPT_WRITE:
                current.receiptWrites = (current.receiptWrites || 0) + 1;
                break;
            default:
                break;
        }
        current.lastEventAt = occurred.toISOString();
        if (event.correlationId) {
            const seen = new Set(current.correlationIds);
            seen.add(event.correlationId);
            current.correlationIds = Array.from(seen);
        }
        this.rollups.set(key, current);
    }
    validate(event) {
        if (!event.tenantId) {
            throw new Error('tenantId is required');
        }
        if (event.kind === schema_js_1.MeterEventKind.INGEST_UNITS && event.units < 0) {
            throw new Error('ingest units must be non-negative');
        }
        if (event.kind === schema_js_1.MeterEventKind.QUERY_CREDITS && event.credits < 0) {
            throw new Error('query credits must be non-negative');
        }
        if (event.kind === schema_js_1.MeterEventKind.STORAGE_BYTES_ESTIMATE && event.bytes < 0) {
            throw new Error('storage bytes must be non-negative');
        }
        if (event.kind === schema_js_1.MeterEventKind.USER_SEAT_ACTIVE && (event.seatCount ?? 0) < 0) {
            throw new Error('seat count must be non-negative');
        }
        if (event.kind === schema_js_1.MeterEventKind.LLM_TOKENS && event.tokens < 0) {
            throw new Error('llm tokens must be non-negative');
        }
        if (event.kind === schema_js_1.MeterEventKind.MAESTRO_COMPUTE_MS && event.durationMs < 0) {
            throw new Error('compute duration must be non-negative');
        }
    }
    buildSyntheticKey(event) {
        const occurred = event.occurredAt ? new Date(event.occurredAt) : new Date();
        const unique = Math.random().toString(36).substring(7);
        return `${event.tenantId}:${event.kind}:${event.source}:${occurred.toISOString()}:${unique}`;
    }
}
exports.MeteringPipeline = MeteringPipeline;
exports.meteringPipeline = new MeteringPipeline();
