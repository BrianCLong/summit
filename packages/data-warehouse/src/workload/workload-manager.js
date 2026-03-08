"use strict";
/**
 * Workload Manager for Query Prioritization and Resource Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkloadManager = exports.QueryPriority = void 0;
var QueryPriority;
(function (QueryPriority) {
    QueryPriority[QueryPriority["CRITICAL"] = 0] = "CRITICAL";
    QueryPriority[QueryPriority["HIGH"] = 1] = "HIGH";
    QueryPriority[QueryPriority["MEDIUM"] = 2] = "MEDIUM";
    QueryPriority[QueryPriority["LOW"] = 3] = "LOW";
    QueryPriority[QueryPriority["BATCH"] = 4] = "BATCH";
})(QueryPriority || (exports.QueryPriority = QueryPriority = {}));
class WorkloadManager {
    config;
    runningQueries = new Map();
    queuedQueries = [];
    constructor(config) {
        this.config = config;
    }
    canExecute(priority) {
        return this.runningQueries.size < this.config.maxConcurrentQueries;
    }
    async queue(queryId, priority) {
        this.queuedQueries.push({ queryId, priority });
        this.queuedQueries.sort((a, b) => a.priority - b.priority);
    }
    async start(queryId, priority) {
        this.runningQueries.set(queryId, {
            priority,
            startTime: Date.now(),
        });
    }
    async complete(queryId) {
        this.runningQueries.delete(queryId);
        await this.processQueue();
    }
    async processQueue() {
        while (this.queuedQueries.length > 0 &&
            this.runningQueries.size < this.config.maxConcurrentQueries) {
            const next = this.queuedQueries.shift();
            if (next) {
                await this.start(next.queryId, next.priority);
            }
        }
    }
}
exports.WorkloadManager = WorkloadManager;
