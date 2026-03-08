"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryQueue = void 0;
class InMemoryQueue {
    queue = [];
    enqueue(job) {
        const normalizedJob = {
            ...job,
            attempts: job.attempts ?? 0,
            enqueuedAt: job.enqueuedAt ?? Date.now(),
            firstEnqueuedAt: job.firstEnqueuedAt ?? Date.now(),
        };
        this.queue.push(normalizedJob);
    }
    dequeue() {
        return this.queue.shift();
    }
    size() {
        return this.queue.length;
    }
    drain() {
        const drained = [...this.queue];
        this.queue = [];
        return drained;
    }
}
exports.InMemoryQueue = InMemoryQueue;
