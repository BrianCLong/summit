"use strict";
/**
 * Pipeline scheduler - manages cron-based and event-based scheduling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
class PipelineScheduler {
    logger;
    schedules = new Map();
    cronJobs = new Map();
    intervalJobs = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Create new schedule
     */
    async createSchedule(scheduleConfig) {
        const schedule = {
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
    async listSchedules() {
        return Array.from(this.schedules.values());
    }
    /**
     * Get schedule by ID
     */
    async getSchedule(scheduleId) {
        return this.schedules.get(scheduleId);
    }
    /**
     * Update schedule
     */
    async updateSchedule(scheduleId, updates) {
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
    async deleteSchedule(scheduleId) {
        this.stopSchedule(scheduleId);
        this.schedules.delete(scheduleId);
        this.logger.info(`Deleted schedule ${scheduleId}`);
    }
    /**
     * Start all schedules
     */
    start() {
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
    stop() {
        for (const [scheduleId] of this.schedules) {
            this.stopSchedule(scheduleId);
        }
        this.logger.info('Pipeline scheduler stopped');
    }
    startSchedule(schedule) {
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
    stopSchedule(scheduleId) {
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
    startCronSchedule(schedule) {
        if (!schedule.cronExpression) {
            this.logger.error(`No cron expression for schedule ${schedule.id}`);
            return;
        }
        try {
            const task = node_cron_1.default.schedule(schedule.cronExpression, async () => {
                await this.executePipeline(schedule);
            }, {
                scheduled: true,
                timezone: schedule.timezone || 'UTC'
            });
            this.cronJobs.set(schedule.id, task);
            this.logger.info(`Started cron schedule ${schedule.id}: ${schedule.cronExpression}`);
        }
        catch (error) {
            this.logger.error(`Failed to start cron schedule ${schedule.id}`, { error });
        }
    }
    startIntervalSchedule(schedule) {
        if (!schedule.intervalSeconds) {
            this.logger.error(`No interval for schedule ${schedule.id}`);
            return;
        }
        const interval = setInterval(async () => {
            await this.executePipeline(schedule);
        }, schedule.intervalSeconds * 1000);
        this.intervalJobs.set(schedule.id, interval);
        this.logger.info(`Started interval schedule ${schedule.id}: every ${schedule.intervalSeconds}s`);
    }
    startEventSchedule(schedule) {
        // Event-based scheduling would integrate with message queues, webhooks, etc.
        this.logger.info(`Event schedule ${schedule.id} registered`);
    }
    async executePipeline(schedule) {
        this.logger.info(`Executing pipeline ${schedule.pipelineId} from schedule ${schedule.id}`);
        // Update last run time
        schedule.lastRun = new Date();
        this.schedules.set(schedule.id, schedule);
        // Trigger pipeline execution
        // In production, this would call the PipelineOrchestrator or queue a job
        try {
            // await orchestrator.executePipeline(schedule.pipelineId);
            this.logger.info(`Pipeline ${schedule.pipelineId} execution triggered`);
        }
        catch (error) {
            this.logger.error(`Failed to execute pipeline ${schedule.pipelineId}`, { error });
        }
    }
    generateScheduleId() {
        return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.PipelineScheduler = PipelineScheduler;
