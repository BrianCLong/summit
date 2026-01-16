import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConformanceReport } from '../types.js';

export const writeJsonReport = async (
  report: ConformanceReport,
  outputDir: string,
): Promise<string> => {
  const filePath = path.join(outputDir, 'capabilities.json');
  await fs.writeFile(filePath, JSON.stringify(report, null, 2));
  return filePath;
};
