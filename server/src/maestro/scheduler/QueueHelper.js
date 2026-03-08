"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueHelper = void 0;
class QueueHelper {
    queue = [];
    constructor(initialItems = []) {
        this.queue = [...initialItems];
        this.sort();
    }
    enqueue(item) {
        this.queue.push(item);
        this.sort();
    }
    dequeue() {
        return this.queue.shift();
    }
    peek() {
        return this.queue[0];
    }
    get size() {
        return this.queue.length;
    }
    isEmpty() {
        return this.queue.length === 0;
    }
    clear() {
        this.queue = [];
    }
    getAll() {
        return [...this.queue];
    }
    remove(predicate) {
        this.queue = this.queue.filter(item => !predicate(item));
    }
    sort() {
        // Higher priority first
        this.queue.sort((a, b) => b.priority - a.priority);
    }
}
exports.QueueHelper = QueueHelper;
