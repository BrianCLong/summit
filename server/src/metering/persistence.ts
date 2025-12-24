import fs from 'fs';
import path from 'path';
import { MeterEvent, TenantUsageDailyRow } from './schema.js';
import { TenantUsageDailyRepository } from './repository.js'; // Interface or Class? It was a class.

// We will implement a file-based store
const DATA_DIR = path.join(process.cwd(), 'data', 'metering');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class FileMeterStore {
  private logPath = path.join(DATA_DIR, 'events.jsonl');

  async append(event: MeterEvent): Promise<void> {
    const line = JSON.stringify(event) + '\n';
    await fs.promises.appendFile(this.logPath, line, 'utf8');
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
        // Load into the in-memory store of the parent class (which we need to expose or use saveAll)
        // Since parent has private store, we can use saveAll to populate it.
        super.saveAll(rows);
      }
    } catch (err) {
      console.error('Failed to load metering rollups', err);
    }
  }

  async saveAll(rows: TenantUsageDailyRow[]): Promise<void> {
    await super.saveAll(rows);
    // Persist full state to disk
    // In a real system we would append or update specific rows, but for prototype we dump all.
    const all = await this.list();
    await fs.promises.writeFile(this.filePath, JSON.stringify(all, null, 2), 'utf8');
  }
}

export const meterStore = new FileMeterStore();
export const persistentUsageRepository = new FileTenantUsageRepository();
