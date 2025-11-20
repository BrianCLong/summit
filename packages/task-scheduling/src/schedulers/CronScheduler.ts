/**
 * Cron-based scheduler for workflow orchestration
 */

import cron from 'node-cron';
import cronParser from 'cron-parser';
import EventEmitter from 'eventemitter3';
import { DAG } from '@summit/dag-engine';

export interface ScheduleConfig {
  dagId: string;
  schedule: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  catchup?: boolean;
  maxActiveRuns?: number;
  params?: Record<string, any>;
}

export interface ScheduledExecution {
  dagId: string;
  scheduledTime: Date;
  executionDate: Date;
  params?: Record<string, any>;
}

interface SchedulerEvents {
  'schedule:trigger': (execution: ScheduledExecution) => void;
  'schedule:error': (dagId: string, error: Error) => void;
  'schedule:added': (dagId: string, schedule: string) => void;
  'schedule:removed': (dagId: string) => void;
}

export class CronScheduler extends EventEmitter<SchedulerEvents> {
  private schedules: Map<string, ScheduleConfig>;
  private tasks: Map<string, cron.ScheduledTask>;
  private activeRuns: Map<string, number>;

  constructor() {
    super();
    this.schedules = new Map();
    this.tasks = new Map();
    this.activeRuns = new Map();
  }

  /**
   * Add a schedule
   */
  addSchedule(config: ScheduleConfig): void {
    // Validate cron expression
    try {
      cronParser.parseExpression(config.schedule, {
        tz: config.timezone,
      });
    } catch (error) {
      throw new Error(`Invalid cron expression: ${config.schedule}`);
    }

    // Remove existing schedule if present
    if (this.schedules.has(config.dagId)) {
      this.removeSchedule(config.dagId);
    }

    this.schedules.set(config.dagId, config);
    this.activeRuns.set(config.dagId, 0);

    // Create cron task
    const task = cron.schedule(
      config.schedule,
      () => {
        this.triggerExecution(config);
      },
      {
        scheduled: false,
        timezone: config.timezone,
      }
    );

    this.tasks.set(config.dagId, task);
    task.start();

    this.emit('schedule:added', config.dagId, config.schedule);

    // Handle catchup
    if (config.catchup && config.startDate) {
      this.performCatchup(config);
    }
  }

  /**
   * Remove a schedule
   */
  removeSchedule(dagId: string): void {
    const task = this.tasks.get(dagId);
    if (task) {
      task.stop();
      this.tasks.delete(dagId);
    }

    this.schedules.delete(dagId);
    this.activeRuns.delete(dagId);
    this.emit('schedule:removed', dagId);
  }

  /**
   * Get schedule config
   */
  getSchedule(dagId: string): ScheduleConfig | undefined {
    return this.schedules.get(dagId);
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Pause a schedule
   */
  pauseSchedule(dagId: string): void {
    const task = this.tasks.get(dagId);
    if (task) {
      task.stop();
    }
  }

  /**
   * Resume a schedule
   */
  resumeSchedule(dagId: string): void {
    const task = this.tasks.get(dagId);
    if (task) {
      task.start();
    }
  }

  /**
   * Trigger execution
   */
  private triggerExecution(config: ScheduleConfig): void {
    try {
      const now = new Date();

      // Check if within date range
      if (config.startDate && now < config.startDate) {
        return;
      }
      if (config.endDate && now > config.endDate) {
        this.removeSchedule(config.dagId);
        return;
      }

      // Check max active runs
      const activeRuns = this.activeRuns.get(config.dagId) || 0;
      const maxActiveRuns = config.maxActiveRuns || 1;

      if (activeRuns >= maxActiveRuns) {
        console.warn(
          `DAG ${config.dagId} has ${activeRuns} active runs, skipping execution`
        );
        return;
      }

      // Create scheduled execution
      const execution: ScheduledExecution = {
        dagId: config.dagId,
        scheduledTime: now,
        executionDate: this.getExecutionDate(config.schedule, config.timezone),
        params: config.params,
      };

      this.activeRuns.set(config.dagId, activeRuns + 1);
      this.emit('schedule:trigger', execution);
    } catch (error) {
      this.emit('schedule:error', config.dagId, error as Error);
    }
  }

  /**
   * Get execution date based on schedule
   */
  private getExecutionDate(schedule: string, timezone?: string): Date {
    const interval = cronParser.parseExpression(schedule, {
      tz: timezone,
      currentDate: new Date(),
    });
    const prev = interval.prev();
    return prev.toDate();
  }

  /**
   * Perform catchup for missed runs
   */
  private async performCatchup(config: ScheduleConfig): Promise<void> {
    if (!config.startDate) return;

    const now = new Date();
    const interval = cronParser.parseExpression(config.schedule, {
      tz: config.timezone,
      currentDate: config.startDate,
      endDate: now,
    });

    const missedExecutions: Date[] = [];
    try {
      while (true) {
        const next = interval.next();
        const nextDate = next.toDate();
        if (nextDate > now) break;
        missedExecutions.push(nextDate);
      }
    } catch (error) {
      // End of iteration
    }

    // Trigger missed executions
    for (const executionDate of missedExecutions) {
      const execution: ScheduledExecution = {
        dagId: config.dagId,
        scheduledTime: now,
        executionDate,
        params: config.params,
      };
      this.emit('schedule:trigger', execution);
    }
  }

  /**
   * Get next run time
   */
  getNextRunTime(dagId: string): Date | null {
    const config = this.schedules.get(dagId);
    if (!config) return null;

    try {
      const interval = cronParser.parseExpression(config.schedule, {
        tz: config.timezone,
        currentDate: new Date(),
      });
      return interval.next().toDate();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get previous run time
   */
  getPreviousRunTime(dagId: string): Date | null {
    const config = this.schedules.get(dagId);
    if (!config) return null;

    try {
      const interval = cronParser.parseExpression(config.schedule, {
        tz: config.timezone,
        currentDate: new Date(),
      });
      return interval.prev().toDate();
    } catch (error) {
      return null;
    }
  }

  /**
   * Increment active runs counter
   */
  incrementActiveRuns(dagId: string): void {
    const current = this.activeRuns.get(dagId) || 0;
    this.activeRuns.set(dagId, current + 1);
  }

  /**
   * Decrement active runs counter
   */
  decrementActiveRuns(dagId: string): void {
    const current = this.activeRuns.get(dagId) || 0;
    this.activeRuns.set(dagId, Math.max(0, current - 1));
  }

  /**
   * Get active runs count
   */
  getActiveRunsCount(dagId: string): number {
    return this.activeRuns.get(dagId) || 0;
  }

  /**
   * Stop all schedules
   */
  stopAll(): void {
    this.tasks.forEach(task => task.stop());
    this.tasks.clear();
    this.schedules.clear();
    this.activeRuns.clear();
  }
}
