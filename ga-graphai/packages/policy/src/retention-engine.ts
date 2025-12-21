import { createHmac, randomUUID } from 'node:crypto';

export interface RetentionPolicy {
  id: string;
  subjectType: string;
  retentionDays: number;
  verify?: (subjectId: string) => Promise<boolean> | boolean;
}

export interface DeletionJob {
  id: string;
  policyId: string;
  subjectId: string;
  dueAt: Date;
  handler: () => Promise<void> | void;
}

export interface DeletionRun {
  runId: string;
  executed: string[];
  failed: string[];
  attestations: string[];
  startedAt: Date;
  completedAt: Date;
}

export class RetentionDeletionEngine {
  private readonly secret: string;
  private jobs: DeletionJob[] = [];
  private policies: Map<string, RetentionPolicy> = new Map();

  constructor(secret: string) {
    this.secret = secret;
  }

  registerPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.id, policy);
  }

  scheduleDeletion(policyId: string, subjectId: string, deletionDate: Date, handler: () => Promise<void> | void): DeletionJob {
    if (!this.policies.has(policyId)) {
      throw new Error(`Unknown retention policy ${policyId}`);
    }
    const job: DeletionJob = {
      id: randomUUID(),
      policyId,
      subjectId,
      dueAt: deletionDate,
      handler,
    };
    this.jobs.push(job);
    return job;
  }

  async executeDue(now = new Date()): Promise<DeletionRun> {
    const dueJobs = this.jobs.filter((job) => job.dueAt.getTime() <= now.getTime());
    const executed: string[] = [];
    const failed: string[] = [];
    const attestations: string[] = [];
    const startedAt = new Date();

    for (const job of dueJobs) {
      try {
        await job.handler();
        executed.push(job.id);
        attestations.push(this.signAttestation(job));
      } catch (error) {
        failed.push(job.id);
        console.error(`Deletion job ${job.id} failed`, error);
      }
    }

    this.jobs = this.jobs.filter((job) => job.dueAt.getTime() > now.getTime());

    return {
      runId: randomUUID(),
      executed,
      failed,
      attestations,
      startedAt,
      completedAt: new Date(),
    };
  }

  private signAttestation(job: DeletionJob): string {
    const payload = `${job.id}:${job.policyId}:${job.subjectId}:${job.dueAt.toISOString()}`;
    return createHmac('sha256', this.secret).update(payload).digest('hex');
  }

  verifyAttestation(job: DeletionJob, attestation: string): boolean {
    return this.signAttestation(job) === attestation;
  }
}
