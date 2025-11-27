
// Mock usage collector
import { UsageRecord, UsageCategory } from './types.js';

export class UsageCollectorService {
  private buffer: UsageRecord[] = [];

  recordUsage(tenantId: string, category: UsageCategory, quantity: number, source: string) {
    this.buffer.push({
      id: crypto.randomUUID(),
      tenantId,
      timestamp: new Date(),
      category,
      quantity,
      unit: 'count', // simplify
      source
    });
  }

  flush(): UsageRecord[] {
    const records = [...this.buffer];
    this.buffer = [];
    return records;
  }
}
