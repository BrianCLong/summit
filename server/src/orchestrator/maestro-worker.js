"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaestroWorker = void 0;
const worker_js_1 = require("./worker.js");
class MaestroWorker extends worker_js_1.OrchestratorWorker {
    handlers = new Map();
    constructor(store, options) {
        super(store, options);
    }
    registerHandler(kind, handler) {
        this.handlers.set(kind, handler);
    }
    async execute(task) {
        const handler = this.handlers.get(task.kind);
        if (!handler) {
            throw new Error(`No handler registered for task kind: ${task.kind}`);
        }
        return await handler(task);
    }
}
exports.MaestroWorker = MaestroWorker;
