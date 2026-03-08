"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replayEvents = replayEvents;
const fs_1 = __importDefault(require("fs"));
const readline_1 = __importDefault(require("readline"));
const ledger_js_1 = require("../provenance/ledger.js");
const handlers_js_1 = require("./handlers.js");
class MockClient {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async query(text, params = []) {
        return this.pool.query(text, params);
    }
    release() {
        // No-op
    }
}
class MockPool {
    rows = [];
    roots = [];
    async connect() {
        return new MockClient(this);
    }
    async query(text, params = []) {
        const trimmed = text.trim();
        const upper = trimmed.toUpperCase();
        const normalized = upper.replace(/\s+/g, ' ');
        if (upper.startsWith('BEGIN') || upper.startsWith('COMMIT') || upper.startsWith('ROLLBACK')) {
            return { rows: [], rowCount: 0 };
        }
        if (upper.startsWith('INSERT INTO PROVENANCE_LEDGER_V2')) {
            const [id, tenant_id, sequence_number, previous_hash, current_hash, timestamp, action_type, resource_type, resource_id, actor_id, actor_type, payload, metadata, signature, attestation] = params;
            const row = {
                id, tenant_id, sequence_number: Number(sequence_number), previous_hash, current_hash,
                timestamp, action_type, resource_type, resource_id,
                actor_id, actor_type, payload, metadata, signature, attestation
            };
            this.rows.push(row);
            return { rows: [row], rowCount: 1 };
        }
        if (upper.startsWith('INSERT INTO PROVENANCE_LEDGER_ROOTS')) {
            const [id, tenant_id, root_hash, start_sequence, end_sequence, entry_count, timestamp, signature, cosign_bundle, merkle_proof] = params;
            const row = {
                id, tenant_id, root_hash,
                start_sequence: Number(start_sequence),
                end_sequence: Number(end_sequence),
                entry_count, timestamp, signature, cosign_bundle, merkle_proof
            };
            this.roots.push(row);
            return { rows: [row], rowCount: 1 };
        }
        if (upper.includes('SELECT * FROM PROVENANCE_LEDGER_V2')) {
            let filtered = this.rows;
            if (text.includes('tenant_id = $')) {
                const tenantId = params[0];
                filtered = filtered.filter(r => r.tenant_id === tenantId);
            }
            if (normalized.includes('ORDER BY SEQUENCE_NUMBER DESC LIMIT 1')) {
                if (filtered.length === 0)
                    return { rows: [], rowCount: 0 };
                const sorted = [...filtered].sort((a, b) => Number(b.sequence_number - a.sequence_number));
                return { rows: [sorted[0]], rowCount: 1 };
            }
            if (normalized.includes('ORDER BY TENANT_ID, SEQUENCE_NUMBER')) {
                const sorted = [...filtered].sort((a, b) => {
                    if (a.tenant_id !== b.tenant_id)
                        return a.tenant_id.localeCompare(b.tenant_id);
                    return Number(a.sequence_number - b.sequence_number);
                });
                return { rows: sorted, rowCount: sorted.length };
            }
            return { rows: filtered, rowCount: filtered.length };
        }
        return { rows: [], rowCount: 0 };
    }
    getRows() {
        return this.rows;
    }
}
// --- Determinism Helpers ---
function mockDateNow(fixedTime) {
    const originalDateNow = Date.now;
    Date.now = () => fixedTime;
    return () => { Date.now = originalDateNow; };
}
function mockMathRandom(seed) {
    const originalMathRandom = Math.random;
    let state = seed;
    Math.random = () => {
        const x = Math.sin(state++) * 10000;
        return x - Math.floor(x);
    };
    return () => { Math.random = originalMathRandom; };
}
async function replayEvents(filePath, options = {}) {
    const seed = options.seed || 12345;
    const startTime = options.startTime || 1672531200000; // 2023-01-01
    // Setup Determinism
    const restoreDate = mockDateNow(startTime);
    const restoreRandom = mockMathRandom(seed);
    // Setup Mock DB
    const mockPool = new MockPool();
    ledger_js_1.provenanceLedger.setPool(mockPool);
    const fileStream = fs_1.default.createReadStream(filePath);
    const rl = readline_1.default.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    const errors = [];
    let processedCount = 0;
    try {
        for await (const line of rl) {
            if (!line.trim())
                continue;
            try {
                mockDateNow(startTime + processedCount * 1000);
                const event = JSON.parse(line);
                const handler = handlers_js_1.handlers[event.type];
                if (handler) {
                    await handler(event);
                    processedCount++;
                }
                else {
                    console.warn(`No handler for event type: ${event.type}`);
                }
            }
            catch (err) {
                errors.push({ line, error: err });
            }
        }
    }
    finally {
        // Ensure streams are closed
        rl.close();
        fileStream.destroy();
        // Cleanup mocks
        restoreDate();
        restoreRandom();
    }
    return {
        rows: mockPool.getRows(),
        processedCount,
        errors
    };
}
