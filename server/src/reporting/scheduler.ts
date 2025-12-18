import cron, { ScheduledTask } from 'node-cron';
import { AccessContext, ScheduledReportJob } from './types';
import { ReportingService } from './service';
import { validateReportRequest } from './validation';

export class ReportScheduler {
  private readonly tasks = new Map<string, ScheduledTask>();

  constructor(private readonly reportingService: ReportingService) {}

  schedule(job: ScheduledReportJob, access: AccessContext) {
    if (!cron.validate(job.cron)) {
      throw new Error(`Invalid cron expression for job ${job.id}`);
    }
    validateReportRequest(job.request);

    if (this.tasks.has(job.id)) {
      this.tasks.get(job.id)?.stop();
      this.tasks.delete(job.id);
    }
    const task = cron.schedule(job.cron, () => {
      void this.reportingService.generate(job.request, access);
    }, { timezone: job.timezone });
    this.tasks.set(job.id, task);
  }

  cancel(jobId: string) {
    const task = this.tasks.get(jobId);
    if (task) {
      task.stop();
      this.tasks.delete(jobId);
    }
  }

  activeJobs(): string[] {
    return [...this.tasks.keys()];
  }
}
