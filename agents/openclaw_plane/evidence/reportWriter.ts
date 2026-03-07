import * as fs from 'fs/promises';

export async function writeReport(path: string, runId: string, reportData: any): Promise<void> {
  const payload = {
    runId,
    timestamp: 'fixed-for-determinism', // in real impl, use logical timestamps
    data: reportData,
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2));
}
