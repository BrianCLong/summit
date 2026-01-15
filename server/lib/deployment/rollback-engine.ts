
import { provenanceLedger } from '../../src/provenance/ledger.js';

// Mock external services for demonstration
const mockKubernetesClient = {
  rollbackDeployment: async (deploymentName: string): Promise<void> => {
    console.log(`[MockKubernetes] Rolling back deployment ${deploymentName} to previous revision.`);
    // In a real implementation, this would use the Kubernetes API to trigger a deployment rollback.
  },
};

const mockDbMigrator = {
  runDownMigrations: async (steps: number): Promise<void> => {
    console.log(`[MockDbMigrator] Running ${steps} down migration(s).`);
    // Execute the rollback script
    try {
        const { exec } = await import('child_process');
        const path = await import('path');
        const scriptPath = path.resolve(process.cwd(), 'server/scripts/db_rollback.cjs');

        console.log(`[RollbackEngine] Executing: npx tsx ${scriptPath} --steps=${steps}`);

        await new Promise<void>((resolve, reject) => {
            exec(`npx tsx ${scriptPath} --steps=${steps}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[RollbackEngine] Rollback script failed: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) console.error(`[RollbackEngine] stderr: ${stderr}`);
                if (stdout) console.log(`[RollbackEngine] stdout: ${stdout}`);
                resolve();
            });
        });
    } catch (e) {
        console.error(`[RollbackEngine] Failed to execute rollback script:`, e);
    }
  },
};

export interface RollbackOptions {
  serviceName: string;
  migrationSteps?: number;
  reason: string;
  tenantId: string;
  actorId: string;
}

export interface RollbackRecord {
  timestamp: Date;
  serviceName: string;
  reason: string;
  success: boolean;
}

export class RollbackEngine {
  private rollbackHistory: RollbackRecord[] = [];

  public async performRollback(options: RollbackOptions): Promise<boolean> {
    console.log(`Starting rollback for service ${options.serviceName} due to: ${options.reason}`);
    let success = false;
    try {
      if (options.migrationSteps && options.migrationSteps > 0) {
        await this.coordinateDatabaseRollback(options.migrationSteps);
      }
      await this.performServiceRollback(options.serviceName);
      success = true;
      console.log('Rollback completed successfully.');

      // Record evidence in Provenance Ledger
      try {
        await provenanceLedger.appendEntry({
          tenantId: options.tenantId,
          actorId: options.actorId,
          actorType: 'system',
          actionType: 'ROLLBACK_EXECUTED',
          resourceType: 'Deployment',
          resourceId: options.serviceName,
          timestamp: new Date(),
          payload: {
            mutationType: 'CREATE',
            entityId: options.serviceName,
            entityType: 'Deployment',
            newState: {
              id: options.serviceName,
              type: 'Deployment',
              version: 1,
              data: {
                reason: options.reason,
                migrationSteps: options.migrationSteps,
                success: true,
              },
              metadata: {},
            },
            reason: options.reason,
            migrationSteps: options.migrationSteps,
            success: true
          },
          metadata: {
            purpose: 'Canary Auto-Rollback',
            component: 'RollbackEngine'
          }
        });
        console.log('Rollback evidence recorded in Provenance Ledger.');
      } catch (ledgerError) {
        console.error('Failed to record rollback evidence:', ledgerError);
        // We don't fail the rollback itself if logging fails, but we log the error.
      }

    } catch (error) {
      console.error('Rollback failed:', error);

      // Record failure evidence
       try {
        await provenanceLedger.appendEntry({
          tenantId: options.tenantId,
          actorId: options.actorId,
          actorType: 'system',
          actionType: 'ROLLBACK_FAILED',
          resourceType: 'Deployment',
          resourceId: options.serviceName,
          timestamp: new Date(),
          payload: {
            mutationType: 'CREATE',
            entityId: options.serviceName,
            entityType: 'Deployment',
            newState: {
              id: options.serviceName,
              type: 'Deployment',
              version: 1,
              data: {
                reason: options.reason,
                error: (error as Error).message,
                success: false,
              },
              metadata: {},
            },
            reason: options.reason,
            error: (error as Error).message,
            success: false
          },
          metadata: {
             purpose: 'Canary Auto-Rollback',
             component: 'RollbackEngine'
          }
        });
      } catch (ledgerError) {
        console.error('Failed to record rollback failure evidence:', ledgerError);
      }
    } finally {
      this.logRollback(options, success);
    }
    return success;
  }

  private async coordinateDatabaseRollback(steps: number): Promise<void> {
    console.log(`Coordinating database migration rollback of ${steps} step(s)...`);
    await mockDbMigrator.runDownMigrations(steps);
  }

  private async performServiceRollback(serviceName: string): Promise<void> {
    console.log(`Rolling back service ${serviceName}...`);
    await mockKubernetesClient.rollbackDeployment(serviceName);
  }

  private logRollback(options: RollbackOptions, success: boolean): void {
    const record: RollbackRecord = {
      timestamp: new Date(),
      serviceName: options.serviceName,
      reason: options.reason,
      success,
    };
    this.rollbackHistory.push(record);
    console.log("Rollback audit record created:", record);
  }

  public getRollbackHistory(): RollbackRecord[] {
    return this.rollbackHistory;
  }
}
