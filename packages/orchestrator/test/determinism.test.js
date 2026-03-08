"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const graph_js_1 = require("../src/scheduler/graph.js");
(0, vitest_1.describe)('TaskGraph Determinism', () => {
    (0, vitest_1.it)('should auto-unblock tasks deterministically', () => {
        const graph = new graph_js_1.TaskGraph();
        const taskA = {
            id: 'A', subject: 'Root', status: 'pending', blockedBy: [], blocks: ['B'], timestamps: { created: '0' }
        };
        const taskB = {
            id: 'B', subject: 'Child', status: 'pending', blockedBy: ['A'], blocks: ['C'], timestamps: { created: '0' }
        };
        const taskC = {
            id: 'C', subject: 'Grandchild', status: 'pending', blockedBy: ['B'], blocks: [], timestamps: { created: '0' }
        };
        graph.addTask(taskA);
        graph.addTask(taskB);
        graph.addTask(taskC);
        // Initial state: Only A is ready
        let ready = graph.getReadyTasks();
        (0, vitest_1.expect)(ready.map(t => t.id)).toEqual(['A']);
        // Complete A
        graph.completeTask('A', '1');
        // Now B should be ready
        ready = graph.getReadyTasks();
        (0, vitest_1.expect)(ready.map(t => t.id)).toEqual(['B']);
        // Complete B
        graph.completeTask('B', '2');
        // Now C should be ready
        ready = graph.getReadyTasks();
        (0, vitest_1.expect)(ready.map(t => t.id)).toEqual(['C']);
    });
    (0, vitest_1.it)('should sort ready tasks by ID', () => {
        const graph = new graph_js_1.TaskGraph();
        graph.addTask({ id: 'Z', status: 'pending', blockedBy: [], blocks: [], timestamps: { created: '0' }, subject: '' });
        graph.addTask({ id: 'A', status: 'pending', blockedBy: [], blocks: [], timestamps: { created: '0' }, subject: '' });
        const ready = graph.getReadyTasks();
        (0, vitest_1.expect)(ready.map(t => t.id)).toEqual(['A', 'Z']);
    });
});
