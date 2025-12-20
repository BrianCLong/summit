import { EventEmitter } from 'events';
import { RetentionSchedule } from './types.js';

type ScheduledHandler = () => Promise<void>;

interface ScheduledTask {
  schedule: RetentionSchedule;
  handler: ScheduledHandler;
}

/**
 * Scheduler for periodic data retention tasks.
 * Manages execution of registered handlers based on scheduled intervals.
 */
export class RetentionScheduler extends EventEmitter {
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly tickIntervalMs: number;
  private timer?: NodeJS.Timeout;

  /**
   * Initializes the scheduler.
   * @param tickIntervalMs - The interval in ms to check for due tasks (default: 60000).
   */
  constructor(tickIntervalMs = 60000) {
    super();
    this.tickIntervalMs = tickIntervalMs;
  }

  /**
   * Registers a task with a schedule.
   *
   * @param schedule - The schedule configuration.
   * @param handler - The async function to execute.
   */
  register(schedule: RetentionSchedule, handler: ScheduledHandler): void {
    this.tasks.set(schedule.datasetId, { schedule, handler });
  }

  /**
   * Unregisters a task by dataset ID.
   *
   * @param datasetId - The ID of the dataset.
   */
  unregister(datasetId: string): void {
    this.tasks.delete(datasetId);
  }

  /**
   * Retrieves the current schedule for a dataset.
   *
   * @param datasetId - The ID of the dataset.
   * @returns The RetentionSchedule or undefined.
   */
  getSchedule(datasetId: string): RetentionSchedule | undefined {
    return this.tasks.get(datasetId)?.schedule;
  }

  /**
   * Starts the scheduler loop.
   */
  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runDueTasks();
    }, this.tickIntervalMs);
  }

  /**
   * Stops the scheduler loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Manually triggers processing of due tasks.
   *
   * @param referenceTime - The timestamp to compare schedules against (default: now).
   */
  async runDueTasks(referenceTime: Date = new Date()): Promise<void> {
    for (const [datasetId, task] of this.tasks.entries()) {
      if (task.schedule.nextRun <= referenceTime) {
        try {
          await task.handler();
          task.schedule.lastRun = referenceTime;
          task.schedule.nextRun = new Date(
            referenceTime.getTime() + task.schedule.intervalMs,
          );
          this.emit('taskCompleted', { datasetId, schedule: task.schedule });
        } catch (error) {
          this.emit('taskFailed', { datasetId, error });
        }
      }
    }
  }
}
