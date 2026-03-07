import { describe, it, expect } from 'vitest';
import { Scheduler } from '../../api/agent-os/scheduler/index';
import { LeaseClient } from '../../apps/agent-worker/lease-client';

describe('Agent OS Scheduler', () => {
  it('leases tasks and completes them', () => {
    const scheduler = new Scheduler();
    scheduler.enqueueGraph({
      id: 'g1',
      repo: 'BrianCLong/summit',
      nodes: [
        { id: 't1', kind: 'plan', deps: [], evidenceRequired: [], budgetClass: 's' }
      ]
    });

    const client = new LeaseClient(scheduler, 'worker-1');
    const task = client.poll();
    expect(task).toBeDefined();
    expect(task?.id).toBe('t1');

    client.reportComplete('t1');
    const nextTask = client.poll();
    expect(nextTask).toBeNull();
  });
});
