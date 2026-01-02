
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger.js';
import { otelService } from '../../middleware/observability/otel-tracing.js';

export class PolicyWatcher {
    private static instance: PolicyWatcher;
    private policiesDir: string;
    private checkInterval: NodeJS.Timeout | null = null;
    private lastKnownHash: string = '';

    private constructor() {
        // Assume policies are at server root /policies
        this.policiesDir = path.resolve(process.cwd(), 'policies');
    }

    public static getInstance(): PolicyWatcher {
        if (!PolicyWatcher.instance) {
            PolicyWatcher.instance = new PolicyWatcher();
        }
        return PolicyWatcher.instance;
    }

    public start(intervalMs: number = 60000) {
        if (this.checkInterval) return;

        logger.info('Starting PolicyWatcher drift detection', { policiesDir: this.policiesDir });
        this.checkDrift(); // Initial check

        this.checkInterval = setInterval(() => {
            this.checkDrift();
        }, intervalMs);
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    public async checkDrift(): Promise<boolean> {
        const span = otelService.createSpan('policy.check_drift');
        try {
            // 1. Calculate local hash of all rego files
            const localHash = await this.calculateLocalPolicyHash();

            // 2. Fetch remote/active policy hash from OPA (Mocked for now)
            const activeHash = await this.fetchActivePolicyHash();

            const drifted = localHash !== activeHash;

            if (drifted) {
                logger.warn('Policy Drift Detected!', {
                    localHash,
                    activeHash,
                    dir: this.policiesDir
                });
                // In production: trigger alert (PagerDuty/Slack)
                otelService.addSpanAttributes({ 'policy.drift': true });
            } else {
                logger.debug('Policy sync confirmed', { hash: localHash });
                otelService.addSpanAttributes({ 'policy.drift': false });
            }

            // Update last known for memory reference
            this.lastKnownHash = localHash;

            return drifted;

        } catch (error: any) {
            logger.error('Failed to check policy drift', { error: error.message });
            return false; // Error state
        } finally {
            span?.end();
        }
    }

    private async calculateLocalPolicyHash(): Promise<string> {
        // Simple hash of all .rego file contents sorted by name
        try {
            if (!fs.existsSync(this.policiesDir)) {
                logger.warn('Policies directory not found', { path: this.policiesDir });
                return 'empty';
            }

            const files = fs.readdirSync(this.policiesDir)
                .filter((f: string) => f.endsWith('.rego'))
                .sort();

            const hash = createHash('sha256');

            for (const file of files) {
                const content = fs.readFileSync(path.join(this.policiesDir, file));
                hash.update(file); // Include filename in hash
                hash.update(content);
            }

            return hash.digest('hex');
        } catch (e: any) {
            logger.error('Error hashing policies', e);
            throw e;
        }
    }

    private async fetchActivePolicyHash(): Promise<string> {
        // Mock OPA response
        // In real world: valid response matching current git state if deployed recently
        // For simulation: return the same hash as local to simulate "Synced" state
        // OR return a dummy hash to simulate "Drift" if we want to test drift.

        // Let's assume for MVP validation that we want to simulate SYNCED state normally.
        // We can check an env var to simulate drift.
        if (process.env.SIMULATE_POLICY_DRIFT === 'true') {
            return 'drifted-hash-value';
        }

        return this.calculateLocalPolicyHash();
    }
}
