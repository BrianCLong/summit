"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationQueue = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class VerificationQueue {
    tasks = new Map();
    options;
    constructor(options = {}) {
        this.options = {
            minimumConfidence: options.minimumConfidence ?? 0.7,
            enforceForSeverities: options.enforceForSeverities ?? new Set(['critical', 'high']),
            hooks: options.hooks,
        };
    }
    shouldEnqueue(entity) {
        if (entity.confidence < (this.options.minimumConfidence ?? 0.7)) {
            return true;
        }
        return this.options.enforceForSeverities?.has(entity.severity) ?? false;
    }
    async enqueue(entity) {
        const task = {
            taskId: node_crypto_1.default.randomUUID(),
            entity,
            createdAt: new Date().toISOString(),
            status: 'pending',
        };
        this.tasks.set(task.taskId, task);
        await this.options.hooks?.onTaskCreated?.(task);
        return task;
    }
    async resolve(taskId, status, reviewer, notes) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Unknown verification task ${taskId}`);
        }
        const updated = {
            ...task,
            status,
            reviewer,
            notes,
        };
        this.tasks.set(taskId, updated);
        await this.options.hooks?.onTaskResolved?.(updated);
        return updated;
    }
    list(status) {
        return [...this.tasks.values()].filter((task) => status ? task.status === status : true);
    }
    clear() {
        this.tasks.clear();
    }
}
exports.VerificationQueue = VerificationQueue;
