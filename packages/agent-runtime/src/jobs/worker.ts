import { Job, JobHandler, JobStore } from "./types";

export class JobWorker {
  private handlers = new Map<string, JobHandler>();
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private store: JobStore, private pollIntervalMs: number = 1000, private concurrency: number = 5) {}

  register(type: string, handler: JobHandler) { this.handlers.set(type, handler); }
  start() { if (this.running) return; this.running = true; this.loop(); }
  stop() { this.running = false; if (this.intervalId) clearTimeout(this.intervalId); }

  private async loop() {
    if (!this.running) return;
    try { await this.processNextBatch(); } catch (err) { console.error("Job worker error:", err); }
    finally { if (this.running) this.intervalId = setTimeout(() => this.loop(), this.pollIntervalMs); }
  }

  private async processNextBatch() {
    const pending = await this.store.list("pending");
    const active = await this.store.list("running");
    if (active.length >= this.concurrency) return;
    const availableSlots = this.concurrency - active.length;
    const toRun = pending.slice(0, availableSlots);
    for (const job of toRun) { this.runJob(job).catch(err => console.error(`Error running job ${job.id}:`, err)); }
  }

  private async runJob(job: Job) {
    const handler = this.handlers.get(job.type);
    if (!handler) { await this.store.update(job.id, { status: "failed", error: `No handler for ${job.type}` }); return; }
    try {
      await this.store.update(job.id, { status: "running" });
      const result = await handler.run(job);
      await this.store.update(job.id, { status: "completed", result });
    } catch (err: any) { await this.store.update(job.id, { status: "failed", error: err.message }); }
  }
}
