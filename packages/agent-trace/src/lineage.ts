import { spawnSync } from 'child_process';
import { TraceStore } from './store.js';
import type { TraceRecord } from './trace_record.js';

export interface LineageResult {
  file: string;
  line: number;
  revision: string;
  contributor?: string;
  model_id?: string;
  conversation_url?: string;
}

export function getLineage(filePath: string, line: number, baseDir: string = process.cwd()): LineageResult | null {
  try {
    // Get revision that last touched the line using git blame
    // git blame -L <line>,<line> --porcelain <file>
    const result = spawnSync('git', ['blame', '-L', `${line},${line}`, '--porcelain', filePath], { cwd: baseDir });
    if (result.error || result.status !== 0) {
      throw new Error(`git blame failed: ${result.stderr.toString()}`);
    }
    const output = result.stdout.toString();
    const firstLine = output.split('\n')[0];
    const revision = firstLine.split(' ')[0];

    if (!revision || revision === '0000000000000000000000000000000000000000') {
      return { file: filePath, line, revision: 'uncommitted' };
    }

    // Look up trace for this revision
    const store = new TraceStore(baseDir);
    const records = store.loadRecords(revision);

    for (const record of records) {
      for (const f of record.files) {
        if (f.path === filePath) {
          for (const conv of f.conversations) {
            for (const range of conv.ranges) {
              if (line >= range.start_line && line <= range.end_line) {
                return {
                  file: filePath,
                  line,
                  revision,
                  contributor: range.contributor?.type || conv.contributor?.type,
                  model_id: range.contributor?.model_id || conv.contributor?.model_id,
                  conversation_url: conv.url
                };
              }
            }
          }
        }
      }
    }

    return { file: filePath, line, revision };
  } catch (err) {
    console.error(`Error in getLineage: ${err}`);
    return null;
  }
}
