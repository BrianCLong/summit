"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationRunner = exports.InMemoryCheckpointStore = void 0;
class InMemoryCheckpointStore {
    state = new Map();
    markers = new Map();
    async status(stepId) {
        return this.state.get(stepId) ?? 'pending';
    }
    async markInProgress(stepId) {
        this.state.set(stepId, 'in-progress');
    }
    async markComplete(stepId) {
        this.state.set(stepId, 'completed');
    }
    async recordRollbackMarker(stepId, marker) {
        this.markers.set(stepId, marker);
    }
    async listRollbackMarkers() {
        return Object.fromEntries(this.markers.entries());
    }
}
exports.InMemoryCheckpointStore = InMemoryCheckpointStore;
class MigrationRunner {
    store;
    steps;
    constructor(store, steps) {
        this.store = store;
        this.steps = steps;
    }
    async preflight() {
        for (const step of this.steps) {
            const status = await this.store.status(step.id);
            if (status === 'completed')
                continue;
            const depends = step.dependsOn ?? [];
            for (const dependency of depends) {
                const depStatus = await this.store.status(dependency);
                if (depStatus !== 'completed') {
                    throw new Error(`Preflight failed: dependency ${dependency} incomplete for ${step.id}`);
                }
            }
            if (step.preflight) {
                const result = await step.preflight();
                if (!result.ok) {
                    const reasons = result.reasons?.join(', ') ?? 'unknown reason';
                    throw new Error(`Preflight failed for ${step.id}: ${reasons}`);
                }
            }
        }
    }
    async dryRun() {
        await this.preflight();
        const planned = [];
        for (const step of this.steps) {
            const status = await this.store.status(step.id);
            if (status === 'completed')
                continue;
            const preview = step.dryRun ? await step.dryRun() : [`apply ${step.id}`];
            planned.push(...preview);
        }
        return planned;
    }
    async apply() {
        await this.preflight();
        for (const step of this.steps) {
            const status = await this.store.status(step.id);
            if (status === 'completed') {
                continue;
            }
            await this.store.markInProgress(step.id);
            const context = {
                recordRollbackMarker: (stepId, marker) => this.store.recordRollbackMarker(stepId, marker),
                statusOf: (stepId) => this.store.status(stepId),
            };
            await step.apply(context);
            await this.store.markComplete(step.id);
        }
    }
}
exports.MigrationRunner = MigrationRunner;
