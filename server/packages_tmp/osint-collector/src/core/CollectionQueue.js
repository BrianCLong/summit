"use strict";
/**
 * Collection Queue - Priority queue for managing collection tasks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionQueue = void 0;
const events_1 = require("events");
class CollectionQueue extends events_1.EventEmitter {
    queue = [];
    processing = new Map();
    maxConcurrent;
    currentWorkers = 0;
    constructor(maxConcurrent = 5) {
        super();
        this.maxConcurrent = maxConcurrent;
    }
    /**
     * Add a task to the queue
     */
    enqueue(task) {
        task.status = 'pending';
        this.queue.push(task);
        this.sortQueue();
        this.emit('task:enqueued', task);
        this.processNext();
    }
    /**
     * Add multiple tasks to the queue
     */
    enqueueBatch(tasks) {
        for (const task of tasks) {
            task.status = 'pending';
            this.queue.push(task);
        }
        this.sortQueue();
        this.emit('batch:enqueued', { count: tasks.length });
        this.processNext();
    }
    /**
     * Get next task from queue
     */
    dequeue() {
        return this.queue.shift();
    }
    /**
     * Process next task if workers available
     */
    processNext() {
        if (this.currentWorkers >= this.maxConcurrent) {
            return;
        }
        const task = this.dequeue();
        if (!task) {
            return;
        }
        this.currentWorkers++;
        task.status = 'in_progress';
        this.processing.set(task.id, task);
        this.emit('task:processing', task);
    }
    /**
     * Mark task as completed
     */
    completeTask(taskId) {
        const task = this.processing.get(taskId);
        if (task) {
            task.status = 'completed';
            this.processing.delete(taskId);
            this.currentWorkers--;
            this.emit('task:completed', task);
            this.processNext();
        }
    }
    /**
     * Mark task as failed
     */
    failTask(taskId, error) {
        const task = this.processing.get(taskId);
        if (task) {
            task.status = 'failed';
            this.processing.delete(taskId);
            this.currentWorkers--;
            this.emit('task:failed', { task, error: error.message });
            this.processNext();
        }
    }
    /**
     * Get queue statistics
     */
    getStats() {
        return {
            pending: this.queue.length,
            processing: this.processing.size,
            workers: this.currentWorkers,
            maxConcurrent: this.maxConcurrent
        };
    }
    /**
     * Clear all tasks
     */
    clear() {
        this.queue = [];
        this.emit('queue:cleared');
    }
    /**
     * Sort queue by priority (highest first)
     */
    sortQueue() {
        this.queue.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Set max concurrent workers
     */
    setMaxConcurrent(max) {
        this.maxConcurrent = max;
        this.processNext();
    }
}
exports.CollectionQueue = CollectionQueue;
