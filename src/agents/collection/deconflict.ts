import { CollectionTask } from './tasking';

export function isDuplicate(newTask: CollectionTask, existingTasks: CollectionTask[]): boolean {
  return existingTasks.some(existing => {
    // Basic deconfliction logic: same target and type
    if (existing.target !== newTask.target) return false;
    if (existing.type !== newTask.type) return false;

    // Check parameters if needed (deep equality or specific keys)
    // For now, assume same target+type is duplicate if status is not failed
    if (existing.status === 'failed') return false; // Retry allowed

    return true;
  });
}

export function deconflictTasks(newTasks: CollectionTask[], existingTasks: CollectionTask[]): CollectionTask[] {
  return newTasks.filter(task => !isDuplicate(task, existingTasks));
}
