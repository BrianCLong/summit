import { Job, JobStore } from "./types";
import { randomUUID } from "crypto";

export class InMemoryJobStore implements JobStore {
  private jobs = new Map<string, Job>();
  async create(type: string, data: any): Promise<Job> {
    const id = randomUUID();
    const job: Job = { id, type, data, status: "pending", createdAt: Date.now(), updatedAt: Date.now() };
    this.jobs.set(id, job);
    return job;
  }
  async get(id: string): Promise<Job | null> { return this.jobs.get(id) || null; }
  async update(id: string, update: Partial<Job>): Promise<Job> {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    const updated = { ...job, ...update, updatedAt: Date.now() };
    this.jobs.set(id, updated);
    return updated;
  }
  async list(status?: Job["status"]): Promise<Job[]> {
    const jobs = Array.from(this.jobs.values());
    if (status) return jobs.filter((j) => j.status === status);
    return jobs;
  }
}
