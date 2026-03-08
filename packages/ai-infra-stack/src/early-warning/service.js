"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarlyWarningLayer = exports.GovernanceRouter = exports.SuppressionEngine = exports.SeverityClassifier = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const config_1 = require("./config");
class SeverityClassifier {
    spec;
    constructor(spec = config_1.defaultAlertSpec) {
        this.spec = spec;
    }
    classify(signal) {
        const alertDef = this.spec[signal.type];
        if (!alertDef) {
            return 'P3'; // Default to lowest priority if unknown
        }
        return alertDef.priority;
    }
}
exports.SeverityClassifier = SeverityClassifier;
class SuppressionEngine {
    limits;
    // Map of signal type -> array of timestamps
    history = new Map();
    constructor(limits = config_1.defaultRateLimits) {
        this.limits = limits;
    }
    /**
     * Returns true if the signal should be allowed (not suppressed), false otherwise.
     */
    shouldAllow(signal) {
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
exports.SuppressionEngine = SuppressionEngine;
class GovernanceRouter {
    outDir;
    alertCount = 0;
    constructor(baseDir = process.cwd()) {
        this.outDir = path.join(baseDir, 'reports', 'ai-infra-stack');
    }
    routeAlert(alert) {
        this.alertCount++;
        const sequenceNum = this.alertCount.toString().padStart(3, '0');
        // EVID:AIINFRA:early-warning:<provider>:<topic>:<nnn>
        const evidenceId = `EVID:AIINFRA:early-warning:${alert.provider}:${alert.topic}:${sequenceNum}`;
        this.writeArtifacts(alert, evidenceId);
        return evidenceId;
    }
    writeArtifacts(alert, evidenceId) {
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
    getPriorityScore(priority) {
        switch (priority) {
            case 'P0': return 100;
            case 'P1': return 80;
            case 'P2': return 50;
            case 'P3': return 20;
            default: return 0;
        }
    }
}
exports.GovernanceRouter = GovernanceRouter;
class EarlyWarningLayer {
    classifier;
    suppressionEngine;
    governanceRouter;
    spec;
    constructor(spec = config_1.defaultAlertSpec, limits = config_1.defaultRateLimits, baseDir) {
        this.spec = spec;
        this.classifier = new SeverityClassifier(spec);
        this.suppressionEngine = new SuppressionEngine(limits);
        this.governanceRouter = new GovernanceRouter(baseDir);
    }
    processSignal(signal) {
        const allowed = this.suppressionEngine.shouldAllow(signal);
        if (!allowed) {
            return { allowed: false };
        }
        const priority = this.classifier.classify(signal);
        const description = this.spec[signal.type]?.description || `Unknown signal type: ${signal.type}`;
        const alert = {
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
exports.EarlyWarningLayer = EarlyWarningLayer;
