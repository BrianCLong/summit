import fs from 'fs-extra';
import { OrchestratorEvent } from '../types.js';

export async function appendEvent(logPath: string, evt: OrchestratorEvent): Promise<void> {
  const line = JSON.stringify(evt);
  await fs.appendFile(logPath, line + '\n');
}
