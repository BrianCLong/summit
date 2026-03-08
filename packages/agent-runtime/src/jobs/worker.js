"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobWorker = void 0;
class JobWorker {
    store;
    pollIntervalMs;
    concurrency;
    handlers = new Map();
    running = false;
    intervalId;
    constructor(store, pollIntervalMs = 1000, concurrency = 5) {
        this.store = store;
        this.pollIntervalMs = pollIntervalMs;
        this.concurrency = concurrency;
    }
    register(type, handler) { this.handlers.set(type, handler); }
    start() { if (this.running)
        return; this.running = true; this.loop(); }
    stop() { this.running = false; if (this.intervalId)
        clearTimeout(this.intervalId); }
    async loop() {
        if (!this.running)
            return;
        try {
            await this.processNextBatch();
        }
        catch (err) {
            console.error("Job worker error:", err);
        }
        finally {
            if (this.running)
                this.intervalId = setTimeout(() => this.loop(), this.pollIntervalMs);
        }
    }
    async processNextBatch() {
        const pending = await this.store.list("pending");
        const active = await this.store.list("running");
        if (active.length >= this.concurrency)
            return;
        const availableSlots = this.concurrency - active.length;
        const toRun = pending.slice(0, availableSlots);
        for (const job of toRun) {
            this.runJob(job).catch(err => console.error(`Error running job ${job.id}:`, err));
        }
    }
    async runJob(job) {
        const handler = this.handlers.get(job.type);
        if (!handler) {
            await this.store.update(job.id, { status: "failed", error: `No handler for ${job.type}` });
            return;
        }
        try {
            await this.store.update(job.id, { status: "running" });
            const result = await handler.run(job);
            await this.store.update(job.id, { status: "completed", result });
        }
        catch (err) {
            await this.store.update(job.id, { status: "failed", error: err.message });
        }
    }
}
exports.JobWorker = JobWorker;
