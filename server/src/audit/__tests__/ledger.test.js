"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const ledger_js_1 = require("../ledger.js");
const logEventBus_js_1 = require("../../logging/logEventBus.js");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(0, globals_1.describe)('AuditLedger', () => {
    (0, globals_1.it)('records and verifies a hash chain', async () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'audit-ledger-'));
        const ledgerFilePath = path_1.default.join(tmpDir, 'ledger.jsonl');
        const bus = new logEventBus_js_1.LogEventBus(10);
        const ledger = new ledger_js_1.AuditLedger({ ledgerFilePath, bus });
        await ledger.recordEvent({
            level: 'info',
            message: 'first event',
            tenantId: 'tenant-1',
            userId: 'user-1',
        });
        await ledger.recordEvent({
            level: 'warn',
            message: 'second event',
            tenantId: 'tenant-1',
            correlationId: 'corr-2',
        });
        const lines = fs_1.default
            .readFileSync(ledgerFilePath, 'utf8')
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        (0, globals_1.expect)(lines).toHaveLength(2);
        const expectedPayloadHash = (0, ledger_js_1.hashPayload)((0, ledger_js_1.safePayloadFromEvent)({
            level: 'info',
            message: 'first event',
            tenantId: 'tenant-1',
            userId: 'user-1',
            timestamp: lines[0].timestamp,
        }));
        (0, globals_1.expect)(lines[0].payloadHash).toBe(expectedPayloadHash);
        const verification = await (0, ledger_js_1.verifyAuditLedgerChain)({ ledgerFilePath });
        (0, globals_1.expect)(verification.ok).toBe(true);
        (0, globals_1.expect)(verification.checked).toBe(2);
        ledger.stop();
    });
    (0, globals_1.it)('detects tampered entries', async () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'audit-ledger-tamper-'));
        const ledgerFilePath = path_1.default.join(tmpDir, 'ledger.jsonl');
        const bus = new logEventBus_js_1.LogEventBus(10);
        const ledger = new ledger_js_1.AuditLedger({ ledgerFilePath, bus });
        bus.publish({ level: 'info', message: 'event', tenantId: 'tenant-2' });
        bus.publish({ level: 'info', message: 'event-2', tenantId: 'tenant-2' });
        await sleep(50);
        const lines = fs_1.default.readFileSync(ledgerFilePath, 'utf8').trim().split('\n');
        const tampered = JSON.parse(lines[1]);
        tampered.payloadHash = 'deadbeef';
        lines[1] = JSON.stringify(tampered);
        fs_1.default.writeFileSync(ledgerFilePath, `${lines.join('\n')}\n`, 'utf8');
        const verification = await (0, ledger_js_1.verifyAuditLedgerChain)({ ledgerFilePath });
        (0, globals_1.expect)(verification.ok).toBe(false);
        (0, globals_1.expect)(verification.errors.length).toBeGreaterThan(0);
        ledger.stop();
    });
});
