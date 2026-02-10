import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { MeterEvent, TenantUsageDailyRow } from './schema';
import { TenantUsageDailyRepository } from './repository';

// We will implement a file-based store
const DATA_DIR = path.join(process.cwd(), 'data', 'metering');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class FileMeterStore {
  private logPath = path.join(DATA_DIR, 'events.jsonl');
  private lastHash: string = '';

  constructor() {
      // Initialize hash from last line if exists
      if (fs.existsSync(this.logPath)) {
          // Read last line to get its hash
          // For now, we assume empty.
      }
  }

  async append(event: MeterEvent): Promise<void> {
    const lineContent = stringify(event);

    // Hash chain: SHA256(prevHash + lineContent)
    const newHash = crypto.createHash('sha256')
        .update(this.lastHash + lineContent)
        .digest('hex');

    const line = stringify({
        data: event,
        hash: newHash,
        prevHash: this.lastHash
    }) + '\n';

    await fs.promises.appendFile(this.logPath, line, 'utf8');
    this.lastHash = newHash;
  }

  async verifyLogIntegrity(): Promise<{ valid: boolean; brokenAtLine?: number }> {
      if (!fs.existsSync(this.logPath)) {
          return { valid: true };
      }

      const content = await fs.promises.readFile(this.logPath, 'utf8');
      const lines = content.trim().split('\n');

      let calculatedLastHash = '';
      for (let i = 0; i < lines.length; i++) {
          try {
              if (!lines[i].trim()) continue;
              const record = JSON.parse(lines[i]);
              // Use stable stringify for verification too
              const eventStr = stringify(record.data);

              if (record.prevHash !== calculatedLastHash) {
                  return { valid: false, brokenAtLine: i + 1 };
              }

              const expectedHash = crypto.createHash('sha256')
                  .update(calculatedLastHash + eventStr)
                  .digest('hex');

              if (record.hash !== expectedHash) {
                  return { valid: false, brokenAtLine: i + 1 };
              }

              calculatedLastHash = expectedHash;
          } catch (e: any) {
              return { valid: false, brokenAtLine: i + 1 };
          }
      }

      return { valid: true };
  }
}

export class FileTenantUsageRepository extends TenantUsageDailyRepository {
  private filePath = path.join(DATA_DIR, 'rollups.json');

  constructor() {
    super();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const rows: TenantUsageDailyRow[] = JSON.parse(data);
        super.saveAll(rows);
      }
    } catch (err: any) {
      console.error('Failed to load metering rollups', err);
    }
  }

  async saveAll(rows: TenantUsageDailyRow[]): Promise<void> {
    await super.saveAll(rows);
    const all = await this.list();
    await fs.promises.writeFile(this.filePath, JSON.stringify(all, null, 2), 'utf8');
  }
}

export const meterStore = new FileMeterStore();
export const persistentUsageRepository = new FileTenantUsageRepository();
