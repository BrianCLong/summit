"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlaybookWorker = void 0;
const queue_factory_js_1 = require("../queue/queue.factory.js");
const types_js_1 = require("../queue/types.js");
const executor_js_1 = require("./executor.js");
const schema_js_1 = require("./schema.js");
const createPlaybookWorker = () => {
    const executor = new executor_js_1.PlaybookExecutor();
    return queue_factory_js_1.QueueFactory.createWorker(types_js_1.QueueName.PLAYBOOK, async (job) => {
        const run = schema_js_1.PlaybookRunSchema.parse(job.data);
        const results = await executor.execute(run.playbook);
        return {
            runKey: run.runKey,
            playbookId: run.playbook.id,
            results,
        };
    });
};
exports.createPlaybookWorker = createPlaybookWorker;
