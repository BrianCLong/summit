"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const worker_1 = require("../../src/jobs/worker");
const job_store_1 = require("../../src/jobs/job_store");
console.log("Running worker.test.ts");
async function runTests() {
    {
        const store = new job_store_1.InMemoryJobStore();
        const worker = new worker_1.JobWorker(store, 50, 2);
        let executed = false;
        const handler = { run: async (job) => { executed = true; return "success"; } };
        worker.register("test", handler);
        worker.start();
        const job = await store.create("test", {});
        await new Promise(r => setTimeout(r, 200));
        worker.stop();
        const updated = await store.get(job.id);
        node_assert_1.default.strictEqual(updated?.status, "completed");
        node_assert_1.default.strictEqual(updated?.result, "success");
        node_assert_1.default.strictEqual(executed, true);
    }
}
runTests().catch(err => { console.error(err); process.exit(1); });
