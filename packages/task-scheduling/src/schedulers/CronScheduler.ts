/**
 * Cron-based scheduler for workflow orchestration
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import {
  parseCronExpression,
  getNextCronDate,
  getPrevCronDate,
  isValidCronExpression,
  ParsedCron,
} from '../utils/cron.js';

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

interface ScheduledTask {
  cron: ParsedCron;
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
}

export class CronScheduler extends EventEmitter<SchedulerEvents> {
  private schedules: Map<string, ScheduleConfig>;
  private tasks: Map<string, ScheduledTask>;
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
    if (!isValidCronExpression(config.schedule)) {
      throw new Error(`Invalid cron expression: ${config.schedule}`);
    }

    // Remove existing schedule if present
    if (this.schedules.has(config.dagId)) {
      this.removeSchedule(config.dagId);
    }

    this.schedules.set(config.dagId, config);
    this.activeRuns.set(config.dagId, 0);

    // Create and start scheduled task
    const cron = parseCronExpression(config.schedule);
    const task: ScheduledTask = {
      cron,
      timer: null,
      running: true,
    };

    this.tasks.set(config.dagId, task);
    this.scheduleNextRun(config.dagId);

    this.emit('schedule:added', config.dagId, config.schedule);

    // Handle catchup
    if (config.catchup && config.startDate) {
      this.performCatchup(config);
    }
  }

  /**
   * Schedule the next run
   */
  private scheduleNextRun(dagId: string): void {
    const task = this.tasks.get(dagId);
    const config = this.schedules.get(dagId);

    if (!task || !config || !task.running) return;

    const now = new Date();
    const nextRun = getNextCronDate(task.cron, now);
    const delay = nextRun.getTime() - now.getTime();

    task.timer = setTimeout(() => {
      this.triggerExecution(config);
      this.scheduleNextRun(dagId);
    }, delay);
  }

  /**
   * Remove a schedule
   */
  removeSchedule(dagId: string): void {
    const task = this.tasks.get(dagId);
    if (task) {
      if (task.timer) clearTimeout(task.timer);
      task.running = false;
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
      if (task.timer) clearTimeout(task.timer);
      task.timer = null;
      task.running = false;
    }
  }

  /**
   * Resume a schedule
   */
  resumeSchedule(dagId: string): void {
    const task = this.tasks.get(dagId);
    if (task) {
      task.running = true;
      this.scheduleNextRun(dagId);
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
      const task = this.tasks.get(config.dagId);
      const execution: ScheduledExecution = {
        dagId: config.dagId,
        scheduledTime: now,
        executionDate: task ? getPrevCronDate(task.cron, now) : now,
        params: config.params,
      };

      this.activeRuns.set(config.dagId, activeRuns + 1);
      this.emit('schedule:trigger', execution);
    } catch (error) {
      this.emit('schedule:error', config.dagId, error as Error);
    }
  }

  /**
   * Perform catchup for missed runs
   */
  private performCatchup(config: ScheduleConfig): void {
    if (!config.startDate) return;

    const now = new Date();
    const task = this.tasks.get(config.dagId);
    if (!task) return;

    const missedExecutions: Date[] = [];
    let current = new Date(config.startDate);

    try {
      while (current < now) {
        const next = getNextCronDate(task.cron, current);
        if (next >= now) break;
        missedExecutions.push(next);
        current = new Date(next.getTime() + 60000); // Move forward 1 minute
      }
    } catch {
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
    const task = this.tasks.get(dagId);
    if (!task) return null;

    try {
      return getNextCronDate(task.cron, new Date());
    } catch {
      return null;
    }
  }

  /**
   * Get previous run time
   */
  getPreviousRunTime(dagId: string): Date | null {
    const task = this.tasks.get(dagId);
    if (!task) return null;

    try {
      return getPrevCronDate(task.cron, new Date());
    } catch {
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
    this.tasks.forEach(task => {
      if (task.timer) clearTimeout(task.timer);
      task.running = false;
    });
    this.tasks.clear();
    this.schedules.clear();
    this.activeRuns.clear();
  }
}
