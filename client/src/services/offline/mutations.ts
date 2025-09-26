import {
  deleteQueuedMutation,
  getQueuedMutations,
  getQueuedMutationCount,
  incrementMutationAttempts,
  queueMutation,
  type QueuedMutation,
} from './indexedDb';

const GRAPHQL_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:4001/graphql';
const TENANT = import.meta.env.VITE_TENANT_ID || 'dev';

export async function flushQueuedMutations(): Promise<{ processed: number; remaining: number }> {
  const queued = await getQueuedMutations();
  if (!queued.length) {
    return { processed: 0, remaining: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, remaining: queued.length };
  }

  let processed = 0;

  for (const mutation of queued) {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : undefined;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT,
      };

      if (token) {
        headers.authorization = `Bearer ${token}`;
      }

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(mutation.body),
      });

      if (response.ok) {
        await deleteQueuedMutation(mutation.id);
        processed += 1;
      } else {
        await incrementMutationAttempts(mutation.id);
      }
    } catch (error) {
      void error;
      await incrementMutationAttempts(mutation.id);
      break;
    }
  }

  const remaining = await getQueuedMutationCount();
  return { processed, remaining };
}

export async function queueOfflineMutation(body: unknown): Promise<QueuedMutation | undefined> {
  return queueMutation(body);
}

export async function getPendingMutationCount(): Promise<number> {
  return getQueuedMutationCount();
}
