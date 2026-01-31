import { Task, TaskStatus, OrchestratorEvent } from './types.js';

export interface OrchestratorStore {
    /**
     * Initializes a new orchestration run.
     */
    createRun(runId: string, metadata?: any): Promise<void>;

    /**
     * Upserts a task into the store.
     * Should be idempotent.
     */
    upsertTask(task: Task): Promise<void>;

    /**
     * Retrieves a task by its ID.
     */
    getTask(taskId: string): Promise<Task | undefined>;

    /**
     * Retrieves all tasks for a specific run that are ready to be executed.
     */
    getReadyTasks(runId: string): Promise<Task[]>;

    /**
     * Updates the status and other properties of a task.
     */
    updateTaskStatus(taskId: string, status: TaskStatus, payload?: {
        owner?: string;
        completedAt?: string;
        startedAt?: string;
        error?: string;
    }): Promise<void>;

    /**
     * Persists an orchestrator event to the durable log.
     */
    saveEvent(event: OrchestratorEvent): Promise<void>;

    /**
     * Saves an event to the outbox for reliable emission.
     */
    saveToOutbox(topic: string, payload: any): Promise<void>;
}

export class InMemoryStore implements OrchestratorStore {
    private runs = new Map<string, any>();
    private tasks = new Map<string, Task>();
    private events: OrchestratorEvent[] = [];
    private outbox: { topic: string; payload: any }[] = [];

    async createRun(runId: string, metadata: any = {}): Promise<void> {
        this.runs.set(runId, metadata);
    }

    async upsertTask(task: Task): Promise<void> {
        this.tasks.set(task.id, task);
    }

    async getTask(taskId: string): Promise<Task | undefined> {
        return this.tasks.get(taskId);
    }

    async getReadyTasks(runId: string): Promise<Task[]> {
        const ready: Task[] = [];
        for (const task of this.tasks.values()) {
            if (task.status === 'pending') {
                const isBlocked = task.blockedBy.some(depId => {
                    const dep = this.tasks.get(depId);
                    return !dep || dep.status !== 'completed';
                });
                if (!isBlocked) {
                    ready.push(task);
                }
            }
        }
        return ready.sort((a, b) => a.id.localeCompare(b.id));
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, payload?: any): Promise<void> {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = status;
            if (payload?.owner) task.owner = payload.owner;
            if (payload?.startedAt) task.timestamps.started = payload.startedAt;
            if (payload?.completedAt) task.timestamps.completed = payload.completedAt;
        }
    }

    async saveEvent(event: OrchestratorEvent): Promise<void> {
        this.events.push(event);
    }

    async saveToOutbox(topic: string, payload: any): Promise<void> {
        this.outbox.push({ topic, payload });
    }

    // Helper for tests/replay
    getEvents() { return this.events; }
    getOutbox() { return this.outbox; }
}
