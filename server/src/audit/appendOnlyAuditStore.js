"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRecordHash = exports.auditEventHash = exports.AppendOnlyAuditStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const pino_1 = __importDefault(require("pino"));
const audit_event_v1_json_1 = __importDefault(require("../../../schemas/audit_event_v1.json"));
const ajv = new _2020_1.default({ allErrors: true, removeAdditional: true });
(0, ajv_formats_1.default)(ajv);
const validateEvent = ajv.compile(audit_event_v1_json_1.default);
const canonicalizeEvent = (event) => ({
    version: event.version,
    actor: { ...event.actor },
    action: event.action,
    resource: { ...event.resource },
    classification: event.classification,
    policy_version: event.policy_version,
    decision_id: event.decision_id,
    trace_id: event.trace_id,
    timestamp: event.timestamp,
    customer: event.customer,
    metadata: event.metadata ? { ...event.metadata } : undefined,
});
const hashPayload = (event) => crypto_1.default.createHash('sha256').update(JSON.stringify(canonicalizeEvent(event))).digest('hex');
const hashRecord = (record) => crypto_1.default
    .createHash('sha256')
    .update(JSON.stringify({
    sequence: record.sequence,
    recorded_at: record.recorded_at,
    prev_hash: record.prev_hash,
    payload_hash: record.payload_hash,
}))
    .digest('hex');
const defaultStorePath = () => process.env.AUDIT_EVENT_STORE ?? path_1.default.join(process.cwd(), 'logs', 'audit', 'audit-events.jsonl');
const readLastRecord = (filePath) => {
    if (!fs_1.default.existsSync(filePath))
        return null;
    const content = fs_1.default.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(Boolean);
    if (!lines.length)
        return null;
    try {
        return JSON.parse(lines[lines.length - 1]);
    }
    catch {
        return null;
    }
};
class AppendOnlyAuditStore {
    filePath;
    logger;
    sequence = 0;
    lastHash = 'GENESIS';
    constructor(options = {}) {
        this.filePath = options.filePath ?? defaultStorePath();
        this.logger =
            options.logger ??
                pino_1.default({
                    name: 'append-only-audit-store',
                    level: process.env.LOG_LEVEL || 'info',
                });
        fs_1.default.mkdirSync(path_1.default.dirname(this.filePath), { recursive: true });
        const tail = readLastRecord(this.filePath);
        if (tail) {
            this.sequence = tail.sequence;
            this.lastHash = tail.hash;
        }
    }
    async append(event) {
        const candidate = {
            ...event,
            trace_id: event.trace_id || crypto_1.default.randomUUID(),
            timestamp: event.timestamp || new Date().toISOString(),
        };
        const valid = validateEvent(candidate);
        if (!valid) {
            const errors = validateEvent.errors?.map((e) => `${e.instancePath} ${e.message}`).join('; ');
            throw new Error(`Invalid audit event: ${errors ?? 'unknown error'}`);
        }
        const payload_hash = hashPayload(candidate);
        const recordBase = {
            sequence: this.sequence + 1,
            recorded_at: new Date().toISOString(),
            prev_hash: this.lastHash,
            payload_hash,
            event: canonicalizeEvent(candidate),
        };
        const hash = hashRecord(recordBase);
        const record = { ...recordBase, hash };
        await fs_1.default.promises.appendFile(this.filePath, `${JSON.stringify(record)}\n`, 'utf8');
        this.sequence = record.sequence;
        this.lastHash = record.hash;
        this.logger.debug({ sequence: record.sequence, hash: record.hash }, 'Appended audit record');
        return record;
    }
    async verify() {
        if (!fs_1.default.existsSync(this.filePath)) {
            return { ok: true, checked: 0, errors: [] };
        }
        const contents = await fs_1.default.promises.readFile(this.filePath, 'utf8');
        const lines = contents.split('\n').filter(Boolean);
        let expectedPrev = 'GENESIS';
        const errors = [];
        let lastHash;
        lines.forEach((line, index) => {
            let record;
            try {
                record = JSON.parse(line);
            }
            catch {
                errors.push(`line ${index + 1}: invalid JSON`);
                return;
            }
            const computed = hashRecord({
                sequence: record.sequence,
                recorded_at: record.recorded_at,
                prev_hash: record.prev_hash,
                payload_hash: record.payload_hash,
                event: record.event,
            });
            if (record.prev_hash !== expectedPrev) {
                errors.push(`line ${index + 1}: prev_hash mismatch (expected ${expectedPrev}, got ${record.prev_hash})`);
            }
            if (computed !== record.hash) {
                errors.push(`line ${index + 1}: hash mismatch (expected ${computed}, got ${record.hash})`);
            }
            expectedPrev = record.hash;
            lastHash = record.hash;
        });
        return {
            ok: errors.length === 0,
            checked: lines.length,
            errors,
            last_hash: lastHash,
        };
    }
    async readRange(options = {}) {
        if (!fs_1.default.existsSync(this.filePath))
            return [];
        const contents = await fs_1.default.promises.readFile(this.filePath, 'utf8');
        const lines = contents.split('\n').filter(Boolean);
        const fromTime = options.from ? new Date(options.from).getTime() : null;
        const toTime = options.to ? new Date(options.to).getTime() : null;
        return lines
            .map((line) => JSON.parse(line))
            .filter((record) => {
            const eventTime = new Date(record.event.timestamp).getTime();
            const matchesCustomer = options.customer
                ? record.event.customer === options.customer
                : true;
            const afterFrom = fromTime !== null ? eventTime >= fromTime : true;
            const beforeTo = toTime !== null ? eventTime <= toTime : true;
            return matchesCustomer && afterFrom && beforeTo;
        });
    }
}
exports.AppendOnlyAuditStore = AppendOnlyAuditStore;
exports.auditEventHash = hashPayload;
exports.auditRecordHash = hashRecord;
