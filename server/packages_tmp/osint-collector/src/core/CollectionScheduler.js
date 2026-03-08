"use strict";
/**
 * Collection Scheduler - Manages automated collection scheduling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionScheduler = void 0;
const events_1 = require("events");
const cron_1 = require("cron");
class CollectionScheduler extends events_1.EventEmitter {
    schedules = new Map();
    configs = new Map();
    /**
     * Add a scheduled collection task
     */
    addSchedule(config) {
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
    removeSchedule(scheduleId) {
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
    enableSchedule(scheduleId) {
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
    disableSchedule(scheduleId) {
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
    getSchedules() {
        return Array.from(this.configs.values());
    }
    /**
     * Shutdown the scheduler
     */
    shutdown() {
        for (const job of this.schedules.values()) {
            job.stop();
        }
        this.schedules.clear();
    }
    startSchedule(config) {
        const job = new cron_1.CronJob(config.cronExpression, () => this.executeScheduledTask(config), null, true, 'UTC');
        this.schedules.set(config.id, job);
        this.emit('schedule:started', { scheduleId: config.id, name: config.name });
    }
    executeScheduledTask(config) {
        const task = {
            id: `${config.id}-${Date.now()}`,
            type: config.type,
            source: config.source,
            target: config.target,
            priority: config.priority,
            scheduledAt: new Date(),
            status: 'pending',
            config: config.config
        };
        this.emit('task:scheduled', task);
    }
}
exports.CollectionScheduler = CollectionScheduler;
