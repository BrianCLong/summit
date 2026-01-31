import { Task, TaskStatus, OrchestratorEvent } from './types.js';

export interface OrchestratorStore {
    withTransaction<T>(fn: (txStore: OrchestratorStore) => Promise<T>): Promise<T>;

    saveRun(id: string, metadata: any): Promise<void>;
    getRun(id: string): Promise<any>;

    upsertTask(task: Task): Promise<void>;
    getTask(id: string): Promise<Task | undefined>;
    updateTaskStatus(id: string, status: TaskStatus, payload?: {
        completedAt?: string;
        readyAt?: string;
        expectedVersion?: number;
    }): Promise<void>;

    saveEvent(event: OrchestratorEvent): Promise<void>;
    getEvents(runId: string): Promise<OrchestratorEvent[]>;

    saveToOutbox(topic: string, payload: any): Promise<void>;

    claimTask(workerId: string, leaseDurationMs: number): Promise<Task | undefined>;
    heartbeatTask(taskId: string, workerId: string, leaseDurationMs: number): Promise<void>;

    pruneOldData(retentionDays: number): Promise<{ runsDeleted: number; eventsDeleted: number; outboxDeleted: number }>;
    getQueueMetrics(): Promise<{ readyTasks: number; runningTasks: number; outboxBacklog: number }>;
}

export class InMemoryStore implements OrchestratorStore {
    private runs = new Map<string, any>();
    private tasks = new Map<string, Task>();
    private events: OrchestratorEvent[] = [];
    private outbox: { topic: string; payload: any }[] = [];

    constructor() { }

    async withTransaction<T>(fn: (txStore: OrchestratorStore) => Promise<T>): Promise<T> {
        return await fn(this);
    }

    async saveRun(id: string, metadata: any): Promise<void> {
        this.runs.set(id, { id, metadata, created_at: new Date().toISOString() });
    }

    async getRun(id: string): Promise<any> {
        return this.runs.get(id);
    }

    async upsertTask(task: Task): Promise<void> {
        const existing = this.tasks.get(task.id);
        this.tasks.set(task.id, {
            ...task,
            version: existing ? (existing as any).version + 1 : 1,
            attempts: task.attempts ?? 0,
            maxAttempts: task.maxAttempts ?? 3,
            readyAt: task.readyAt ?? new Date().toISOString(),
            priority: task.priority ?? 0
        } as any);
    }

    async getTask(id: string): Promise<Task | undefined> {
        return this.tasks.get(id);
    }

    async updateTaskStatus(id: string, status: TaskStatus, payload?: any): Promise<void> {
        const task = this.tasks.get(id);
        if (!task) throw new Error('Task not found');

        if (payload?.expectedVersion !== undefined && (task as any).version !== payload.expectedVersion) {
            throw new Error('Optimistic locking failure');
        }

        task.status = status;
        if (payload?.completedAt) task.timestamps.completed = payload.completedAt;
        if (payload?.readyAt) task.readyAt = payload.readyAt;
        (task as any).version = ((task as any).version || 0) + 1;
    }

    async saveEvent(event: OrchestratorEvent): Promise<void> {
        this.events.push(event);
    }

    async getEvents(runId: string): Promise<OrchestratorEvent[]> {
        return this.events.filter(e => (e.payload as any)?.runId === runId);
    }

    async saveToOutbox(topic: string, payload: any): Promise<void> {
        this.outbox.push({ topic, payload });
    }

    async claimTask(workerId: string, leaseDurationMs: number): Promise<Task | undefined> {
        // Basic mock implementation
        const task = Array.from(this.tasks.values()).find(t => t.status === 'pending');
        if (task) {
            task.status = 'in_progress';
            task.attempts++;
            return task;
        }
        return undefined;
    }

    async heartbeatTask(taskId: string, workerId: string, leaseDurationMs: number): Promise<void> {
        // Mock
    }

    async pruneOldData(retentionDays: number): Promise<{ runsDeleted: number; eventsDeleted: number; outboxDeleted: number }> {
        return { runsDeleted: 0, eventsDeleted: 0, outboxDeleted: 0 };
    }

    async getQueueMetrics(): Promise<{ readyTasks: number; runningTasks: number; outboxBacklog: number }> {
        const readyTasks = Array.from(this.tasks.values()).filter(t => t.status === 'pending').length;
        const runningTasks = Array.from(this.tasks.values()).filter(t => t.status === 'in_progress').length;
        return { readyTasks, runningTasks, outboxBacklog: 0 };
    }
}
