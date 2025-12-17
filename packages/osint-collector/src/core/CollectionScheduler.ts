/**
 * Collection Scheduler - Manages automated collection scheduling
 */

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import type { CollectionTask, CollectionType } from '../types/index.js';

export interface ScheduleConfig {
  id: string;
  name: string;
  cronExpression: string;
  type: CollectionType;
  source: string;
  target: string;
  priority: number;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export class CollectionScheduler extends EventEmitter {
  private schedules: Map<string, CronJob> = new Map();
  private configs: Map<string, ScheduleConfig> = new Map();

  /**
   * Add a scheduled collection task
   */
  addSchedule(config: ScheduleConfig): void {
    if (this.schedules.has(config.id)) {
      throw new Error(`Schedule with id ${config.id} already exists`);
    }

    this.configs.set(config.id, config);

    if (config.enabled) {
      this.startSchedule(config);
    }
  }

  /**
   * Remove a scheduled task
   */
  removeSchedule(scheduleId: string): void {
    const job = this.schedules.get(scheduleId);
    if (job) {
      job.stop();
      this.schedules.delete(scheduleId);
    }
    this.configs.delete(scheduleId);
  }

  /**
   * Enable a schedule
   */
  enableSchedule(scheduleId: string): void {
    const config = this.configs.get(scheduleId);
    if (!config) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    config.enabled = true;
    this.startSchedule(config);
  }

  /**
   * Disable a schedule
   */
  disableSchedule(scheduleId: string): void {
    const config = this.configs.get(scheduleId);
    if (config) {
      config.enabled = false;
    }

    const job = this.schedules.get(scheduleId);
    if (job) {
      job.stop();
      this.schedules.delete(scheduleId);
    }
  }

  /**
   * Get all schedules
   */
  getSchedules(): ScheduleConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Shutdown the scheduler
   */
  shutdown(): void {
    for (const job of this.schedules.values()) {
      job.stop();
    }
    this.schedules.clear();
  }

  private startSchedule(config: ScheduleConfig): void {
    const job = new CronJob(
      config.cronExpression,
      () => this.executeScheduledTask(config),
      null,
      true,
      'UTC'
    );

    this.schedules.set(config.id, job);
    this.emit('schedule:started', { scheduleId: config.id, name: config.name });
  }

  private executeScheduledTask(config: ScheduleConfig): void {
    const task: CollectionTask = {
      id: `${config.id}-${Date.now()}`,
      type: config.type,
      source: config.source,
      target: config.target,
      priority: config.priority,
      scheduledAt: new Date(),
      status: 'pending' as any,
      config: config.config
    };

    this.emit('task:scheduled', task);
  }
}
