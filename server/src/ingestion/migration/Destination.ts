import { MigrationContext } from './types.js';

export interface MigrationDestination {
  write(ctx: MigrationContext, records: any[]): Promise<void>;
}
