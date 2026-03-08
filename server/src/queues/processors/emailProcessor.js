"use strict";
/**
 * Email Queue Processor
 * Example job processor with retry logic and error handling
 *
 * Issue: #11812 - Job Queue with Bull and Redis
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processEmail = processEmail;
exports.initializeEmailQueue = initializeEmailQueue;
exports.sendEmailJob = sendEmailJob;
const config_js_1 = require("../config.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
/**
 * Email processor function
 */
async function processEmail(job) {
    const { data } = job;
    logger_js_1.default.info(`Processing email job ${job.id}`, {
        jobId: job.id,
        to: data.to,
        subject: data.subject,
    });
    try {
        // Simulate email sending (replace with actual email service)
        await sendEmail(data);
        // Update job progress
        await job.updateProgress(100);
        logger_js_1.default.info(`Email sent successfully: ${job.id}`, {
            jobId: job.id,
            to: data.to,
        });
    }
    catch (error) {
        logger_js_1.default.error(`Failed to send email: ${job.id}`, {
            jobId: job.id,
            to: data.to,
            error: error instanceof Error ? error.message : String(error),
            attempt: job.attemptsMade,
        });
        // Rethrow error to trigger retry
        throw error;
    }
}
/**
 * Simulate email sending
 * Replace this with actual email service integration (SendGrid, AWS SES, etc.)
 */
async function sendEmail(data) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Simulate occasional failures for demonstration
    if (Math.random() < 0.1) {
        throw new Error('Simulated email service error');
    }
    logger_js_1.default.debug('Email sent via mock service', { to: data.to });
}
/**
 * Initialize email queue and worker
 */
function initializeEmailQueue() {
    // Create queue
    const queue = config_js_1.queueRegistry.getQueue(config_js_1.QueueName.EMAIL);
    // Register worker
    config_js_1.queueRegistry.registerWorker(config_js_1.QueueName.EMAIL, processEmail, {
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000,
        },
    });
    logger_js_1.default.info('Email queue initialized');
}
/**
 * Helper to add email job
 */
async function sendEmailJob(data) {
    const queue = config_js_1.queueRegistry.getQueue(config_js_1.QueueName.EMAIL);
    await queue.add('send-email', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    });
    logger_js_1.default.info('Email job added', { to: data.to, subject: data.subject });
}
