import fs from 'fs-extra';
import readline from 'readline';
import { OrchestratorEvent } from '../types.js';

export async function replayEvents(logPath: string): Promise<OrchestratorEvent[]> {
  if (!await fs.pathExists(logPath)) return [];

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const events: OrchestratorEvent[] = [];
  for await (const line of rl) {
    if (line.trim()) {
      try {
        events.push(JSON.parse(line));
      } catch (e) {
        console.error('Malformed event line:', line);
      }
    }
  }
  return events;
}
