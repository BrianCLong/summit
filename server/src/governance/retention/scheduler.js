"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetentionScheduler = void 0;
const events_1 = require("events");
class RetentionScheduler extends events_1.EventEmitter {
    tasks = new Map();
    tickIntervalMs;
    timer;
    constructor(tickIntervalMs = 60000) {
        super();
        this.tickIntervalMs = tickIntervalMs;
    }
    register(schedule, handler) {
        this.tasks.set(schedule.datasetId, { schedule, handler });
    }
    unregister(datasetId) {
        this.tasks.delete(datasetId);
    }
    getSchedule(datasetId) {
        return this.tasks.get(datasetId)?.schedule;
    }
    start() {
        if (this.timer) {
            return;
        }
        this.timer = setInterval(() => {
            void this.runDueTasks();
        }, this.tickIntervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async runDueTasks(referenceTime = new Date()) {
        for (const [datasetId, task] of this.tasks.entries()) {
            if (task.schedule.nextRun <= referenceTime) {
                try {
                    await task.handler();
                    task.schedule.lastRun = referenceTime;
                    task.schedule.nextRun = new Date(referenceTime.getTime() + task.schedule.intervalMs);
                    this.emit('taskCompleted', { datasetId, schedule: task.schedule });
                }
                catch (error) {
                    this.emit('taskFailed', { datasetId, error });
                }
            }
        }
    }
}
exports.RetentionScheduler = RetentionScheduler;
