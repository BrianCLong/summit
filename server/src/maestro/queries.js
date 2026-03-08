"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroQueries = void 0;
class MaestroQueries {
    ig;
    constructor(ig) {
        this.ig = ig;
    }
    async getTaskWithArtifacts(taskId) {
        const task = await this.ig.getTask(taskId);
        if (!task)
            return null;
        const artifacts = await this.ig.getArtifactsForTask(taskId);
        return { task, artifacts };
    }
    /**
     * Reconstruct a MaestroRunResponse from stored graph data.
     */
    async getRunResponse(runId) {
        const run = await this.ig.getRun(runId);
        if (!run)
            return null;
        const [tasks, artifacts, costSummary] = await Promise.all([
            this.ig.getTasksForRun(runId),
            this.ig.getArtifactsForRun(runId),
            this.ig.getRunCostSummary(runId),
        ]);
        // “tasks” for UI summary
        const taskSummaries = tasks.map(t => ({
            id: t.id,
            status: t.status,
            description: t.description,
        }));
        // match artifacts per task
        const results = tasks.map(task => {
            const taskArtifacts = artifacts.filter(a => a.taskId === task.id);
            // For v0.1, pick the first artifact; you can generalize later
            const artifact = taskArtifacts[0] ?? null;
            return {
                task: {
                    id: task.id,
                    status: task.status,
                    description: task.description,
                    errorMessage: task.errorMessage,
                },
                artifact,
            };
        });
        return {
            run,
            tasks: taskSummaries,
            results,
            costSummary,
        };
    }
}
exports.MaestroQueries = MaestroQueries;
