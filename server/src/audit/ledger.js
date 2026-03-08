"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuditLedgerChain = exports.AuditLedger = exports.hashPayload = exports.safePayloadFromEvent = exports.getLedgerFilePath = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pino_1 = __importDefault(require("pino"));
const logEventBus_js_1 = require("../logging/logEventBus.js");
const defaultLedgerFilePath = () => {
    const auditDir = process.env.AUDIT_LOG_DIR ?? path_1.default.join(process.cwd(), 'logs', 'audit');
    return path_1.default.join(auditDir, 'audit-ledger.jsonl');
};
const getLedgerFilePath = () => process.env.AUDIT_LEDGER_FILE ?? defaultLedgerFilePath();
exports.getLedgerFilePath = getLedgerFilePath;
const safePayloadFromEvent = (event) => ({
    level: event.level,
    timestamp: event.timestamp ?? new Date().toISOString(),
    correlationId: event.correlationId,
    traceId: event.traceId,
    spanId: event.spanId,
    tenantId: event.tenantId,
    source: event.source,
    service: event.service,
});
exports.safePayloadFromEvent = safePayloadFromEvent;
const hashPayload = (payload) => crypto_1.default.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
exports.hashPayload = hashPayload;
const hashEntry = (entry) => crypto_1.default
    .createHash('sha256')
    .update(JSON.stringify({
    eventId: entry.eventId,
    prevHash: entry.prevHash,
    payloadHash: entry.payloadHash,
    timestamp: entry.timestamp,
}))
    .digest('hex');
const readLastLedgerEntry = (ledgerFilePath) => {
    if (!fs_1.default.existsSync(ledgerFilePath)) {
        return null;
    }
    const contents = fs_1.default.readFileSync(ledgerFilePath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);
    if (lines.length === 0) {
        return null;
    }
    try {
        return JSON.parse(lines[lines.length - 1]);
    }
    catch {
        return null;
    }
};
class AuditLedger {
    ledgerFilePath;
    logger;
    unsubscribe;
    lastHash = 'GENESIS';
    constructor(options = {}) {
        this.ledgerFilePath = options.ledgerFilePath ?? (0, exports.getLedgerFilePath)();
        this.logger =
            options.logger ??
                pino_1.default({
                    name: 'audit-ledger',
                    level: process.env.LOG_LEVEL || 'info',
                });
        fs_1.default.mkdirSync(path_1.default.dirname(this.ledgerFilePath), { recursive: true });
        const lastEntry = readLastLedgerEntry(this.ledgerFilePath);
        if (lastEntry?.eventHash) {
            this.lastHash = lastEntry.eventHash;
        }
        const bus = options.bus ?? logEventBus_js_1.logEventBus;
        this.unsubscribe = bus.subscribe((event) => {
            this.recordEvent(event).catch((error) => {
                this.logger.error({ error }, 'Failed to append audit ledger entry');
            });
        });
    }
    stop() {
        this.unsubscribe();
    }
    async recordEvent(event) {
        const payload = (0, exports.safePayloadFromEvent)(event);
        const payloadHash = (0, exports.hashPayload)(payload);
        const entry = {
            eventId: crypto_1.default.randomUUID(),
            prevHash: this.lastHash,
            payloadHash,
            timestamp: payload.timestamp,
        };
        const eventHash = hashEntry(entry);
        const record = { ...entry, eventHash };
        await fs_1.default.promises.appendFile(this.ledgerFilePath, `${JSON.stringify(record)}\n`, 'utf8');
        this.lastHash = eventHash;
    }
}
exports.AuditLedger = AuditLedger;
const verifyAuditLedgerChain = async ({ ledgerFilePath = (0, exports.getLedgerFilePath)(), since, } = {}) => {
    if (!fs_1.default.existsSync(ledgerFilePath)) {
        return {
            ok: true,
            checked: 0,
            errors: [],
            lastHash: undefined,
            since,
        };
    }
    const contents = await fs_1.default.promises.readFile(ledgerFilePath, 'utf8');
    const lines = contents.split('\n').filter(Boolean);
    const errors = [];
    let expectedPrevHash = 'GENESIS';
    let checked = 0;
    let lastHash;
    const sinceTime = since ? new Date(since).getTime() : null;
    lines.forEach((line, index) => {
        let entry;
        try {
            entry = JSON.parse(line);
        }
        catch {
            errors.push(`line ${index + 1}: invalid JSON`);
            return;
        }
        const entryTime = Number.isFinite(new Date(entry.timestamp).getTime())
            ? new Date(entry.timestamp).getTime()
            : null;
        const inRange = sinceTime === null || (entryTime !== null && entryTime >= sinceTime);
        const computedHash = hashEntry({
            eventId: entry.eventId,
            prevHash: entry.prevHash,
            payloadHash: entry.payloadHash,
            timestamp: entry.timestamp,
        });
        if (entry.prevHash !== expectedPrevHash) {
            if (inRange) {
                errors.push(`line ${index + 1}: prevHash mismatch (expected ${expectedPrevHash}, got ${entry.prevHash})`);
            }
        }
        if (entry.eventHash !== computedHash) {
            if (inRange) {
                errors.push(`line ${index + 1}: eventHash mismatch (expected ${computedHash}, got ${entry.eventHash})`);
            }
        }
        expectedPrevHash = entry.eventHash;
        lastHash = entry.eventHash;
        if (inRange) {
            checked += 1;
        }
    });
    return {
        ok: errors.length === 0,
        checked,
        errors,
        lastHash,
        since,
    };
};
exports.verifyAuditLedgerChain = verifyAuditLedgerChain;
