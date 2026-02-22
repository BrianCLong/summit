import assert from "node:assert";
import { JobWorker } from "../../src/jobs/worker";
import { InMemoryJobStore } from "../../src/jobs/job_store";
import { JobHandler, Job } from "../../src/jobs/types";

console.log("Running worker.test.ts");

async function runTests() {
  {
    const store = new InMemoryJobStore();
    const worker = new JobWorker(store, 50, 2);
    let executed = false;
    const handler: JobHandler = { run: async (job: Job) => { executed = true; return "success"; } };
    worker.register("test", handler);
    worker.start();
    const job = await store.create("test", {});
    await new Promise(r => setTimeout(r, 200));
    worker.stop();
    const updated = await store.get(job.id);
    assert.strictEqual(updated?.status, "completed");
    assert.strictEqual(updated?.result, "success");
    assert.strictEqual(executed, true);
  }
}
runTests().catch(err => { console.error(err); process.exit(1); });
