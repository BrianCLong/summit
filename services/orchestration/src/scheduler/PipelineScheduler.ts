/**
 * Pipeline scheduler - manages cron-based and event-based scheduling
 */

import cron from 'node-cron';
import { Logger } from 'winston';

export interface Schedule {
  id: string;
  pipelineId: string;
  type: 'cron' | 'interval' | 'event';
  cronExpression?: string;
  intervalSeconds?: number;
  enabled: boolean;
  timezone?: string;
  lastRun?: Date;
  nextRun?: Date;
}

export class PipelineScheduler {
  private logger: Logger;
  private schedules: Map<string, Schedule> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private intervalJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Create new schedule
   */
  async createSchedule(scheduleConfig: Omit<Schedule, 'id'>): Promise<Schedule> {
    const schedule: Schedule = {
      id: this.generateScheduleId(),
      ...scheduleConfig
    };

    this.schedules.set(schedule.id, schedule);

    if (schedule.enabled) {
      this.startSchedule(schedule);
    }

    this.logger.info(`Created schedule ${schedule.id} for pipeline ${schedule.pipelineId}`);

    return schedule;
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<Schedule | undefined> {
    return this.schedules.get(scheduleId);
  }

  /**
   * Update schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(scheduleId);

    if (!schedule) {
      return undefined;
    }

    // Stop existing schedule
    this.stopSchedule(scheduleId);

    // Update schedule
    const updatedSchedule = { ...schedule, ...updates };
    this.schedules.set(scheduleId, updatedSchedule);

    // Restart if enabled
    if (updatedSchedule.enabled) {
      this.startSchedule(updatedSchedule);
    }

    return updatedSchedule;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    this.stopSchedule(scheduleId);
    this.schedules.delete(scheduleId);
    this.logger.info(`Deleted schedule ${scheduleId}`);
  }

  /**
   * Start all schedules
   */
  start(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.startSchedule(schedule);
      }
    }
    this.logger.info('Pipeline scheduler started');
  }

  /**
   * Stop all schedules
   */
  stop(): void {
    for (const [scheduleId] of this.schedules) {
      this.stopSchedule(scheduleId);
    }
    this.logger.info('Pipeline scheduler stopped');
  }

  private startSchedule(schedule: Schedule): void {
    switch (schedule.type) {
      case 'cron':
        this.startCronSchedule(schedule);
        break;
      case 'interval':
        this.startIntervalSchedule(schedule);
        break;
      case 'event':
        this.startEventSchedule(schedule);
        break;
    }
  }

  private stopSchedule(scheduleId: string): void {
    // Stop cron job
    const cronJob = this.cronJobs.get(scheduleId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(scheduleId);
    }

    // Stop interval job
    const intervalJob = this.intervalJobs.get(scheduleId);
    if (intervalJob) {
      clearInterval(intervalJob);
      this.intervalJobs.delete(scheduleId);
    }
  }

  private startCronSchedule(schedule: Schedule): void {
    if (!schedule.cronExpression) {
      this.logger.error(`No cron expression for schedule ${schedule.id}`);
      return;
    }

    try {
      const task = cron.schedule(
        schedule.cronExpression,
        async () => {
          await this.executePipeline(schedule);
        },
        {
          scheduled: true,
          timezone: schedule.timezone || 'UTC'
        }
      );

      this.cronJobs.set(schedule.id, task);
      this.logger.info(`Started cron schedule ${schedule.id}: ${schedule.cronExpression}`);
    } catch (error) {
      this.logger.error(`Failed to start cron schedule ${schedule.id}`, { error });
    }
  }

  private startIntervalSchedule(schedule: Schedule): void {
    if (!schedule.intervalSeconds) {
      this.logger.error(`No interval for schedule ${schedule.id}`);
      return;
    }

    const interval = setInterval(
      async () => {
        await this.executePipeline(schedule);
      },
      schedule.intervalSeconds * 1000
    );

    this.intervalJobs.set(schedule.id, interval);
    this.logger.info(`Started interval schedule ${schedule.id}: every ${schedule.intervalSeconds}s`);
  }

  private startEventSchedule(schedule: Schedule): void {
    // Event-based scheduling would integrate with message queues, webhooks, etc.
    this.logger.info(`Event schedule ${schedule.id} registered`);
  }

  private async executePipeline(schedule: Schedule): Promise<void> {
    this.logger.info(`Executing pipeline ${schedule.pipelineId} from schedule ${schedule.id}`);

    // Update last run time
    schedule.lastRun = new Date();
    this.schedules.set(schedule.id, schedule);

    // Trigger pipeline execution
    // In production, this would call the PipelineOrchestrator or queue a job
    try {
      // await orchestrator.executePipeline(schedule.pipelineId);
      this.logger.info(`Pipeline ${schedule.pipelineId} execution triggered`);
    } catch (error) {
      this.logger.error(`Failed to execute pipeline ${schedule.pipelineId}`, { error });
    }
  }

  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
