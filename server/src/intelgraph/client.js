"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphClientImpl = void 0;
// a very thin, testable class
class IntelGraphClientImpl {
    // ctor injects db driver / graph client
    runs = new Map();
    tasks = new Map();
    artifacts = new Map();
    costs = new Map();
    async createRun(run) {
        this.runs.set(run.id, run);
    }
    async updateRun(runId, patch) {
        const existing = this.runs.get(runId);
        if (existing) {
            this.runs.set(runId, { ...existing, ...patch });
        }
    }
    async createTask(task) {
        this.tasks.set(task.id, task);
    }
    async updateTask(taskId, patch) {
        const existing = this.tasks.get(taskId);
        if (existing) {
            this.tasks.set(taskId, { ...existing, ...patch });
        }
    }
    async createArtifact(artifact) {
        this.artifacts.set(artifact.id, artifact);
    }
    async getArtifactsForRun(runId) {
        return Array.from(this.artifacts.values()).filter(a => a.runId === runId);
    }
    async getArtifactsForTask(taskId) {
        return Array.from(this.artifacts.values()).filter(a => a.taskId === taskId);
    }
    async recordCostSample(sample) {
        this.costs.set(sample.id, sample);
    }
    async getRunCostSummary(runId) {
        const summary = {
            runId,
            totalCostUSD: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            byModel: {}
        };
        for (const cost of this.costs.values()) {
            if (cost.runId === runId) {
                summary.totalCostUSD += cost.cost;
                summary.totalInputTokens += cost.inputTokens;
                summary.totalOutputTokens += cost.outputTokens;
                const key = cost.model;
                if (!summary.byModel[key]) {
                    summary.byModel[key] = { costUSD: 0, inputTokens: 0, outputTokens: 0 };
                }
                summary.byModel[key].costUSD += cost.cost;
                summary.byModel[key].inputTokens += cost.inputTokens;
                summary.byModel[key].outputTokens += cost.outputTokens;
            }
        }
        return summary;
    }
    async getRun(runId) {
        return this.runs.get(runId) || null;
    }
    async getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }
    async getTasksForRun(runId) {
        return Array.from(this.tasks.values()).filter(t => t.runId === runId);
    }
}
exports.IntelGraphClientImpl = IntelGraphClientImpl;
