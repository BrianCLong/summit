"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const arkSpine_js_1 = require("../spine/arkSpine.js");
const taskGraph_js_1 = require("../spine/taskGraph.js");
(0, vitest_1.describe)('Agent spine sequencing', () => {
    (0, vitest_1.it)('orders tasks based on dependency graph', () => {
        const graph = new taskGraph_js_1.TaskGraph();
        graph.addTask({
            id: 'task-a',
            name: 'Task A',
            code: 'return "A";',
            sandboxId: 'sandbox-1',
        });
        graph.addTask({
            id: 'task-b',
            name: 'Task B',
            code: 'return "B";',
            sandboxId: 'sandbox-1',
        });
        graph.addTask({
            id: 'task-c',
            name: 'Task C',
            code: 'return "C";',
            sandboxId: 'sandbox-1',
        });
        graph.addDependency('task-a', 'task-b');
        graph.addDependency('task-b', 'task-c');
        const order = graph.getExecutionOrder().map(task => task.id);
        (0, vitest_1.expect)(order).toEqual(['task-a', 'task-b', 'task-c']);
        (0, vitest_1.expect)(graph.toArtifact().hash).toHaveLength(64);
    });
    (0, vitest_1.it)('runs task graph through sandbox boundary', async () => {
        const graph = new taskGraph_js_1.TaskGraph();
        graph.addTask({
            id: 'task-1',
            name: 'Task 1',
            code: 'return inputs.value;',
            sandboxId: 'sandbox-1',
            inputs: { value: 42 },
        });
        const sandboxBoundary = {
            async execute() {
                return {
                    executionId: 'exec-1',
                    status: 'success',
                    output: 42,
                    logs: [],
                };
            },
        };
        const spine = new arkSpine_js_1.ArkSpine(graph, sandboxBoundary);
        const result = await spine.run('run-1');
        (0, vitest_1.expect)(result.runId).toBe('run-1');
        (0, vitest_1.expect)(result.events.length).toBe(2);
        (0, vitest_1.expect)(result.taskResults['task-1'].status).toBe('success');
    });
});
