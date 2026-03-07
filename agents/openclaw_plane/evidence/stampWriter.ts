import * as fs from 'fs/promises';

export async function writeStamp(path: string, runId: string, stampData: any): Promise<void> {
  const payload = {
    runId,
    timestamp: 'fixed-for-determinism',
    data: stampData,
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2));
}
