import { MigrationContext } from './types';

export interface MigrationDestination {
  write(ctx: MigrationContext, records: any[]): Promise<void>;
}
