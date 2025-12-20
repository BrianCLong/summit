/**
 * Email Queue Processor
 * Example job processor with retry logic and error handling
 *
 * Issue: #11812 - Job Queue with Bull and Redis
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { Job } from 'bullmq';
import { queueRegistry, QueueName } from '../config.js';
import logger from '../../utils/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Email processor function
 */
export async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { data } = job;

  logger.info(`Processing email job ${job.id}`, {
    jobId: job.id,
    to: data.to,
    subject: data.subject,
  });

  try {
    // Simulate email sending (replace with actual email service)
    await sendEmail(data);

    // Update job progress
    await job.updateProgress(100);

    logger.info(`Email sent successfully: ${job.id}`, {
      jobId: job.id,
      to: data.to,
    });
  } catch (error) {
    logger.error(`Failed to send email: ${job.id}`, {
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
async function sendEmail(data: EmailJobData): Promise<void> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate occasional failures for demonstration
  if (Math.random() < 0.1) {
    throw new Error('Simulated email service error');
  }

  logger.debug('Email sent via mock service', { to: data.to });
}

/**
 * Initialize email queue and worker
 */
export function initializeEmailQueue(): void {
  // Create queue
  const queue = queueRegistry.getQueue(QueueName.EMAIL);

  // Register worker
  queueRegistry.registerWorker(QueueName.EMAIL, processEmail, {
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  logger.info('Email queue initialized');
}

/**
 * Helper to add email job
 */
export async function sendEmailJob(data: EmailJobData): Promise<void> {
  const queue = queueRegistry.getQueue(QueueName.EMAIL);

  await queue.add('send-email', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  logger.info('Email job added', { to: data.to, subject: data.subject });
}
