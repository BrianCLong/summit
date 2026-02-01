import { randomUUID } from "node:crypto";
import { JsonRpcClient, TaskClient } from "./task_client";
import { withTaskMeta } from "./meta";
import { pollUntilTerminal } from "./poll";

export interface CallWithTaskOptions {
  pollIntervalMs?: number;
  maxMs?: number;
  signal?: AbortSignal;
}

export async function callWithTask(
  client: JsonRpcClient,
  taskClient: TaskClient,
  method: string,
  params: any,
  opts: CallWithTaskOptions = {}
): Promise<any> {
  // 1. Feature Flag Check
  if (process.env.SUMMIT_MCP_TASKS !== '1') {
    return client.request(method, params);
  }

  // 2. Prepare Task
  const taskId = randomUUID();
  const augmentedParams = withTaskMeta(params, { taskId });
  let taskCreated = false;

  // 3. Setup Notification Listener
  // We need to capture the notification.
  // If the client only supports a single 'onNotification' callback, we might need to chain it.
  // This implementation assumes we can hook it.
  // If we can't easily hook, we might rely on the server returning a specific "Task Accepted" response,
  // but SEP says check for notification.

  // Hack: Capture the original handler if accessible, or assume client handles dispatch.
  // Since we are defining the interface, let's assume client.onNotification adds a handler or we wrap it.
  // But strictly looking at `JsonRpcClient` interface in `task_client.ts`, it has `onNotification?`.
  // We'll wrap it.

  const originalOnNotification = client.onNotification; // This might be a setter or method?
  // The interface says `onNotification?(handler: ...): void`. It looks like a method to register a handler.
  // If it overwrites, we are in trouble.
  // Let's assume for this feature it's okay to wrap/overwrite for the duration of the request?
  // No, that's dangerous for concurrency.

  // Ideally, the client should be an EventEmitter.
  // For now, let's implement a naive "race" where we just poll if the request returns "accepted"?
  // Or better: We assume the client emits events.

  // Let's stick to the plan's architecture: "Race between normal response vs notifications/tasks/created".

  const controller = new AbortController();
  if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort());
  }

  // We create a promise for the task notification
  const taskNotificationPromise = new Promise<void>((resolve) => {
      // This part is tricky without an event emitter on client.
      // We'll rely on a global or side-channel for this simulation if we can't modify client.
      // BUT, since `fake_mcp_server` and `TaskClient` are under our control...

      // Let's assume the user passes a client that we can listen to.
      // If `client` has `on` method?
      if (typeof (client as any).on === 'function') {
           (client as any).on('notification', (method: string, p: any) => {
               if (method === 'notifications/tasks/created' && p.taskId === taskId) {
                   taskCreated = true;
                   resolve();
               }
           });
      } else if (client.onNotification) {
          // This path is brittle if it overwrites.
          // Let's skip the notification check if we can't hook safely,
          // AND just fallback to polling if the request returns quickly?
          // "If server ignores task augmentation... direct response path wins."

          // Strategy:
          // Send request.
          // If response comes back.
          // If we saw notification -> Poll.
          // If we didn't -> Return response.
          // BUT how to see notification?

          // We will implement a temporary hook if possible.
          // For the purpose of this PR (Skeleton), we will assume `client` allows hooking.
          // In `fake_mcp_server`, we can hook.

          // Let's assume we can wrap `client.onNotification`.
          // We can't read the existing one easily from the interface.

          // Fallback: We proceed to poll ONLY if we detect we should.
          // How?
          // If the response is NOT the final result?
          // The SEP says: "Clients... MUST wait for notifications... If not received... assume direct response".

          // PROPOSAL: We poll `tasks/get` ONCE after request returns (if valid).
          // If `tasks/get` returns valid status, we switch to task mode.
          // If `tasks/get` fails (404/Found), we assume direct response.
          // This is "Path B" variant: "fallback to timed proactive poll".

          // Let's use this proactive poll approach as it's more robust against client implementation details.
          // "Fallback to timed proactive poll only in constrained environments."
          // Since we can't easily subscribe to notifications in this generic interface.
      }
  });

  // 4. Send Request
  const requestPromise = client.request(method, augmentedParams);

  // 5. Race / Handling
  // We wait for request to return.
  const result = await requestPromise;

  // If taskCreated (via listener) is true, we ignore `result` and poll.
  if (taskCreated) {
      return pollUntilTerminal({ tasks: taskClient, taskId, signal: controller.signal, ...opts });
  }

  // If not detected via listener, try one "probe" poll if the result looks like a receipt?
  // Or just return result.
  // If we couldn't hook listeners, we might miss the notification.
  // Let's implement the "Proactive Poll" check.
  try {
      const taskStatus = await taskClient.get(taskId);
      if (taskStatus && taskStatus.taskId === taskId) {
           // It IS a task!
           return pollUntilTerminal({ tasks: taskClient, taskId, signal: controller.signal, ...opts });
      }
  } catch (e) {
      // Ignore error, assume it wasn't a task.
  }

  return result;
}
