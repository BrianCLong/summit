import { EventEmitter } from 'events';
import { RetentionSchedule } from './types.js';

type ScheduledHandler = () => Promise<void>;

interface ScheduledTask {
  schedule: RetentionSchedule;
  handler: ScheduledHandler;
}

export class RetentionScheduler extends EventEmitter {
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly tickIntervalMs: number;
  private timer?: NodeJS.Timeout;

  constructor(tickIntervalMs = 60000) {
    super();
    this.tickIntervalMs = tickIntervalMs;
  }

  register(schedule: RetentionSchedule, handler: ScheduledHandler): void {
    this.tasks.set(schedule.datasetId, { schedule, handler });
  }

  unregister(datasetId: string): void {
    this.tasks.delete(datasetId);
  }

  getSchedule(datasetId: string): RetentionSchedule | undefined {
    return this.tasks.get(datasetId)?.schedule;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.runDueTasks();
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runDueTasks(referenceTime: Date = new Date()): Promise<void> {
    for (const [datasetId, task] of this.tasks.entries()) {
      if (task.schedule.nextRun <= referenceTime) {
        try {
          await task.handler();
          task.schedule.lastRun = referenceTime;
          task.schedule.nextRun = new Date(referenceTime.getTime() + task.schedule.intervalMs);
          this.emit('taskCompleted', { datasetId, schedule: task.schedule });
        } catch (error) {
          this.emit('taskFailed', { datasetId, error });
        }
      }
    }
  }
}
