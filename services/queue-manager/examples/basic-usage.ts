/**
 * Basic Queue Manager Usage Examples
 */

import { QueueManager, JobPriority } from '../src/index.js';

async function basicExample() {
  console.log('=== Basic Queue Manager Example ===\n');

  const queueManager = new QueueManager();

  // 1. Register a queue
  queueManager.registerQueue('email-queue');

  // 2. Register a processor
  queueManager.registerProcessor('email-queue', async (job) => {
    console.log(`Processing email job ${job.id}:`, job.data);
    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { sent: true, timestamp: new Date() };
  });

  // 3. Start workers
  await queueManager.startWorkers();

  // 4. Add jobs
  await queueManager.addJob('email-queue', 'welcome-email', {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our platform',
  });

  console.log('✓ Email job added to queue\n');

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Check metrics
  const metrics = await queueManager.getQueueMetrics('email-queue');
  console.log('Queue Metrics:', metrics);

  await queueManager.shutdown();
}

async function priorityExample() {
  console.log('\n=== Priority Queue Example ===\n');

  const queueManager = new QueueManager();
  queueManager.registerQueue('priority-queue');

  queueManager.registerProcessor('priority-queue', async (job) => {
    console.log(
      `Processing ${job.name} (priority: ${job.opts.priority})`,
      job.data,
    );
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  await queueManager.startWorkers();

  // Add jobs with different priorities
  await queueManager.addJob(
    'priority-queue',
    'background-task',
    { task: 'cleanup' },
    { priority: JobPriority.BACKGROUND },
  );

  await queueManager.addJob(
    'priority-queue',
    'normal-task',
    { task: 'report' },
    { priority: JobPriority.NORMAL },
  );

  await queueManager.addJob(
    'priority-queue',
    'critical-task',
    { task: 'alert' },
    { priority: JobPriority.CRITICAL },
  );

  console.log('✓ Jobs added with different priorities\n');

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await queueManager.shutdown();
}

async function scheduledJobExample() {
  console.log('\n=== Scheduled Job Example ===\n');

  const queueManager = new QueueManager();
  queueManager.registerQueue('scheduled-queue');

  queueManager.registerProcessor('scheduled-queue', async (job) => {
    console.log(
      `Executing scheduled job ${job.name} at ${new Date().toISOString()}`,
    );
    console.log('Data:', job.data);
  });

  await queueManager.startWorkers();

  // Schedule a job for 5 seconds from now
  const scheduledTime = new Date(Date.now() + 5000);
  await queueManager.addJob(
    'scheduled-queue',
    'future-task',
    { task: 'Generate monthly report' },
    { scheduledAt: scheduledTime },
  );

  console.log(`✓ Job scheduled for ${scheduledTime.toISOString()}\n`);

  await new Promise((resolve) => setTimeout(resolve, 7000));
  await queueManager.shutdown();
}

async function bulkJobExample() {
  console.log('\n=== Bulk Job Processing Example ===\n');

  const queueManager = new QueueManager();
  queueManager.registerQueue('bulk-queue');

  let processed = 0;
  queueManager.registerProcessor('bulk-queue', async (job) => {
    processed++;
    console.log(`Processing user ${job.data.userId} (${processed}/100)`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  await queueManager.startWorkers();

  // Create 100 jobs
  const jobs = Array.from({ length: 100 }, (_, i) => ({
    name: 'process-user',
    data: { userId: i + 1 },
  }));

  await queueManager.addBulk('bulk-queue', jobs);
  console.log('✓ Added 100 jobs to queue\n');

  await new Promise((resolve) => setTimeout(resolve, 15000));

  const metrics = await queueManager.getQueueMetrics('bulk-queue');
  console.log('Final Metrics:', {
    completed: metrics.completed,
    throughput: `${metrics.throughput} jobs/min`,
  });

  await queueManager.shutdown();
}

async function workflowExample() {
  console.log('\n=== Workflow Example ===\n');

  const queueManager = new QueueManager();

  // Setup queues
  queueManager.registerQueue('user-registration');
  queueManager.registerQueue('email-verification');
  queueManager.registerQueue('profile-setup');

  // Setup processors
  queueManager.registerProcessor('user-registration', async (job) => {
    console.log('Step 1: Registering user', job.data.email);
    return { userId: 12345 };
  });

  queueManager.registerProcessor('email-verification', async (job) => {
    console.log('Step 2: Sending verification email to', job.data.email);
    return { emailSent: true };
  });

  queueManager.registerProcessor('profile-setup', async (job) => {
    console.log('Step 3: Setting up profile for user', job.data.userId);
    return { profileCreated: true };
  });

  await queueManager.startWorkers();

  // Execute workflow
  const workflow = {
    id: 'user-onboarding-001',
    name: 'User Onboarding',
    steps: [
      {
        queueName: 'user-registration',
        jobName: 'register',
        data: { email: 'newuser@example.com', name: 'John Doe' },
        onSuccess: [
          {
            queueName: 'email-verification',
            jobName: 'verify',
            data: { email: 'newuser@example.com' },
            onSuccess: [
              {
                queueName: 'profile-setup',
                jobName: 'setup',
                data: { userId: 12345 },
              },
            ],
          },
        ],
      },
    ],
  };

  await queueManager.executeWorkflow(workflow);
  console.log('✓ Workflow started\n');

  await new Promise((resolve) => setTimeout(resolve, 5000));
  await queueManager.shutdown();
}

// Run examples
async function runAllExamples() {
  try {
    await basicExample();
    await priorityExample();
    await scheduledJobExample();
    await bulkJobExample();
    await workflowExample();

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
