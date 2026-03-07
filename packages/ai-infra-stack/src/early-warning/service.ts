import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    SignalType,
    PriorityLevel,
    AlertSpec,
    RateLimits,
    defaultAlertSpec,
    defaultRateLimits
} from './config';

export interface Signal {
    id: string;
    type: SignalType;
    provider: string;
    topic: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

export interface Alert {
    id: string;
    signalId: string;
    type: SignalType;
    priority: PriorityLevel;
    provider: string;
    topic: string;
    timestamp: number;
    description: string;
}

export class SeverityClassifier {
    constructor(private spec: AlertSpec = defaultAlertSpec) {}

    classify(signal: Signal): PriorityLevel {
        const alertDef = this.spec[signal.type];
        if (!alertDef) {
            return 'P3'; // Default to lowest priority if unknown
        }
        return alertDef.priority;
    }
}

export class SuppressionEngine {
    // Map of signal type -> array of timestamps
    private history: Map<SignalType, number[]> = new Map();

    constructor(private limits: RateLimits = defaultRateLimits) {}

    /**
     * Returns true if the signal should be allowed (not suppressed), false otherwise.
     */
    shouldAllow(signal: Signal): boolean {
        const limitConfig = this.limits[signal.type];
        if (!limitConfig) {
            return true; // No limit defined, always allow
        }

        const now = signal.timestamp;
        const windowStart = now - limitConfig.windowMs;

        let timestamps = this.history.get(signal.type) || [];

        // Remove old timestamps outside the window
        timestamps = timestamps.filter(t => t > windowStart);

        if (timestamps.length >= limitConfig.maxOccurrences) {
            // Update history but return false to suppress
            this.history.set(signal.type, timestamps);
            return false;
        }

        // Allow signal, add to history
        timestamps.push(now);
        this.history.set(signal.type, timestamps);

        return true;
    }

    reset() {
        this.history.clear();
    }
}

export class GovernanceRouter {
    private outDir: string;
    private alertCount: number = 0;

    constructor(baseDir: string = process.cwd()) {
        this.outDir = path.join(baseDir, 'reports', 'ai-infra-stack');
    }

    routeAlert(alert: Alert): string {
        this.alertCount++;
        const sequenceNum = this.alertCount.toString().padStart(3, '0');

        // EVID:AIINFRA:early-warning:<provider>:<topic>:<nnn>
        const evidenceId = `EVID:AIINFRA:early-warning:${alert.provider}:${alert.topic}:${sequenceNum}`;

        this.writeArtifacts(alert, evidenceId);

        return evidenceId;
    }

    private writeArtifacts(alert: Alert, evidenceId: string) {
        if (!fs.existsSync(this.outDir)) {
            fs.mkdirSync(this.outDir, { recursive: true });
        }

        const sanitizedId = evidenceId.replace(/:/g, '-');
        const outPath = path.join(this.outDir, sanitizedId);
        if (!fs.existsSync(outPath)) {
            fs.mkdirSync(outPath, { recursive: true });
        }

        const reportPath = path.join(outPath, 'report.json');
        const metricsPath = path.join(outPath, 'metrics.json');
        const stampPath = path.join(outPath, 'stamp.json');

        // report.json - deterministic content
        const report = {
            evidenceId,
            alertId: alert.id,
            signalId: alert.signalId,
            type: alert.type,
            priority: alert.priority,
            description: alert.description,
            provider: alert.provider,
            topic: alert.topic
        };
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // metrics.json - deterministic metrics
        const metrics = {
            evidenceId,
            priorityScore: this.getPriorityScore(alert.priority),
            type: alert.type
        };
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

        // stamp.json - non-deterministic timestamps and context
        const stamp = {
            evidenceId,
            timestamp: alert.timestamp,
            processedAt: Date.now()
        };
        fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
    }

    private getPriorityScore(priority: PriorityLevel): number {
        switch (priority) {
            case 'P0': return 100;
            case 'P1': return 80;
            case 'P2': return 50;
            case 'P3': return 20;
            default: return 0;
        }
    }
}

export class EarlyWarningLayer {
    private classifier: SeverityClassifier;
    private suppressionEngine: SuppressionEngine;
    private governanceRouter: GovernanceRouter;
    private spec: AlertSpec;

    constructor(
        spec: AlertSpec = defaultAlertSpec,
        limits: RateLimits = defaultRateLimits,
        baseDir?: string
    ) {
        this.spec = spec;
        this.classifier = new SeverityClassifier(spec);
        this.suppressionEngine = new SuppressionEngine(limits);
        this.governanceRouter = new GovernanceRouter(baseDir);
    }

    processSignal(signal: Signal): { allowed: boolean, alert?: Alert, evidenceId?: string } {
        const allowed = this.suppressionEngine.shouldAllow(signal);

        if (!allowed) {
            return { allowed: false };
        }

        const priority = this.classifier.classify(signal);
        const description = this.spec[signal.type]?.description || `Unknown signal type: ${signal.type}`;

        const alert: Alert = {
            id: `alert-${Math.random().toString(36).substr(2, 9)}`,
            signalId: signal.id,
            type: signal.type,
            priority,
            provider: signal.provider,
            topic: signal.topic,
            timestamp: signal.timestamp,
            description
        };

        const evidenceId = this.governanceRouter.routeAlert(alert);

        return { allowed: true, alert, evidenceId };
    }

    resetSuppression() {
        this.suppressionEngine.reset();
    }
}
