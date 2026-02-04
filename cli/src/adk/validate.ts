import path from 'node:path';
import { validateManifest, writeDeterministicJson } from './manifest.js';

export async function validateManifestCommand(manifestPath: string): Promise<{ reportPath: string; ok: boolean }> {
  const report = await validateManifest(manifestPath);
  const reportPath = path.resolve(process.cwd(), 'validate.report.json');
  await writeDeterministicJson(reportPath, report);
  return { reportPath, ok: report.ok };
}
