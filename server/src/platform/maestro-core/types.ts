export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string;
  tenantId: string;
  type: string;
  payload: Record<string, any>;
  priority: TaskPriority;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  slaSeconds?: number;
  attemptCount: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  lastError?: string;
}

export interface TaskQueue {
  enqueue(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'status'>): Promise<Task>;
  dequeue(workerTypes: string[]): Promise<Task | null>;
  ack(taskId: string): Promise<void>;
  nack(taskId: string, error?: string): Promise<void>;
  get(taskId: string): Promise<Task | null>;
}

export interface MaestroEvent {
  id: string;
  timestamp: Date;
  taskId?: string;
  tenantId: string;
  type: string;
  payload: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export interface MaestroEventStore {
  append(event: Omit<MaestroEvent, 'id' | 'timestamp'>): Promise<MaestroEvent>;
  query(tenantId: string, filters?: Partial<MaestroEvent>): Promise<MaestroEvent[]>;
}
