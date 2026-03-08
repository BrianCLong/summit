"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePlaybookRun = exports.PLAYBOOK_QUEUE_NAME = void 0;
const queue_factory_js_1 = require("../queue/queue.factory.js");
const types_js_1 = require("../queue/types.js");
const schema_js_1 = require("./schema.js");
exports.PLAYBOOK_QUEUE_NAME = types_js_1.QueueName.PLAYBOOK;
let playbookQueue = null;
const getPlaybookQueue = () => {
    if (!playbookQueue) {
        playbookQueue = queue_factory_js_1.QueueFactory.createQueue(exports.PLAYBOOK_QUEUE_NAME);
    }
    return playbookQueue;
};
const enqueuePlaybookRun = async (run, options = {}) => {
    const parsed = schema_js_1.PlaybookRunSchema.parse(run);
    const queue = getPlaybookQueue();
    const existing = await queue.getJob(parsed.runKey);
    if (existing) {
        return existing;
    }
    return queue.add('playbook-run', parsed, {
        jobId: parsed.runKey,
        ...options,
    });
};
exports.enqueuePlaybookRun = enqueuePlaybookRun;
