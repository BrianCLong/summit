"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskGraph = void 0;
const crypto_1 = require("crypto");
class TaskGraph {
    tasks = new Map();
    dependencies = [];
    addTask(task) {
        if (this.tasks.has(task.id)) {
            throw new Error(`Task ${task.id} already exists`);
        }
        this.tasks.set(task.id, task);
    }
    addDependency(from, to) {
        if (!this.tasks.has(from) || !this.tasks.has(to)) {
            throw new Error('Dependencies must reference existing tasks');
        }
        this.dependencies.push({ from, to });
    }
    getExecutionOrder() {
        const incoming = new Map();
        const adjacency = new Map();
        for (const id of this.tasks.keys()) {
            incoming.set(id, 0);
            adjacency.set(id, []);
        }
        for (const edge of this.dependencies) {
            adjacency.get(edge.from)?.push(edge.to);
            incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
        }
        const queue = [];
        for (const [id, count] of incoming.entries()) {
            if (count === 0) {
                queue.push(id);
            }
        }
        const ordered = [];
        while (queue.length > 0) {
            const id = queue.shift();
            if (!id) {
                break;
            }
            const task = this.tasks.get(id);
            if (task) {
                ordered.push(task);
            }
            for (const neighbor of adjacency.get(id) ?? []) {
                const nextCount = (incoming.get(neighbor) ?? 0) - 1;
                incoming.set(neighbor, nextCount);
                if (nextCount === 0) {
                    queue.push(neighbor);
                }
            }
        }
        if (ordered.length !== this.tasks.size) {
            throw new Error('Task graph contains a cycle');
        }
        return ordered;
    }
    toArtifact() {
        const nodes = Array.from(this.tasks.values()).sort((a, b) => a.id.localeCompare(b.id));
        const edges = [...this.dependencies].sort((a, b) => {
            if (a.from === b.from) {
                return a.to.localeCompare(b.to);
            }
            return a.from.localeCompare(b.from);
        });
        const payload = JSON.stringify({ nodes, edges });
        const hash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
        return {
            schemaVersion: 'v1',
            createdAt: new Date().toISOString(),
            nodes,
            edges,
            hash,
        };
    }
}
exports.TaskGraph = TaskGraph;
