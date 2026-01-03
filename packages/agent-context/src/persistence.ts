import fs from 'fs';
import path from 'path';
import { AgentTurn, ContextPersistence } from './types';

export class FileContextPersistence implements ContextPersistence {
  private readonly filePath: string;

  constructor(filePath?: string) {
    const targetPath = filePath || path.join(process.cwd(), 'agent-context-turns.log');
    this.filePath = targetPath;
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  persist(turn: AgentTurn): void {
    const payload = JSON.stringify({ ...turn, persistedAt: new Date().toISOString() });
    fs.appendFileSync(this.filePath, `${payload  }\n`);
  }
}

export class NoopContextPersistence implements ContextPersistence {
   
  persist(_turn: AgentTurn): void {
    // intentionally no-op
  }
}
