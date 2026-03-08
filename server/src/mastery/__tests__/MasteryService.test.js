"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MasteryService_js_1 = require("../MasteryService.js");
const ledger_js_1 = require("../../provenance/ledger.js");
globals_1.jest.mock('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        getEntries: globals_1.jest.fn(),
        appendEntry: globals_1.jest.fn().mockImplementation(() => Promise.resolve({})),
    },
}));
describe('MasteryService', () => {
    let service;
    beforeEach(() => {
        service = new MasteryService_js_1.MasteryService();
        ledger_js_1.provenanceLedger.getEntries.mockReset();
        ledger_js_1.provenanceLedger.getEntries.mockImplementation(() => Promise.resolve([]));
        ledger_js_1.provenanceLedger.appendEntry.mockReset();
        ledger_js_1.provenanceLedger.appendEntry.mockImplementation(() => Promise.resolve({}));
    });
    test('listLabs returns configured labs', () => {
        const labs = service.getLabs();
        expect(labs.length).toBeGreaterThan(0);
        expect(labs.find(l => l.id === 'lab-1-ingest-map')).toBeDefined();
    });
    test('startLab creates a run', () => {
        const run = service.startLab('lab-1-ingest-map', 'user1', 'tenant1');
        expect(run).toBeDefined();
        expect(run.userId).toBe('user1');
        expect(run.status).toBe('in_progress');
        expect(run.currentStepId).toBe('upload_dataset');
        expect(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'LAB_START'
        }));
    });
    test('validateStep successful with provenance event', async () => {
        const run = service.startLab('lab-1-ingest-map', 'user1', 'tenant1');
        ledger_js_1.provenanceLedger.getEntries.mockImplementation(() => Promise.resolve([
            {
                timestamp: new Date().toISOString(), // recent
                actorId: 'user1',
                actionType: 'DATASET_UPLOAD',
                payload: {},
                metadata: { filename: 'financial_records.csv' }
            }
        ]));
        const result = await service.validateStep(run.runId, 'upload_dataset');
        expect(result.success).toBe(true);
        expect(service.getRun(run.runId)?.steps['upload_dataset'].status).toBe('completed');
    });
    test('certification issued when all labs complete', async () => {
        // Mock completed labs in ledger
        ledger_js_1.provenanceLedger.getEntries.mockImplementation((tenantId, opts) => {
            if (opts.actionType === 'LAB_COMPLETE') {
                return Promise.resolve([
                    { actorId: 'user1', payload: { labId: 'lab-2-resolve-reconcile' } },
                    { actorId: 'user1', payload: { labId: 'lab-3-hypothesis' } }
                ]);
            }
            if (opts.actionType === 'DATASET_UPLOAD') { // For step validation
                return Promise.resolve([{
                        timestamp: new Date().toISOString(), actorId: 'user1', actionType: 'DATASET_UPLOAD',
                        payload: {}, metadata: { filename: 'financial_records.csv' }
                    }]);
            }
            if (opts.actionType === 'SCHEMA_MAPPING_SAVED') { // For step validation
                return Promise.resolve([{
                        timestamp: new Date().toISOString(), actorId: 'user1', actionType: 'SCHEMA_MAPPING_SAVED',
                        payload: { mapping: { src_ip: 'IPAddress' } }, metadata: {}
                    }]);
            }
            if (opts.actionType === 'REDACTION_APPLIED') { // For step validation
                return Promise.resolve([{
                        timestamp: new Date().toISOString(), actorId: 'user1', actionType: 'REDACTION_APPLIED',
                        payload: { preset: 'PII-Standard' }, metadata: {}
                    }]);
            }
            if (opts.actionType === 'CERTIFICATE_ISSUED') {
                return Promise.resolve([]);
            }
            return Promise.resolve([]);
        });
        const run = service.startLab('lab-1-ingest-map', 'user1', 'tenant1');
        // Complete all steps for lab 1
        await service.validateStep(run.runId, 'upload_dataset');
        await service.validateStep(run.runId, 'map_schema');
        await service.validateStep(run.runId, 'apply_redaction');
        // Check if certificate issued
        expect(ledger_js_1.provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'CERTIFICATE_ISSUED',
            actorId: 'user1'
        }));
    });
});
