import express from 'express';
import { MaestroScheduler } from './scheduler.js';
import { TaskQueue } from './types.js';

export class MaestroAPI {
  public router = express.Router();

  constructor(private scheduler: MaestroScheduler, private queue: TaskQueue) {
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.post('/tasks', async (req, res) => {
      try {
        const task = await this.scheduler.scheduleTask(req.body);
        res.status(201).json(task);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    this.router.get('/tasks/:taskId', async (req, res) => {
      try {
        const task = await this.queue.get(req.params.taskId);
        if (!task) {
           res.status(404).json({ error: 'Task not found' });
           return;
        }
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }
}
