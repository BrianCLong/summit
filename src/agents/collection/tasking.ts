export interface CollectionTask {
  taskId: string;
  target: string;
  type: 'scrape' | 'api' | 'monitor';
  parameters: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
}

export function createCollectionTask(
  target: string,
  type: CollectionTask['type'],
  parameters: Record<string, any> = {},
  priority: CollectionTask['priority'] = 'medium'
): CollectionTask {
  return {
    taskId: `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    target,
    type,
    parameters,
    priority,
    status: 'pending',
    created_at: new Date().toISOString()
  };
}
