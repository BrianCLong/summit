import { BackupService } from './BackupService.js';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logger = (pino as any)({ name: 'DisasterRecoveryService' });
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

export class DisasterRecoveryService {
    private static instance: DisasterRecoveryService;
    private backupService: BackupService;

    private constructor() {
        this.backupService = BackupService.getInstance();
    }

    public static getInstance(): DisasterRecoveryService {
        if (!DisasterRecoveryService.instance) {
            DisasterRecoveryService.instance = new DisasterRecoveryService();
        }
        return DisasterRecoveryService.instance;
    }

    async runRestorationDrill(): Promise<{ success: boolean; report: any }> {
        logger.info('Starting Disaster Recovery Drill');

        const startTime = Date.now();

        // 1. Perform Backup
        logger.info('Phase 1: Executing Full Backup');
        const backupResult = await this.backupService.performFullBackup();

        // 2. Verify Artifacts
        logger.info('Phase 2: Verifying Backup Artifacts');
        const validation = this.verifyArtifacts(backupResult);

        // 3. Restoration Simulation (Future: Spin up test containers and restore)
        // For now, we rely on artifact verification.

        const duration = Date.now() - startTime;

        const report = {
            timestamp: new Date(),
            durationMs: duration,
            backup: backupResult,
            validation,
            status: validation.valid ? 'PASSED' : 'FAILED'
        };

        if (!validation.valid) {
            logger.error('DR Drill Failed: Artifacts invalid', report);
            return { success: false, report };
        }

        logger.info('DR Drill Passed', report);
        return { success: true, report };
    }

    private verifyArtifacts(result: { postgres: boolean; neo4j: boolean; redis: boolean; timestamp: string }) {
        const errors: string[] = [];
        const artifacts: Record<string, any> = {};

        if (result.postgres) {
            const f = path.join(BACKUP_DIR, `postgres_${result.timestamp}.sql`);
            const status = this.checkFile(f);
            artifacts.postgres = { path: f, ...status };
            if (!status.exists || status.size === 0) errors.push(`Postgres backup empty/missing: ${f}`);
        } else {
            errors.push('Postgres backup failed during execution');
        }

        if (result.neo4j) {
            const f = path.join(BACKUP_DIR, `neo4j_${result.timestamp}.json`);
            const status = this.checkFile(f);
            artifacts.neo4j = { path: f, ...status };
            if (!status.exists || status.size === 0) errors.push(`Neo4j backup empty/missing: ${f}`);
        } else {
            errors.push('Neo4j backup failed during execution');
        }

        if (result.redis) {
            const f = path.join(BACKUP_DIR, `redis_${result.timestamp}.jsonl`);
            const status = this.checkFile(f);
            artifacts.redis = { path: f, ...status };
            if (!status.exists || status.size === 0) errors.push(`Redis backup empty/missing: ${f}`);
        } else {
            errors.push('Redis backup failed during execution');
        }

        return {
            valid: errors.length === 0,
            errors,
            artifacts
        };
    }

    private checkFile(filePath: string): { exists: boolean; size: number } {
        try {
            const stats = fs.statSync(filePath);
            return { exists: true, size: stats.size };
        } catch (e) {
            return { exists: false, size: 0 };
        }
    }
}
