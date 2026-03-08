"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskGraph = void 0;
const crypto_1 = __importDefault(require("crypto"));
class TaskGraph {
    tasks = new Map();
    addTask(task) {
        this.tasks.set(task.id, task);
    }
    getTask(id) {
        return this.tasks.get(id);
    }
    getReadyTasks() {
        const ready = [];
        for (const task of this.tasks.values()) {
            if (task.status === 'pending') {
                const isBlocked = task.blockedBy.some(depId => {
                    const dep = this.tasks.get(depId);
                    // If dependency is missing, we assume it's not completed, so blocked.
                    // Or should we assume unblocked? Safety says blocked.
                    return !dep || dep.status !== 'completed';
                });
                if (!isBlocked) {
                    ready.push(task);
                }
            }
        }
        // Deterministic sort by ID
        return ready.sort((a, b) => a.id.localeCompare(b.id));
    }
    completeTask(taskId, timestamp) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = 'completed';
            task.timestamps.completed = timestamp;
        }
    }
    startTask(taskId, owner, timestamp) {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'pending') {
            task.status = 'in_progress';
            task.owner = owner;
            task.timestamps.started = timestamp;
        }
    }
    /**
     * Calculate a deterministic hash of the current graph state.
     */
    getHash() {
        const sortedTasks = Array.from(this.tasks.values()).sort((a, b) => a.id.localeCompare(b.id));
        const content = JSON.stringify(sortedTasks);
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
}
exports.TaskGraph = TaskGraph;
