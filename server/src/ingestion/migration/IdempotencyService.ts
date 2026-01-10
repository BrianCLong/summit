import { MigrationContext } from './types.js';

export class IdempotencyService {
  // In a real implementation, this would use Redis or a DB table
  private processedRecords: Set<string> = new Set();

  async hasProcessed(ctx: MigrationContext, recordId: string): Promise<boolean> {
    const key = this.getKey(ctx, recordId);
    return this.processedRecords.has(key);
  }

  async markProcessed(ctx: MigrationContext, recordId: string): Promise<void> {
    const key = this.getKey(ctx, recordId);
    this.processedRecords.add(key);
  }

  private getKey(ctx: MigrationContext, recordId: string): string {
    return `${ctx.tenantId}:${ctx.migrationId}:${recordId}`;
  }

  // Helper for testing
  clear() {
    this.processedRecords.clear();
  }
}
