import { ReportStore } from '../report-store.js';
import { ReportArtifact } from '../types.js';

describe('ReportStore', () => {
  it('records manifests with receipt and hash chaining', async () => {
    const store = new ReportStore();
    const artifact: ReportArtifact = {
      fileName: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"status":"ok"}'),
      format: 'json',
    };

    const first = await store.record({
      reportId: 'r-1',
      reportType: 'approval-risk',
      templateId: 'tpl-1',
      tenantId: 'tenant-a',
      artifact,
    });

    const second = await store.record({
      reportId: 'r-2',
      reportType: 'policy-coverage',
      templateId: 'tpl-2',
      tenantId: 'tenant-a',
      artifact,
    });

    expect(first.manifest.manifestHash).toBeDefined();
    expect(first.receipt.manifestHash).toEqual(first.manifest.manifestHash);
    expect(second.manifest.previousHash).toEqual(first.manifest.manifestHash);
  });

  it('enforces tenant scoping on reads', async () => {
    const store = new ReportStore();
    const artifact: ReportArtifact = {
      fileName: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"status":"ok"}'),
      format: 'json',
    };

    await store.record({
      reportId: 'r-tenant',
      reportType: 'approval-risk',
      templateId: 'tpl-1',
      tenantId: 'tenant-a',
      artifact,
    });

    expect(store.get('r-tenant', 'tenant-a')).toBeDefined();
    expect(store.get('r-tenant', 'tenant-b')).toBeUndefined();
  });
});
