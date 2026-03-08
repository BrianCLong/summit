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
exports.TelemetryLayer = void 0;
const fs = __importStar(require("fs"));
class TelemetryLayer {
    logFile;
    nodes = new Map();
    edges = [];
    constructor(logFilePath = 'governance_events.jsonl') {
        this.logFile = logFilePath;
        // Ensure log file exists or create it
        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, '');
        }
    }
    async logEvent(event) {
        // 1. Write to JSONL (Async)
        const line = JSON.stringify(event) + '\n';
        await fs.promises.appendFile(this.logFile, line);
        // 2. Update Graph
        this.updateGraph(event);
    }
    updateGraph(event) {
        // Prevent Memory Leak: Cap graph size (Simple FIFO or just clear for v0.1)
        if (this.nodes.size > 10000) {
            this.nodes.clear(); // Drastic, but prevents OOM in this demo implementation
            this.edges = [];
        }
        // Node for the event
        this.nodes.set(event.id, {
            id: event.id,
            type: 'event',
            data: event
        });
        // Node for the run (if not exists)
        if (!this.nodes.has(event.runId)) {
            this.nodes.set(event.runId, {
                id: event.runId,
                type: 'run',
                data: { id: event.runId }
            });
        }
        // Edge: Event belongs to Run
        this.edges.push({
            from: event.id,
            to: event.runId,
            relation: 'belongs_to'
        });
        // If there's a model ID, link it
        if (event.modelId) {
            if (!this.nodes.has(event.modelId)) {
                this.nodes.set(event.modelId, {
                    id: event.modelId,
                    type: 'model',
                    data: { id: event.modelId }
                });
            }
            this.edges.push({
                from: event.runId,
                to: event.modelId,
                relation: 'uses_model'
            });
        }
        // Causal link
        if (event.previousEventId) {
            this.edges.push({
                from: event.id,
                to: event.previousEventId,
                relation: 'follows'
            });
        }
    }
    getGraphStats() {
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.length
        };
    }
    getTrace(runId) {
        // Find all events for a run
        const events = [];
        for (const node of this.nodes.values()) {
            if (node.type === 'event' && node.data.runId === runId) {
                events.push(node.data);
            }
        }
        return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
}
exports.TelemetryLayer = TelemetryLayer;
