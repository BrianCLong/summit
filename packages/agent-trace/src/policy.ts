import type { TraceRecord } from './trace_record.js';

export interface PolicyConfig {
  strict: boolean;
  ignoredGlobs?: string[];
}

export function checkCoverage(changedFiles: string[], records: TraceRecord[]): { covered: boolean; missingFiles: string[] } {
  const coveredFiles = new Set<string>();
  for (const record of records) {
    for (const file of record.files) {
      coveredFiles.add(file.path);
    }
  }

  const missingFiles = changedFiles.filter(f => !coveredFiles.has(f));
  return {
    covered: missingFiles.length === 0,
    missingFiles
  };
}
