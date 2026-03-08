"use strict";
/**
 * Scheduled Task Processors
 * Example cron-like scheduled jobs using BullMQ
 *
 * Issue: #11812 - Job Queue with Bull and Redis
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyCleanupProcessor = dailyCleanupProcessor;
exports.hourlyAnalyticsProcessor = hourlyAnalyticsProcessor;
exports.weeklyReportProcessor = weeklyReportProcessor;
exports.initializeScheduledTasks = initializeScheduledTasks;
const config_js_1 = require("../config.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const DAILY_CLEANUP_JOB = 'daily-cleanup';
const HOURLY_ANALYTICS_JOB = 'hourly-analytics';
const WEEKLY_REPORT_JOB = 'weekly-report';
/**
 * Daily cleanup job
 * Runs every day at 2 AM
 */
async function dailyCleanupProcessor(job) {
    logger_js_1.default.info('Running daily cleanup job', { jobId: job.id });
    try {
        // Example cleanup tasks
        await cleanupOldLogs();
        await cleanupTempFiles();
        await optimizeDatabase();
        logger_js_1.default.info('Daily cleanup completed', { jobId: job.id });
    }
    catch (error) {
        logger_js_1.default.error('Daily cleanup failed', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Hourly analytics job
 * Runs every hour
 */
async function hourlyAnalyticsProcessor(job) {
    logger_js_1.default.info('Running hourly analytics job', { jobId: job.id });
    try {
        await updateAnalytics();
        await generateReports();
        logger_js_1.default.info('Hourly analytics completed', { jobId: job.id });
    }
    catch (error) {
        logger_js_1.default.error('Hourly analytics failed', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
/**
 * Weekly report job
 * Runs every Monday at 9 AM
 */
async function weeklyReportProcessor(job) {
    logger_js_1.default.info('Running weekly report job', { jobId: job.id });
    try {
        await generateWeeklyReport();
        await sendReportEmails();
        logger_js_1.default.info('Weekly report completed', { jobId: job.id });
    }
    catch (error) {
        logger_js_1.default.error('Weekly report failed', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
// Placeholder functions (implement actual logic)
async function cleanupOldLogs() {
    logger_js_1.default.debug('Cleaning up old logs');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function cleanupTempFiles() {
    logger_js_1.default.debug('Cleaning up temp files');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function optimizeDatabase() {
    logger_js_1.default.debug('Optimizing database');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function updateAnalytics() {
    logger_js_1.default.debug('Updating analytics');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function generateReports() {
    logger_js_1.default.debug('Generating reports');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function generateWeeklyReport() {
    logger_js_1.default.debug('Generating weekly report');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
async function sendReportEmails() {
    logger_js_1.default.debug('Sending report emails');
    await new Promise((resolve) => setTimeout(resolve, 100));
}
/**
 * Initialize all scheduled tasks
 */
function initializeScheduledTasks() {
    const analyticsQueue = config_js_1.queueRegistry.getQueue(config_js_1.QueueName.ANALYTICS);
    // Register workers
    config_js_1.queueRegistry.registerWorker(config_js_1.QueueName.ANALYTICS, async (job) => {
        switch (job.name) {
            case DAILY_CLEANUP_JOB:
                return dailyCleanupProcessor(job);
            case HOURLY_ANALYTICS_JOB:
                return hourlyAnalyticsProcessor(job);
            case WEEKLY_REPORT_JOB:
                return weeklyReportProcessor(job);
            default:
                logger_js_1.default.warn('Received job with unknown name on analytics queue', {
                    jobId: job.id,
                    jobName: job.name,
                });
                return Promise.resolve();
        }
    });
    // Add repeatable jobs
    analyticsQueue.add(DAILY_CLEANUP_JOB, {}, {
        repeat: {
            pattern: '0 2 * * *', // Every day at 2 AM
        },
    });
    analyticsQueue.add(HOURLY_ANALYTICS_JOB, {}, {
        repeat: {
            pattern: '0 * * * *', // Every hour
        },
    });
    analyticsQueue.add(WEEKLY_REPORT_JOB, {}, {
        repeat: {
            pattern: '0 9 * * 1', // Every Monday at 9 AM
        },
    });
    logger_js_1.default.info('Scheduled tasks initialized');
}
