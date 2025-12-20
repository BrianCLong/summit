import { createHash } from 'crypto';
import { MigrationStatus, SandboxConfig, DeploymentArtifact } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProvLedgerClient');

interface ProvenanceRecord {
  id: string;
  type: 'sandbox_created' | 'execution' | 'migration' | 'deployment';
  sandboxId: string;
  tenantId: string;
  ownerId: string;
  timestamp: string;
  signature: string;
  metadata: Record<string, unknown>;
  artifacts?: ArtifactReference[];
}

interface ArtifactReference {
  name: string;
  hash: string;
  type: string;
}

/**
 * Client for integrating with prov-ledger service for chain of custody tracking
 */
export class ProvLedgerClient {
  private baseUrl: string;
  private signingKey: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.PROV_LEDGER_URL || 'http://prov-ledger:3000';
    this.signingKey = process.env.PROV_SIGNING_KEY || 'dev-signing-key';
  }

  /**
   * Record sandbox creation in provenance ledger
   */
  async recordSandboxCreation(config: SandboxConfig): Promise<string> {
    const record: ProvenanceRecord = {
      id: this.generateRecordId(),
      type: 'sandbox_created',
      sandboxId: config.id,
      tenantId: config.tenantId,
      ownerId: config.ownerId,
      timestamp: new Date().toISOString(),
      signature: '',
      metadata: {
        isolationLevel: config.isolationLevel,
        dataClassification: config.dataClassification,
        quotas: config.quotas,
      },
    };

    record.signature = this.signRecord(record);

    return this.submitRecord(record);
  }

  /**
   * Record code execution in provenance ledger
   */
  async recordExecution(
    sandboxId: string,
    executionId: string,
    tenantId: string,
    ownerId: string,
    codeHash: string,
    inputHash: string,
    outputHash: string,
    sensitiveDataCount: number
  ): Promise<string> {
    const record: ProvenanceRecord = {
      id: this.generateRecordId(),
      type: 'execution',
      sandboxId,
      tenantId,
      ownerId,
      timestamp: new Date().toISOString(),
      signature: '',
      metadata: {
        executionId,
        codeHash,
        inputHash,
        outputHash,
        sensitiveDataCount,
      },
    };

    record.signature = this.signRecord(record);

    return this.submitRecord(record);
  }

  /**
   * Record migration initiation
   */
  async recordMigrationStart(
    status: MigrationStatus,
    config: SandboxConfig,
    targetPlatform: string,
    targetEnvironment: string
  ): Promise<string> {
    const record: ProvenanceRecord = {
      id: this.generateRecordId(),
      type: 'migration',
      sandboxId: config.id,
      tenantId: config.tenantId,
      ownerId: config.ownerId,
      timestamp: new Date().toISOString(),
      signature: '',
      metadata: {
        migrationId: status.migrationId,
        targetPlatform,
        targetEnvironment,
        phases: status.phases.map(p => p.name),
      },
    };

    record.signature = this.signRecord(record);

    return this.submitRecord(record);
  }

  /**
   * Record deployment completion with artifacts
   */
  async recordDeployment(
    status: MigrationStatus,
    config: SandboxConfig,
    artifacts: DeploymentArtifact[]
  ): Promise<string> {
    const record: ProvenanceRecord = {
      id: this.generateRecordId(),
      type: 'deployment',
      sandboxId: config.id,
      tenantId: config.tenantId,
      ownerId: config.ownerId,
      timestamp: new Date().toISOString(),
      signature: '',
      metadata: {
        migrationId: status.migrationId,
        status: status.status,
        duration: status.completedAt
          ? status.completedAt.getTime() - status.startedAt.getTime()
          : null,
      },
      artifacts: artifacts.map(a => ({
        name: a.name,
        hash: a.hash,
        type: a.type,
      })),
    };

    record.signature = this.signRecord(record);

    return this.submitRecord(record);
  }

  /**
   * Verify provenance chain for a sandbox
   */
  async verifyChain(sandboxId: string): Promise<{
    valid: boolean;
    records: number;
    gaps: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chains/${sandboxId}/verify`);

      if (!response.ok) {
        logger.warn('Chain verification failed', { sandboxId, status: response.status });
        return { valid: false, records: 0, gaps: ['verification_failed'] };
      }

      return response.json() as Promise<{ valid: boolean; records: number; gaps: string[] }>;
    } catch (error) {
      logger.error('Chain verification error', { sandboxId, error });
      return { valid: false, records: 0, gaps: ['connection_error'] };
    }
  }

  /**
   * Get full provenance history for a sandbox
   */
  async getHistory(sandboxId: string): Promise<ProvenanceRecord[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/chains/${sandboxId}/records`);

      if (!response.ok) {
        return [];
      }

      return response.json() as Promise<ProvenanceRecord[]>;
    } catch (error) {
      logger.error('Failed to fetch history', { sandboxId, error });
      return [];
    }
  }

  private generateRecordId(): string {
    return `prov_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  private signRecord(record: Omit<ProvenanceRecord, 'signature'>): string {
    const payload = JSON.stringify({
      id: record.id,
      type: record.type,
      sandboxId: record.sandboxId,
      timestamp: record.timestamp,
      metadata: record.metadata,
    });

    return createHash('sha256')
      .update(payload + this.signingKey)
      .digest('hex');
  }

  private async submitRecord(record: ProvenanceRecord): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        logger.warn('Failed to submit provenance record', {
          id: record.id,
          status: response.status,
        });
        // Don't fail the operation, just log
        return record.id;
      }

      const result = (await response.json()) as { id?: string };
      logger.debug('Provenance record submitted', { id: record.id });

      return result.id || record.id;
    } catch (error) {
      // Log but don't fail - provenance is important but not blocking
      logger.warn('Provenance submission error', { id: record.id, error });
      return record.id;
    }
  }
}
