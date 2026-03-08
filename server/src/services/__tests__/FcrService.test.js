"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ledger_js_1 = require("../../provenance/ledger.js");
let FcrService;
(0, globals_1.beforeAll)(async () => {
    ({ FcrService } = await Promise.resolve().then(() => __importStar(require('../fcr/fcr-service.js'))));
});
const baseSignal = (overrides = {}) => ({
    entity_id: '11111111-1111-1111-1111-111111111111',
    tenant_id: 'tenant-a',
    observed_at: new Date('2026-01-10T00:00:00Z').toISOString(),
    signal_type: 'claim',
    narrative_claim_hash: 'hash-abc',
    confidence_local: 0.6,
    privacy_budget_cost: { epsilon: 0.5, delta: 0.01 },
    version: 'v1',
    ...overrides,
});
(0, globals_1.describe)('FcrService', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest
            .spyOn(ledger_js_1.provenanceLedger, 'appendEntry')
            .mockResolvedValue({ id: 'prov-fcr-test' });
    });
    (0, globals_1.it)('enforces privacy budgets', async () => {
        const service = new FcrService();
        service.configureTenantBudget('tenant-a', 0.1, 0.001);
        const result = await service.ingestSignals('tenant-a', [baseSignal()]);
        (0, globals_1.expect)(result.ok).toBe(false);
    });
    (0, globals_1.it)('rejects signals with mismatched tenant_id', async () => {
        const service = new FcrService();
        service.configureTenantBudget('tenant-a', 10, 0.1);
        const result = await service.ingestSignals('tenant-a', [
            baseSignal({ tenant_id: 'tenant-b' }),
        ]);
        (0, globals_1.expect)(result.ok).toBe(false);
    });
    (0, globals_1.it)('rejects empty payloads', async () => {
        const service = new FcrService();
        service.configureTenantBudget('tenant-a', 10, 0.1);
        const result = await service.ingestSignals('tenant-a', []);
        (0, globals_1.expect)(result.ok).toBe(false);
    });
    (0, globals_1.it)('clusters signals and generates alerts', async () => {
        const service = new FcrService();
        service.configureTenantBudget('tenant-a', 10, 0.1);
        const signals = [
            baseSignal({ entity_id: '22222222-2222-2222-2222-222222222222' }),
            baseSignal({ entity_id: '33333333-3333-3333-3333-333333333333' }),
            baseSignal({
                entity_id: '44444444-4444-4444-4444-444444444444',
                narrative_claim_hash: 'hash-xyz',
                confidence_local: 0.9,
            }),
        ];
        const pipeline = await service.runPipeline('tenant-a', signals);
        (0, globals_1.expect)(pipeline.ok).toBe(true);
        if (pipeline.ok) {
            (0, globals_1.expect)(pipeline.clusters.length).toBeGreaterThan(0);
            (0, globals_1.expect)(pipeline.alerts.length).toBeGreaterThan(0);
        }
    });
});
