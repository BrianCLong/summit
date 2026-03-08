import * as fs from 'fs/promises';

export async function writeMetrics(path: string, runId: string, metricsData: any): Promise<void> {
  const payload = {
    runId,
    timestamp: 'fixed-for-determinism',
    data: metricsData,
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2));
}
