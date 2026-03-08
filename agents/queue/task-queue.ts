export interface QueueTask {
  id: string;
  priority: number;
  attempts?: number;
}

export interface QueueTaskContext<TTask extends QueueTask> {
  attempt: number;
  task: TTask;
}

export interface QueueExecutionResult<TResult> {
  taskId: string;
  status: "success" | "retry_exhausted" | "fail";
  attempts: number;
  result?: TResult;
  error?: string;
}

export interface QueuedTask extends QueueTask {
  enqueuedAt: number;
}

interface QueueOptions {
  concurrency?: number;
  defaultMaxAttempts?: number;
}

interface InternalTask<TTask extends QueueTask, TResult> {
  task: TTask;
  enqueuedAt: number;
  handler: (context: QueueTaskContext<TTask>) => Promise<TResult>;
  maxAttempts: number;
}

export class TaskQueue<TResult, TTask extends QueueTask = QueueTask> {
  private readonly queue: InternalTask<TTask, TResult>[] = [];

  private readonly concurrency: number;

  private readonly defaultMaxAttempts: number;

  private activeExecutions = 0;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 1;
    this.defaultMaxAttempts = options.defaultMaxAttempts ?? 3;
  }

  enqueue(
    task: TTask,
    handler: (context: QueueTaskContext<TTask>) => Promise<TResult>,
    maxAttempts = this.defaultMaxAttempts
  ): void {
    this.queue.push({
      task,
      handler,
      maxAttempts,
      enqueuedAt: Date.now(),
    });
    this.queue.sort((a, b) => {
      if (b.task.priority === a.task.priority) {
        return a.enqueuedAt - b.enqueuedAt;
      }
      return b.task.priority - a.task.priority;
    });
  }

  async processNext(): Promise<QueueExecutionResult<TResult> | null> {
    if (this.activeExecutions >= this.concurrency) {
      return null;
    }

    const next = this.queue.shift();
    if (!next) {
      return null;
    }

    this.activeExecutions += 1;
    try {
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < next.maxAttempts) {
        attempt += 1;
        try {
          const result = await next.handler({
            task: {
              ...next.task,
              attempts: attempt,
            },
            attempt,
          });
          return {
            taskId: next.task.id,
            status: "success",
            attempts: attempt,
            result,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      return {
        taskId: next.task.id,
        status: "retry_exhausted",
        attempts: next.maxAttempts,
        error: lastError?.message ?? "Unknown queue failure",
      };
    } finally {
      this.activeExecutions -= 1;
    }
  }

  async processAll(): Promise<QueueExecutionResult<TResult>[]> {
    const results: QueueExecutionResult<TResult>[] = [];
    while (this.queue.length > 0) {
      const result = await this.processNext();
      if (result) {
        results.push(result);
      }
    }
    return results;
  }

  getSnapshot(): QueuedTask[] {
    return this.queue.map((entry) => ({
      id: entry.task.id,
      priority: entry.task.priority,
      attempts: entry.task.attempts,
      enqueuedAt: entry.enqueuedAt,
    }));
  }
}
