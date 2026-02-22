import * as fs from 'fs';
import * as readline from 'readline';
import { Trace } from '../traces/trace_types';
import { EpisodicExample } from './memory_types';
import { EpisodicStore } from './episodic_store';
import { makeEvidenceId } from '../evidence/evidence_id';

export async function ingestFeedback(
  filePath: string,
  store: EpisodicStore,
  judgeName: string
): Promise<number> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const trace: Trace = JSON.parse(line);
      if (trace.judge_name !== judgeName) continue;

      const example: EpisodicExample = {
        id: makeEvidenceId('MEM-EP', { t: trace.trace_id, j: trace.judge_name }),
        content: `Input: ${trace.input}\nRationale: ${trace.rationale}`,
        input: trace.input,
        output: String(trace.label),
        label: trace.label!,
        rationale: trace.rationale!,
        metadata: {
          original_trace_id: trace.trace_id,
          ...trace.metadata,
        },
      };

      await store.add(example);
      count++;
    } catch (e) {
      console.warn(`Failed to parse line: ${line}`, e);
    }
  }
  return count;
}
