"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueue = void 0;
class TaskQueue {
    queue = [];
    concurrency;
    defaultMaxAttempts;
    activeExecutions = 0;
    constructor(options = {}) {
        this.concurrency = options.concurrency ?? 1;
        this.defaultMaxAttempts = options.defaultMaxAttempts ?? 3;
    }
    enqueue(task, handler, maxAttempts = this.defaultMaxAttempts) {
        this.queue.push({
            task,
            handler,
            maxAttempts,
            enqueuedAt: Date.now(),
        });
        this.queue.sort((a, b) => {
            if (b.task.priority === a.task.priority) {
                return a.enqueuedAt - b.enqueuedAt;
            }
            return b.task.priority - a.task.priority;
        });
    }
    async processNext() {
        if (this.activeExecutions >= this.concurrency) {
            return null;
        }
        const next = this.queue.shift();
        if (!next) {
            return null;
        }
        this.activeExecutions += 1;
        try {
            let attempt = 0;
            let lastError = null;
            while (attempt < next.maxAttempts) {
                attempt += 1;
                try {
                    const result = await next.handler({
                        task: {
                            ...next.task,
                            attempts: attempt,
                        },
                        attempt,
                    });
                    return {
                        taskId: next.task.id,
                        status: "success",
                        attempts: attempt,
                        result,
                    };
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                }
            }
            return {
                taskId: next.task.id,
                status: "retry_exhausted",
                attempts: next.maxAttempts,
                error: lastError?.message ?? "Unknown queue failure",
            };
        }
        finally {
            this.activeExecutions -= 1;
        }
    }
    async processAll() {
        const results = [];
        while (this.queue.length > 0) {
            const result = await this.processNext();
            if (result) {
                results.push(result);
            }
        }
        return results;
    }
    getSnapshot() {
        return this.queue.map((entry) => ({
            id: entry.task.id,
            priority: entry.task.priority,
            attempts: entry.task.attempts,
            enqueuedAt: entry.enqueuedAt,
        }));
    }
}
exports.TaskQueue = TaskQueue;
