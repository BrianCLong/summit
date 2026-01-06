import { MLOpsControlPlaneService } from '../controlPlaneService.js';
import { MemoryPredictionCache } from '../predictionCache.js';
import { MemoryDriftDetector } from '../driftDetector.js';
import { InMemoryReportStore } from '../reportStore.js';

const buildService = () =>
  new MLOpsControlPlaneService(
    new MemoryPredictionCache(),
    new InMemoryReportStore(),
    new MemoryDriftDetector(9999),
    120,
    120,
  );

describe('MLOpsControlPlaneService', () => {
  it('uses cache-first inference and flushes caches', async () => {
    const service = buildService();

    const request = {
      entityId: 'entity-42',
      modelVersion: 'base-v1',
      features: { alpha: 5, beta: 7 },
      context: { source: 'unit-test' },
    };

    const first = await service.infer(request);
    expect('report' in first).toBe(true);

    const report = 'report' in first ? first.report : null;
    expect(report).not.toBeNull();

    const second = await service.infer(request);
    expect('report' in second).toBe(true);

    const cachedReport = await service.getReport(request.entityId);
    expect(cachedReport).not.toBeNull();

    const flushResult = await service.flushCaches();
    expect(flushResult.predictions).toBeGreaterThan(0);
    expect(flushResult.reports).toBeGreaterThan(0);

    const afterFlush = await service.getReport(request.entityId);
    expect(afterFlush).toBeNull();
  });
});
