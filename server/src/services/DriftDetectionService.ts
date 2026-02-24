
import fs from 'fs/promises';
import crypto from 'crypto';
import { logger } from '../config/logger.js';
import { alertingService } from '../lib/telemetry/alerting-service.js';

export class DriftDetectionService {
    private static instance: DriftDetectionService;
    private knownFileHashes: Map<string, string> = new Map();
    private baselineAgentMetrics: Map<string, { successRate: number; errorRate: number }> = new Map();
    private monitoringInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.baselineAgentMetrics.set('planner', { successRate: 0.95, errorRate: 0.05 });
    }

    public static getInstance(): DriftDetectionService {
        if (!DriftDetectionService.instance) {
            DriftDetectionService.instance = new DriftDetectionService();
        }
        return DriftDetectionService.instance;
    }

    public startMonitoring(intervalMs: number = 3600000): void { // Default 1 hour
        if (this.monitoringInterval) return;

        logger.info('Starting Drift Detection Monitoring');

        // Initial check
        this.runChecks();

        this.monitoringInterval = setInterval(() => {
            this.runChecks();
        }, intervalMs);
    }

    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    private async runChecks(): Promise<void> {
        // Critical paths to monitor
        const criticalPaths = [
            'server/src/maestro/governance-service.ts',
            'server/src/services/AuthService.ts' // Assuming existence or common path
        ];

        // Filter paths that actually exist to avoid noise in this MVP
        const existingPaths: string[] = [];
        for (const p of criticalPaths) {
            try {
                await fs.access(p);
                existingPaths.push(p);
            } catch {
                // Ignore missing files for now
            }
        }

        await this.checkCodeDrift(existingPaths);
        await this.checkPolicyDrift();
    }

    public async checkCodeDrift(criticalPaths: string[]): Promise<boolean> {
        let drifted = false;
        for (const filePath of criticalPaths) {
            try {
                const content = await fs.readFile(filePath);
                const hash = crypto.createHash('sha256').update(content).digest('hex');

                if (this.knownFileHashes.has(filePath)) {
                    const knownHash = this.knownFileHashes.get(filePath);
                    if (knownHash !== hash) {
                        logger.error({ filePath, knownHash, currentHash: hash }, 'CODE DRIFT DETECTED');
                        alertingService.sendAlert(`Code drift detected in ${filePath}`);
                        drifted = true;
                    }
                } else {
                    this.knownFileHashes.set(filePath, hash);
                }
            } catch (err: any) {
                logger.warn({ filePath, error: err }, 'Failed to check code drift for file');
            }
        }
        return drifted;
    }

    public async checkPolicyDrift(): Promise<void> {
        // Placeholder for policy drift logic
    }

    public checkBehavioralDrift(agentId: string, currentMetrics: { successRate: number; errorRate: number }): void {
        const baseline = this.baselineAgentMetrics.get(agentId);
        if (!baseline) return;

        if (currentMetrics.successRate < baseline.successRate * 0.9) {
             logger.warn({ agentId, current: currentMetrics.successRate, baseline: baseline.successRate }, 'BEHAVIORAL DRIFT: Success Rate Drop');
             alertingService.sendAlert(`Agent ${agentId} success rate dropped below baseline`);
        }

        if (currentMetrics.errorRate > baseline.errorRate * 1.5) {
             logger.warn({ agentId, current: currentMetrics.errorRate, baseline: baseline.errorRate }, 'BEHAVIORAL DRIFT: Error Rate Spike');
             alertingService.sendAlert(`Agent ${agentId} error rate spiked above baseline`);
        }
    }
}

export const driftDetectionService = DriftDetectionService.getInstance();
