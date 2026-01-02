import { QueueFactory } from '../queue/queue.factory.js';
import { QueueName } from '../queue/types.js';
import { PlaybookExecutor } from './executor.js';
import { PlaybookRunSchema } from './schema.js';

export const createPlaybookWorker = () => {
  const executor = new PlaybookExecutor();
  return QueueFactory.createWorker(QueueName.PLAYBOOK, async (job: any) => {
    const run = PlaybookRunSchema.parse(job.data);
    const results = await executor.execute(run.playbook);
    return {
      runKey: run.runKey,
      playbookId: run.playbook.id,
      results,
    };
  });
};
