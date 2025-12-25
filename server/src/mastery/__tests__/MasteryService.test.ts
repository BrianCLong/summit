import { jest } from '@jest/globals';
import { MasteryService } from '../MasteryService.js';
import { provenanceLedger } from '../../provenance/ledger.js';

jest.mock('../../provenance/ledger.js', () => ({
  provenanceLedger: {
    getEntries: jest.fn(),
    appendEntry: jest.fn().mockImplementation(() => Promise.resolve({})),
  },
}));

describe('MasteryService', () => {
  let service: MasteryService;

  beforeEach(() => {
    service = new MasteryService();
    (provenanceLedger.getEntries as unknown as jest.Mock).mockReset();
    (provenanceLedger.getEntries as unknown as jest.Mock).mockImplementation(() => Promise.resolve([]));
    (provenanceLedger.appendEntry as unknown as jest.Mock).mockReset();
    (provenanceLedger.appendEntry as unknown as jest.Mock).mockImplementation(() => Promise.resolve({}));
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
    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'LAB_START'
    }));
  });

  test('validateStep successful with provenance event', async () => {
    const run = service.startLab('lab-1-ingest-map', 'user1', 'tenant1');

    (provenanceLedger.getEntries as unknown as jest.Mock).mockImplementation(() => Promise.resolve([
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
      (provenanceLedger.getEntries as unknown as jest.Mock).mockImplementation((tenantId, opts: any) => {
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
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
          actionType: 'CERTIFICATE_ISSUED',
          actorId: 'user1'
      }));
  });
});
