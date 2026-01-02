import { CronJob } from 'cron';
import { pipelinesRepo } from '../pipelines/pipelines-repo.js';
import { runsRepo } from '../runs/runs-repo.js';
import { scheduler } from './Scheduler.js';
import { logger } from '../../config/logger.js';
import { MaestroEvents } from '../../realtime/maestro.js';

export interface PipelineScheduleConfig {
  enabled: boolean;
  cron?: string;
  timezone?: string;
}

export interface PipelineScheduleStatus {
  nextRunAt?: string | null;
}

class PipelineScheduleService {
  private jobs = new Map<string, CronJob>();

  stopSchedule(pipelineId: string) {
    const job = this.jobs.get(pipelineId);
    if (job) {
      job.stop();
      this.jobs.delete(pipelineId);
    }
  }

  async applySchedule(
    pipelineId: string,
    tenantId: string,
    schedule: PipelineScheduleConfig,
  ): Promise<PipelineScheduleStatus> {
    this.stopSchedule(pipelineId);

    if (!schedule.enabled || !schedule.cron) {
      return { nextRunAt: null };
    }

    const pipeline = await pipelinesRepo.get(pipelineId, tenantId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    let job: CronJob;
    try {
      job = new CronJob(
        schedule.cron,
        async () => {
          try {
            const run = await runsRepo.create({
              pipeline_id: pipeline.id,
              pipeline_name: pipeline.name,
              tenant_id: tenantId,
              input_params: {},
            });

            await scheduler.enqueueRun(run.id, tenantId);

            const { getIO } = await import('../../realtime/socket.js');
            const io = typeof getIO === 'function' ? getIO() : null;
            if (io) {
              MaestroEvents.emitStatusChange(io, tenantId, run.id, 'queued');
            }
          } catch (error: any) {
            logger.error(
              { error, pipelineId, tenantId },
              'Failed to enqueue scheduled pipeline run',
            );
          }
        },
        null,
        true,
        schedule.timezone || 'UTC',
      );
    } catch (error: any) {
      throw new Error('Invalid cron expression');
    }

    this.jobs.set(pipelineId, job);

    const next = job.nextDate();
    return { nextRunAt: next ? next.toISO() : null };
  }
}

export const pipelineScheduleService = new PipelineScheduleService();
