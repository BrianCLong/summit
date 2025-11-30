import { Task } from './types.js';

export type MaestroEventType = 'TASK_CREATED' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'TASK_BLOCKED';

export interface MaestroEvent {
  type: MaestroEventType;
  task: Task;
  timestamp: Date;
  payload?: any;
}

export class EventBus {
  private listeners: Map<MaestroEventType, ((event: MaestroEvent) => void)[]> = new Map();

  subscribe(type: MaestroEventType, handler: (event: MaestroEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(handler);
  }

  emit(event: MaestroEvent) {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }
}
