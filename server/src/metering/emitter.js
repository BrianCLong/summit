"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meteringEmitter = exports.MeteringEmitter = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const pipeline_js_1 = require("./pipeline.js");
const schema_js_1 = require("./schema.js");
class MeteringEmitter {
    async emit(event) {
        await pipeline_js_1.meteringPipeline.enqueue(event);
    }
    async emitIngestUnits(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.INGEST_UNITS,
            tenantId: input.tenantId,
            units: input.units,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitPolicySimulation(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.POLICY_SIMULATION,
            tenantId: input.tenantId,
            rulesCount: input.rulesCount,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitWorkflowExecution(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.WORKFLOW_EXECUTION,
            tenantId: input.tenantId,
            workflowName: input.workflowName,
            stepsCount: input.stepsCount,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitReceiptWrite(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.RECEIPT_WRITE,
            tenantId: input.tenantId,
            action: input.action,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitQueryCredits(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.QUERY_CREDITS,
            tenantId: input.tenantId,
            credits: input.credits,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitStorageEstimate(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.STORAGE_BYTES_ESTIMATE,
            tenantId: input.tenantId,
            bytes: input.bytes,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitActiveSeat(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.USER_SEAT_ACTIVE,
            tenantId: input.tenantId,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
            seatCount: input.seatCount ?? 1,
            userId: input.userId,
        });
    }
    async emitLlmTokens(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.LLM_TOKENS,
            tenantId: input.tenantId,
            tokens: input.tokens,
            model: input.model,
            provider: input.provider,
            source: input.source,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitComputeMs(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.MAESTRO_COMPUTE_MS,
            tenantId: input.tenantId,
            durationMs: input.durationMs,
            source: input.source,
            taskId: input.taskId,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async emitApiRequest(input) {
        await this.safeEmit({
            kind: schema_js_1.MeterEventKind.API_REQUEST,
            tenantId: input.tenantId,
            source: input.source,
            endpoint: input.endpoint,
            method: input.method,
            statusCode: input.statusCode,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            metadata: input.metadata,
        });
    }
    async safeEmit(event) {
        try {
            await this.emit(event);
        }
        catch (error) {
            logger_js_1.default.warn({ error, event }, 'Failed to emit meter event');
        }
    }
}
exports.MeteringEmitter = MeteringEmitter;
exports.meteringEmitter = new MeteringEmitter();
