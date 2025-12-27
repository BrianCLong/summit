import { JobsOptions, Queue } from 'bullmq';
import { QueueFactory } from '../queue/queue.factory.js';
import { QueueName } from '../queue/types.js';
import { PlaybookRun, PlaybookRunSchema } from './schema.js';

export const PLAYBOOK_QUEUE_NAME = QueueName.PLAYBOOK;

let playbookQueue: Queue | null = null;

const getPlaybookQueue = (): Queue => {
  if (!playbookQueue) {
    playbookQueue = QueueFactory.createQueue(PLAYBOOK_QUEUE_NAME);
  }
  return playbookQueue;
};

export const enqueuePlaybookRun = async (
  run: PlaybookRun,
  options: JobsOptions = {},
): Promise<ReturnType<Queue['add']>> => {
  const parsed = PlaybookRunSchema.parse(run);
  const queue = getPlaybookQueue();
  const existing = await queue.getJob(parsed.runKey);
  if (existing) {
    return existing;
  }
  return queue.add('playbook-run', parsed, {
    jobId: parsed.runKey,
    ...options,
  });
};
