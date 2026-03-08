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
exports.snapshotter = void 0;
const v8 = __importStar(require("v8"));
const fs = __importStar(require("fs"));
const comprehensive_telemetry_js_1 = require("./comprehensive-telemetry.js");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const telemetry_js_1 = require("../../config/telemetry.js");
const config_js_1 = require("../../config.js");
class DiagnosticSnapshotter {
    snapshotInProgress = false;
    activeRequests = new Set();
    constructor() {
        // Periodically check thresholds
        setInterval(() => {
            this.checkMemoryThreshold();
            this.checkLatencyThreshold();
        }, 15000);
        comprehensive_telemetry_js_1.telemetry.onMetric((metricName, value) => {
            if (metricName === 'request_duration_seconds') {
                this.latencies.push(value);
            }
        });
    }
    checkMemoryThreshold() {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > telemetry_js_1.telemetryConfig.snapshotter.memoryThreshold) {
            this.triggerSnapshot(`memory_threshold_exceeded_${memoryUsage}`);
        }
    }
    latencies = [];
    checkLatencyThreshold() {
        if (this.latencies.length === 0) {
            return;
        }
        const averageLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
        if (averageLatency > telemetry_js_1.telemetryConfig.snapshotter.latencyThreshold) {
            this.triggerSnapshot(`latency_threshold_exceeded_${averageLatency}`);
        }
        this.latencies = [];
    }
    triggerSnapshot(reason) {
        if (this.snapshotInProgress) {
            console.warn('Snapshot already in progress, skipping.');
            return;
        }
        this.snapshotInProgress = true;
        console.log(`Triggering snapshot due to: ${reason}`);
        try {
            this.captureHeapSnapshot();
            this.captureConfigState();
            this.captureActiveRequests();
        }
        catch (error) {
            console.error('Failed to capture diagnostic snapshot:', error);
        }
        finally {
            this.snapshotInProgress = false;
        }
    }
    captureHeapSnapshot() {
        const snapshotStream = v8.getHeapSnapshot();
        const snapshotPath = path.join(os.tmpdir(), `heap-snapshot-${Date.now()}.heapsnapshot`);
        const fileStream = fs.createWriteStream(snapshotPath);
        snapshotStream.pipe(fileStream);
        console.log(`Heap snapshot captured at: ${snapshotPath}`);
    }
    captureConfigState() {
        const configPath = path.join(os.tmpdir(), `config-state-${Date.now()}.json`);
        fs.writeFileSync(configPath, JSON.stringify(config_js_1.cfg, null, 2));
        console.log(`Configuration state captured at: ${configPath}`);
    }
    sanitizeHeaders(headers) {
        const sanitizedHeaders = {};
        for (const key in headers) {
            if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'cookie') {
                sanitizedHeaders[key] = '[REDACTED]';
            }
            else {
                sanitizedHeaders[key] = headers[key];
            }
        }
        return sanitizedHeaders;
    }
    captureActiveRequests() {
        const activeRequestsPath = path.join(os.tmpdir(), `active-requests-${Date.now()}.json`);
        const activeRequests = {
            count: this.activeRequests.size,
            requests: Array.from(this.activeRequests).map((req) => ({
                method: req.method,
                url: req.url,
                headers: this.sanitizeHeaders(req.headers),
            })),
        };
        fs.writeFileSync(activeRequestsPath, JSON.stringify(activeRequests, null, 2));
        console.log(`Active requests captured at: ${activeRequestsPath}`);
    }
    trackRequest(req) {
        this.activeRequests.add(req);
    }
    untrackRequest(req) {
        this.activeRequests.delete(req);
    }
}
exports.snapshotter = new DiagnosticSnapshotter();
