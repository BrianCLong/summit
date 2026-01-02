import pino from 'pino';
import fs from 'fs';
import path from 'path';

const log = (pino as any)({ name: 'ModelAbuseWatch' });

export class ModelAbuseWatch {
  private abuseCounts: Record<string, number> = {};
  private persistencePath = path.join(process.cwd(), 'abuse_watch_state.json');

  constructor() {
    this.loadState();
  }

  public trackRequest(userId: string, prompt: string, output: string): void {
    if (this.isAbusive(prompt) || this.isHarmful(output)) {
      this.abuseCounts[userId] = (this.abuseCounts[userId] || 0) + 1;
      this.saveState(); // Simple file persistence for prototype

      log.warn({ userId, prompt, output }, 'Abuse detected');

      if (this.abuseCounts[userId] > 5) {
        this.triggerQuarantine(userId);
      }
    }
  }

  private isAbusive(text: string): boolean {
    const jailbreakPatterns = ['ignore previous instructions', 'do anything now'];
    return jailbreakPatterns.some(p => text.toLowerCase().includes(p));
  }

  private isHarmful(text: string): boolean {
    // Placeholder for toxicity detector
    return false;
  }

  private triggerQuarantine(userId: string) {
    log.error({ userId }, 'User quarantined due to excessive abuse attempts');
    // TODO: Update user status in real DB
    // const pool = getPostgresPool();
    // await pool.query('UPDATE users SET status = "quarantined" WHERE id = $1', [userId]);
  }

  private saveState() {
    try {
      fs.writeFileSync(this.persistencePath, JSON.stringify(this.abuseCounts));
    } catch (e: any) {
      log.error(e, 'Failed to persist abuse state');
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(this.persistencePath)) {
        const data = fs.readFileSync(this.persistencePath, 'utf-8');
        this.abuseCounts = JSON.parse(data);
      }
    } catch (e: any) {
      log.error(e, 'Failed to load abuse state');
    }
  }
}
