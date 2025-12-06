import { LLMRequest, LLMResponse } from './types.js';
import fs from 'fs';
import path from 'path';

export class ReplayLog {
  private logDir: string;

  constructor(logDir: string = 'logs/llm_replay') {
    this.logDir = logDir;
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  async log(request: LLMRequest, response: LLMResponse, error?: Error): Promise<void> {
    const entry = {
      timestamp: new Date().toISOString(),
      request,
      response,
      error: error ? { message: error.message, stack: error.stack } : null
    };

    const filename = `${this.logDir}/${request.id}.json`;
    await fs.promises.writeFile(filename, JSON.stringify(entry, null, 2));
  }
}
