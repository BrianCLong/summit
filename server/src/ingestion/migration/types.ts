import { ConnectorContext } from '../../data-model/types.js';
import { SourceConnector } from '../../connectors/types.js';

export type MigrationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface MigrationConfig {
  id: string;
  tenantId: string;
  sourceType: string; // e.g., 'salesforce', 'hubspot'
  sourceConfig: any; // Connection details
  dryRun?: boolean;
  mappings?: Record<string, string>; // Field mappings
  filters?: Record<string, any>; // Selection criteria
}

export interface MigrationResult {
  migrationId: string;
  status: MigrationStatus;
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  recordsSkipped: number;
  errors: MigrationError[];
  startedAt: Date;
  completedAt?: Date;
  dryRun: boolean;
}

export interface MigrationError {
  recordId?: string;
  stage: string;
  message: string;
  details?: any;
}

export interface MigrationStep {
  name: string;
  execute(ctx: MigrationContext, record: any): Promise<any>;
}

export interface MigrationContext extends ConnectorContext {
  migrationId: string;
  dryRun: boolean;
  mappings: Record<string, string>;
}
