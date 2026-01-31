import { PostgresStore, Task } from './PostgresStore.js';
import { OrchestratorWorker, WorkerOptions } from './worker.js';

export type TaskHandler = (task: Task) => Promise<any>;

export class MaestroWorker extends OrchestratorWorker {
    private handlers = new Map<string, TaskHandler>();

    constructor(store: PostgresStore, options: WorkerOptions) {
        super(store, options);
    }

    registerHandler(kind: string, handler: TaskHandler) {
        this.handlers.set(kind, handler);
    }

    protected async execute(task: Task): Promise<any> {
        const handler = this.handlers.get(task.kind);
        if (!handler) {
            throw new Error(`No handler registered for task kind: ${task.kind}`);
        }
        return await handler(task);
    }
}
