import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const router = Router();
const TASK_REGISTRY_PATH = path.join(process.cwd(), '.agentic-tasks.yaml');

interface Task {
    id: string;
    name: string;
    agent: string;
    status: string;
    metrics?: {
        startTime: number;
        mergeTime?: number;
    }
}

router.get('/metrics', (req: Request, res: Response) => {
  try {
    let tasks: Task[] = [];
    if (fs.existsSync(TASK_REGISTRY_PATH)) {
      const doc = yaml.load(fs.readFileSync(TASK_REGISTRY_PATH, 'utf8')) as any;
      tasks = doc.tasks || [];
    }

    const activeTasks = tasks.filter(t => t.status !== 'archived');
    const mergedTasks = tasks.filter(t => t.status === 'merged' || t.status === 'archived');

    // Calculate velocity (avg time to merge for archived tasks)
    let totalMergeTime = 0;
    let mergeCount = 0;
    mergedTasks.forEach(t => {
        if (t.metrics && t.metrics.mergeTime && t.metrics.startTime) {
            totalMergeTime += (t.metrics.mergeTime - t.metrics.startTime);
            mergeCount++;
        }
    });
    const avgMergeTimeMs = mergeCount > 0 ? totalMergeTime / mergeCount : 0;
    const avgMergeTimeHours = (avgMergeTimeMs / (1000 * 60 * 60)).toFixed(2);

    // Prometheus format text response
    const promMetrics = [
      '# HELP agentic_active_tasks Number of active agentic tasks',
      '# TYPE agentic_active_tasks gauge',
      `agentic_active_tasks ${activeTasks.length}`,
      '# HELP agentic_velocity_hours Average time to merge in hours',
      '# TYPE agentic_velocity_hours gauge',
      `agentic_velocity_hours ${avgMergeTimeHours}`,
      '# HELP agentic_completed_tasks_total Total completed tasks',
      '# TYPE agentic_completed_tasks_total counter',
      `agentic_completed_tasks_total ${mergedTasks.length}`
    ].join('\n');

    res.set('Content-Type', 'text/plain');
    res.send(promMetrics);

  } catch (error) {
    console.error('Error serving metrics:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
