"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTaskQueue = void 0;
class InMemoryTaskQueue {
    tasks = new Map();
    queue = [];
    async enqueue(taskData) {
        const task = {
            ...taskData,
            id: crypto.randomUUID(),
            status: 'PENDING',
            attemptCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.tasks.set(task.id, task);
        this.queue.push(task);
        this.sortQueue();
        return task;
    }
    async dequeue(workerTypes) {
        // Simple filter and find first logic
        const index = this.queue.findIndex(t => workerTypes.includes(t.type) && t.status === 'PENDING');
        if (index === -1)
            return null;
        const task = this.queue[index];
        this.queue.splice(index, 1);
        task.status = 'RUNNING';
        task.updatedAt = new Date();
        this.tasks.set(task.id, task);
        return task;
    }
    async ack(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = 'COMPLETED';
            task.updatedAt = new Date();
        }
    }
    async nack(taskId, error) {
        const task = this.tasks.get(taskId);
        if (!task)
            return;
        task.attemptCount++;
        task.lastError = error;
        task.updatedAt = new Date();
        if (task.attemptCount >= task.maxAttempts) {
            task.status = 'FAILED';
        }
        else {
            task.status = 'PENDING';
            // Basic backoff simulation (not real delay here, just re-queue)
            this.queue.push(task);
            this.sortQueue();
        }
    }
    async get(taskId) {
        return this.tasks.get(taskId) || null;
    }
    sortQueue() {
        // Sort by Priority (Critical first) then Creation Time
        const priorityMap = {
            'CRITICAL': 0,
            'HIGH': 1,
            'NORMAL': 2,
            'LOW': 3
        };
        this.queue.sort((a, b) => {
            const pA = priorityMap[a.priority];
            const pB = priorityMap[b.priority];
            if (pA !== pB)
                return pA - pB;
            return a.createdAt.getTime() - b.createdAt.getTime();
        });
    }
}
exports.InMemoryTaskQueue = InMemoryTaskQueue;
