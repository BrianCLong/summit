"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const QueueHelper_js_1 = require("../QueueHelper.js");
(0, globals_1.describe)('QueueHelper', () => {
    let queue;
    (0, globals_1.beforeEach)(() => {
        queue = new QueueHelper_js_1.QueueHelper();
    });
    (0, globals_1.it)('should enqueue items and sort by priority', () => {
        queue.enqueue({ id: 'low', priority: 1 });
        queue.enqueue({ id: 'high', priority: 10 });
        queue.enqueue({ id: 'medium', priority: 5 });
        (0, globals_1.expect)(queue.size).toBe(3);
        (0, globals_1.expect)(queue.peek()?.id).toBe('high');
        (0, globals_1.expect)(queue.dequeue()?.id).toBe('high');
        (0, globals_1.expect)(queue.dequeue()?.id).toBe('medium');
        (0, globals_1.expect)(queue.dequeue()?.id).toBe('low');
    });
    (0, globals_1.it)('should handle empty queue', () => {
        (0, globals_1.expect)(queue.isEmpty()).toBe(true);
        (0, globals_1.expect)(queue.dequeue()).toBeUndefined();
        (0, globals_1.expect)(queue.peek()).toBeUndefined();
    });
    (0, globals_1.it)('should remove items based on predicate', () => {
        queue.enqueue({ id: '1', priority: 1 });
        queue.enqueue({ id: '2', priority: 1 });
        queue.enqueue({ id: '3', priority: 1 });
        queue.remove(item => item.id === '2');
        (0, globals_1.expect)(queue.size).toBe(2);
        (0, globals_1.expect)(queue.getAll().find(i => i.id === '2')).toBeUndefined();
    });
});
