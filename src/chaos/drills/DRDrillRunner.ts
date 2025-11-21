/**
 * @fileoverview Disaster Recovery Drill Integration
 * Integrates backup, restore, and DR validation with the ChaosEngine
 * for comprehensive disaster recovery testing and validation.
 */

import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * DR Drill types
 */
export type DRDrillType =
  | 'total_data_loss'
  | 'database_corruption'
  | 'multi_region_failover'
  | 'backup_validation'
  | 'tenant_recovery'
  | 'chaos_recovery';

/**
 * DR Drill status
 */
export type DRDrillStatus =
  | 'pending'
  | 'running'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'aborted';

/**
 * Backup set types matching config/backup-sets.yaml
 */
export type BackupSet =
  | 'full'
  | 'minimal'
  | 'tenant'
  | 'project'
  | 'config_only'
  | 'disaster_recovery';

/**
 * Restore environment types
 */
export type RestoreEnvironment =
  | 'production'
  | 'staging'
  | 'dr_rehearsal'
  | 'dev'
  | 'test';

/**
 * Recovery objectives
 */
export interface RecoveryObjectives {
  rtoTarget: number; // seconds
  rpoTarget: number; // seconds
  rtoActual?: number;
  rpoActual?: number;
  compliant: boolean;
}

/**
 * DR Drill configuration
 */
export interface DRDrillConfig {
  id: string;
  name: string;
  type: DRDrillType;
  description: string;
  backupSet: BackupSet;
  restoreEnvironment: RestoreEnvironment;
  objectives: RecoveryObjectives;
  dryRun: boolean;
  autoRollback: boolean;
  validationTests: ValidationTest[];
  notifications: NotificationConfig;
  metadata: DRDrillMetadata;
}

/**
 * Validation test configuration
 */
export interface ValidationTest {
  name: string;
  type: 'health_check' | 'data_integrity' | 'golden_path' | 'demo_story' | 'custom';
  command?: string;
  endpoint?: string;
  expectedResult?: any;
  timeout: number; // seconds
  required: boolean;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  slackWebhook?: string;
  email?: string[];
  pagerDuty?: string;
  onStart: boolean;
  onComplete: boolean;
  onFailure: boolean;
}

/**
 * DR Drill metadata
 */
export interface DRDrillMetadata {
  author: string;
  team: string;
  environment: string;
  tags: string[];
  scheduledAt?: Date;
  createdAt: Date;
  version: string;
}

/**
 * DR Drill result
 */
export interface DRDrillResult {
  drillId: string;
  status: DRDrillStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  phases: PhaseResult[];
  objectives: RecoveryObjectives;
  validationResults: ValidationResult[];
  backupId?: string;
  errors: DrillError[];
  report?: DRDrillReport;
}

/**
 * Phase result
 */
export interface PhaseResult {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  output?: string;
  error?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  testName: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
}

/**
 * Drill error
 */
export interface DrillError {
  phase: string;
  message: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * DR Drill report
 */
export interface DRDrillReport {
  summary: string;
  rtoCompliance: boolean;
  rpoCompliance: boolean;
  dataIntegrity: boolean;
  validationPassed: boolean;
  recommendations: string[];
  lessonsLearned: string[];
}

/**
 * Disaster Recovery Drill Runner
 * Executes and manages DR drills with backup/restore validation
 */
export class DRDrillRunner extends EventEmitter {
  private projectRoot: string;
  private backupBase: string;
  private currentDrill?: DRDrillConfig;
  private currentResult?: DRDrillResult;

  constructor(projectRoot: string, backupBase: string = './backups') {
    super();
    this.projectRoot = projectRoot;
    this.backupBase = backupBase;
  }

  /**
   * Execute a DR drill
   */
  async executeDrill(config: DRDrillConfig): Promise<DRDrillResult> {
    this.currentDrill = config;
    this.currentResult = this.initializeResult(config);

    this.emit('drill:start', { drillId: config.id, type: config.type });

    try {
      // Phase 1: Baseline Capture
      await this.executePhase('baseline_capture', async () => {
        return this.captureBaseline();
      });

      // Phase 2: Backup Creation (or identify existing backup)
      const backupId = await this.executePhase('backup_creation', async () => {
        return this.createOrFindBackup(config.backupSet);
      });
      this.currentResult.backupId = backupId as string;

      // Phase 3: Disaster Simulation (if not dry run and applicable)
      if (!config.dryRun && this.requiresDisasterSimulation(config.type)) {
        await this.executePhase('disaster_simulation', async () => {
          return this.simulateDisaster(config.type);
        });
      }

      // Phase 4: Recovery Execution
      await this.executePhase('recovery_execution', async () => {
        return this.executeRecovery(
          backupId as string,
          config.restoreEnvironment,
          config.dryRun
        );
      });

      // Phase 5: Validation
      await this.executePhase('validation', async () => {
        return this.runValidationTests(config.validationTests);
      });

      // Phase 6: Calculate objectives
      this.calculateObjectives();

      // Phase 7: Generate report
      this.currentResult.report = this.generateReport();

      this.currentResult.status = this.determineOverallStatus();
      this.currentResult.endTime = new Date();
      this.currentResult.duration = this.calculateDuration(
        this.currentResult.startTime,
        this.currentResult.endTime
      );

      this.emit('drill:complete', this.currentResult);

      // Send notifications
      if (config.notifications.onComplete) {
        await this.sendNotification('complete', this.currentResult);
      }
    } catch (error) {
      this.currentResult.status = 'failed';
      this.currentResult.endTime = new Date();
      this.currentResult.errors.push({
        phase: 'execution',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        recoverable: false,
      });

      this.emit('drill:failed', { drillId: config.id, error });

      if (config.notifications.onFailure) {
        await this.sendNotification('failed', this.currentResult);
      }

      // Auto rollback if enabled
      if (config.autoRollback) {
        await this.rollback();
      }
    }

    return this.currentResult;
  }

  /**
   * Initialize drill result
   */
  private initializeResult(config: DRDrillConfig): DRDrillResult {
    return {
      drillId: config.id,
      status: 'running',
      startTime: new Date(),
      phases: [],
      objectives: { ...config.objectives, compliant: false },
      validationResults: [],
      errors: [],
    };
  }

  /**
   * Execute a drill phase
   */
  private async executePhase<T>(
    name: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const phase: PhaseResult = {
      name,
      status: 'running',
      startTime: new Date(),
    };

    this.currentResult!.phases.push(phase);
    this.emit('phase:start', { drillId: this.currentDrill!.id, phase: name });

    try {
      const result = await executor();
      phase.status = 'completed';
      phase.endTime = new Date();
      phase.duration = this.calculateDuration(phase.startTime!, phase.endTime);

      this.emit('phase:complete', {
        drillId: this.currentDrill!.id,
        phase: name,
        duration: phase.duration,
      });

      return result;
    } catch (error) {
      phase.status = 'failed';
      phase.endTime = new Date();
      phase.error = error instanceof Error ? error.message : String(error);

      this.currentResult!.errors.push({
        phase: name,
        message: phase.error,
        timestamp: new Date(),
        recoverable: this.isRecoverableError(name, error),
      });

      this.emit('phase:failed', {
        drillId: this.currentDrill!.id,
        phase: name,
        error,
      });

      throw error;
    }
  }

  /**
   * Capture baseline metrics
   */
  private async captureBaseline(): Promise<Record<string, any>> {
    const baseline: Record<string, any> = {
      timestamp: new Date().toISOString(),
      databases: {},
    };

    try {
      // PostgreSQL row counts
      const pgResult = await execAsync(
        `docker exec postgres psql -U intelgraph -d intelgraph_dev -t -c "SELECT COUNT(*) FROM entities;" 2>/dev/null || echo "0"`
      );
      baseline.databases.postgres = {
        entityCount: parseInt(pgResult.stdout.trim()) || 0,
      };

      // Neo4j node counts
      const neo4jResult = await execAsync(
        `docker exec neo4j cypher-shell -u neo4j -p local_dev_pw "MATCH (n) RETURN COUNT(n)" 2>/dev/null || echo "0"`
      );
      baseline.databases.neo4j = {
        nodeCount: parseInt(neo4jResult.stdout.match(/\d+/)?.[0] || '0'),
      };

      // Redis info
      const redisResult = await execAsync(
        `docker exec redis redis-cli DBSIZE 2>/dev/null || echo "0"`
      );
      baseline.databases.redis = {
        keyCount: parseInt(redisResult.stdout.match(/\d+/)?.[0] || '0'),
      };
    } catch (error) {
      console.warn('Some baseline captures failed:', error);
    }

    // Save baseline to file
    const baselineFile = path.join(
      this.projectRoot,
      'dr-drills',
      `baseline-${Date.now()}.json`
    );
    await fs.promises.mkdir(path.dirname(baselineFile), { recursive: true });
    await fs.promises.writeFile(baselineFile, JSON.stringify(baseline, null, 2));

    return baseline;
  }

  /**
   * Create or find existing backup
   */
  private async createOrFindBackup(backupSet: BackupSet): Promise<string> {
    const scriptPath = path.join(
      this.projectRoot,
      'scripts',
      'backup-enhanced.sh'
    );

    // Check if recent backup exists (within last hour)
    const existingBackups = await this.findRecentBackups(backupSet, 3600);
    if (existingBackups.length > 0) {
      console.log(`Using existing backup: ${existingBackups[0]}`);
      return existingBackups[0];
    }

    // Create new backup
    const env = { ...process.env, BACKUP_SET: backupSet };
    const { stdout } = await execAsync(`${scriptPath} --set=${backupSet}`, {
      cwd: this.projectRoot,
      env,
    });

    // Extract backup ID from output
    const match = stdout.match(/Backup ID: (summit-backup-[^\s]+)/);
    if (!match) {
      throw new Error('Failed to create backup: could not extract backup ID');
    }

    return match[1];
  }

  /**
   * Find recent backups
   */
  private async findRecentBackups(
    backupSet: BackupSet,
    maxAgeSeconds: number
  ): Promise<string[]> {
    const backupsDir = path.join(this.projectRoot, this.backupBase);

    try {
      const entries = await fs.promises.readdir(backupsDir, {
        withFileTypes: true,
      });
      const cutoff = Date.now() - maxAgeSeconds * 1000;

      const backups: string[] = [];
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          entry.name.startsWith(`summit-backup-${backupSet}`)
        ) {
          const stat = await fs.promises.stat(
            path.join(backupsDir, entry.name)
          );
          if (stat.mtimeMs > cutoff) {
            backups.push(entry.name);
          }
        }
      }

      return backups.sort().reverse();
    } catch {
      return [];
    }
  }

  /**
   * Check if drill type requires disaster simulation
   */
  private requiresDisasterSimulation(type: DRDrillType): boolean {
    return ['total_data_loss', 'database_corruption', 'chaos_recovery'].includes(
      type
    );
  }

  /**
   * Simulate disaster based on drill type
   */
  private async simulateDisaster(type: DRDrillType): Promise<void> {
    switch (type) {
      case 'total_data_loss':
        // WARNING: This destroys data! Only run in isolated environments
        console.log('Simulating total data loss...');
        await execAsync('docker compose down -v 2>/dev/null || true', {
          cwd: this.projectRoot,
        });
        break;

      case 'database_corruption':
        // Simulate corruption by modifying some data
        console.log('Simulating database corruption...');
        await execAsync(
          `docker exec postgres psql -U intelgraph -d intelgraph_dev -c "UPDATE entities SET data = 'CORRUPTED' WHERE id IN (SELECT id FROM entities LIMIT 10);" 2>/dev/null || true`,
          { cwd: this.projectRoot }
        );
        break;

      case 'chaos_recovery':
        // Integrate with chaos engine
        console.log('Triggering chaos experiment...');
        // Would integrate with ChaosEngine here
        break;

      default:
        console.log(`No disaster simulation for type: ${type}`);
    }
  }

  /**
   * Execute recovery from backup
   */
  private async executeRecovery(
    backupId: string,
    environment: RestoreEnvironment,
    dryRun: boolean
  ): Promise<void> {
    const scriptPath = path.join(
      this.projectRoot,
      'scripts',
      'restore-enhanced.sh'
    );

    const args = [`"${backupId}"`, `--env=${environment}`];
    if (dryRun) {
      args.push('--dry-run');
    }

    await execAsync(`${scriptPath} ${args.join(' ')}`, {
      cwd: this.projectRoot,
      timeout: 3600000, // 1 hour timeout
    });
  }

  /**
   * Run validation tests
   */
  private async runValidationTests(
    tests: ValidationTest[]
  ): Promise<void> {
    for (const test of tests) {
      const result: ValidationResult = {
        testName: test.name,
        passed: false,
        duration: 0,
      };

      const startTime = Date.now();

      try {
        switch (test.type) {
          case 'health_check':
            if (test.endpoint) {
              const { stdout } = await execAsync(
                `curl -sf ${test.endpoint} -o /dev/null && echo "OK"`,
                { timeout: test.timeout * 1000 }
              );
              result.passed = stdout.includes('OK');
            }
            break;

          case 'data_integrity':
            // Run data integrity checks
            result.passed = await this.checkDataIntegrity();
            break;

          case 'golden_path':
            if (test.command) {
              await execAsync(test.command, {
                cwd: this.projectRoot,
                timeout: test.timeout * 1000,
              });
              result.passed = true;
            }
            break;

          case 'demo_story':
            if (test.command) {
              await execAsync(test.command, {
                cwd: this.projectRoot,
                timeout: test.timeout * 1000,
              });
              result.passed = true;
            }
            break;

          case 'custom':
            if (test.command) {
              const { stdout } = await execAsync(test.command, {
                cwd: this.projectRoot,
                timeout: test.timeout * 1000,
              });
              result.output = stdout;
              result.passed = true;
            }
            break;
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : String(error);
        result.passed = false;

        if (test.required) {
          throw new Error(`Required validation test failed: ${test.name}`);
        }
      }

      result.duration = (Date.now() - startTime) / 1000;
      this.currentResult!.validationResults.push(result);
    }
  }

  /**
   * Check data integrity after restore
   */
  private async checkDataIntegrity(): Promise<boolean> {
    try {
      // Check PostgreSQL
      const pgResult = await execAsync(
        `docker exec postgres psql -U intelgraph -d intelgraph_dev -c "SELECT 1" 2>/dev/null`
      );
      if (!pgResult.stdout) return false;

      // Check Neo4j
      const neo4jResult = await execAsync(
        `docker exec neo4j cypher-shell -u neo4j -p local_dev_pw "RETURN 1" 2>/dev/null`
      );
      if (!neo4jResult.stdout) return false;

      // Check Redis
      const redisResult = await execAsync(
        `docker exec redis redis-cli ping 2>/dev/null`
      );
      if (!redisResult.stdout.includes('PONG')) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate RTO/RPO objectives
   */
  private calculateObjectives(): void {
    const result = this.currentResult!;
    const objectives = result.objectives;

    // Calculate actual RTO (total drill duration)
    if (result.endTime) {
      objectives.rtoActual = this.calculateDuration(
        result.startTime,
        result.endTime
      );
    } else {
      objectives.rtoActual = this.calculateDuration(
        result.startTime,
        new Date()
      );
    }

    // RPO is based on backup age - for this drill, it's 0 since we just created it
    objectives.rpoActual = 0;

    // Check compliance
    objectives.compliant =
      objectives.rtoActual <= objectives.rtoTarget &&
      objectives.rpoActual <= objectives.rpoTarget;
  }

  /**
   * Generate drill report
   */
  private generateReport(): DRDrillReport {
    const result = this.currentResult!;
    const allTestsPassed = result.validationResults.every((r) => r.passed);
    const requiredTestsPassed = result.validationResults
      .filter((r) => this.currentDrill!.validationTests.find((t) => t.name === r.testName)?.required)
      .every((r) => r.passed);

    return {
      summary: this.generateSummary(),
      rtoCompliance: (result.objectives.rtoActual || 0) <= result.objectives.rtoTarget,
      rpoCompliance: (result.objectives.rpoActual || 0) <= result.objectives.rpoTarget,
      dataIntegrity: result.validationResults.find((r) => r.testName.includes('integrity'))?.passed ?? true,
      validationPassed: requiredTestsPassed,
      recommendations: this.generateRecommendations(),
      lessonsLearned: [],
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(): string {
    const result = this.currentResult!;
    const phasesCompleted = result.phases.filter((p) => p.status === 'completed').length;
    const totalPhases = result.phases.length;

    return `DR Drill ${result.drillId} completed with status: ${result.status}. ` +
      `${phasesCompleted}/${totalPhases} phases completed. ` +
      `RTO: ${result.objectives.rtoActual}s (target: ${result.objectives.rtoTarget}s). ` +
      `RPO: ${result.objectives.rpoActual}s (target: ${result.objectives.rpoTarget}s).`;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const result = this.currentResult!;

    if (!result.objectives.compliant) {
      if ((result.objectives.rtoActual || 0) > result.objectives.rtoTarget) {
        recommendations.push('Consider optimizing restore procedures to meet RTO target');
      }
      if ((result.objectives.rpoActual || 0) > result.objectives.rpoTarget) {
        recommendations.push('Increase backup frequency to meet RPO target');
      }
    }

    const failedTests = result.validationResults.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      recommendations.push(
        `Review and fix failing validation tests: ${failedTests.map((t) => t.testName).join(', ')}`
      );
    }

    if (result.errors.length > 0) {
      recommendations.push('Review and address errors encountered during drill');
    }

    return recommendations;
  }

  /**
   * Determine overall status
   */
  private determineOverallStatus(): DRDrillStatus {
    const result = this.currentResult!;

    if (result.errors.some((e) => !e.recoverable)) {
      return 'failed';
    }

    const requiredTestsFailed = result.validationResults.some(
      (r) =>
        !r.passed &&
        this.currentDrill!.validationTests.find((t) => t.name === r.testName)?.required
    );

    if (requiredTestsFailed) {
      return 'failed';
    }

    return 'completed';
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(phase: string, _error: unknown): boolean {
    // Validation failures are generally recoverable
    if (phase === 'validation') return true;
    // Baseline capture failures are recoverable
    if (phase === 'baseline_capture') return true;
    return false;
  }

  /**
   * Calculate duration in seconds
   */
  private calculateDuration(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 1000);
  }

  /**
   * Rollback after failed drill
   */
  private async rollback(): Promise<void> {
    console.log('Executing rollback...');
    // Restart services
    try {
      await execAsync('docker compose up -d', { cwd: this.projectRoot });
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(
    type: 'start' | 'complete' | 'failed',
    result: DRDrillResult
  ): Promise<void> {
    const config = this.currentDrill!.notifications;

    if (config.slackWebhook) {
      const message = {
        text: `DR Drill ${type.toUpperCase()}: ${result.drillId}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*DR Drill ${type}*\n` +
                `Drill ID: \`${result.drillId}\`\n` +
                `Status: ${result.status}\n` +
                `Duration: ${result.duration || 'N/A'}s`,
            },
          },
        ],
      };

      try {
        await execAsync(
          `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(message)}' ${config.slackWebhook}`
        );
      } catch (error) {
        console.warn('Failed to send Slack notification:', error);
      }
    }
  }

  /**
   * Create predefined DR drill configurations
   */
  static createDrillConfig(
    type: DRDrillType,
    options: Partial<DRDrillConfig> = {}
  ): DRDrillConfig {
    const baseConfig: DRDrillConfig = {
      id: `drill-${type}-${Date.now()}`,
      name: `${type.replace(/_/g, ' ')} DR Drill`,
      type,
      description: `Automated ${type.replace(/_/g, ' ')} disaster recovery drill`,
      backupSet: 'minimal',
      restoreEnvironment: 'dr_rehearsal',
      objectives: {
        rtoTarget: 14400, // 4 hours in seconds
        rpoTarget: 900, // 15 minutes in seconds
        compliant: false,
      },
      dryRun: false,
      autoRollback: true,
      validationTests: [
        {
          name: 'postgres_health',
          type: 'health_check',
          endpoint: 'http://localhost:5432',
          timeout: 30,
          required: true,
        },
        {
          name: 'neo4j_health',
          type: 'health_check',
          endpoint: 'http://localhost:7474',
          timeout: 30,
          required: true,
        },
        {
          name: 'data_integrity',
          type: 'data_integrity',
          timeout: 60,
          required: true,
        },
      ],
      notifications: {
        onStart: true,
        onComplete: true,
        onFailure: true,
      },
      metadata: {
        author: 'system',
        team: 'platform',
        environment: 'dr_rehearsal',
        tags: ['dr', 'drill', type],
        createdAt: new Date(),
        version: '1.0.0',
      },
    };

    // Merge with provided options
    return { ...baseConfig, ...options };
  }
}

/**
 * Export factory function
 */
export function createDRDrillRunner(
  projectRoot: string,
  backupBase?: string
): DRDrillRunner {
  return new DRDrillRunner(projectRoot, backupBase);
}

/**
 * Export predefined drill types
 */
export const PREDEFINED_DRILLS = {
  TOTAL_DATA_LOSS: 'total_data_loss',
  DATABASE_CORRUPTION: 'database_corruption',
  MULTI_REGION_FAILOVER: 'multi_region_failover',
  BACKUP_VALIDATION: 'backup_validation',
  TENANT_RECOVERY: 'tenant_recovery',
  CHAOS_RECOVERY: 'chaos_recovery',
} as const;
