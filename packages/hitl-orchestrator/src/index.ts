import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';

export interface HumanReviewTask {
  taskId: string;
  workflowId: string;
  data: unknown; // Data to be reviewed
  status: 'pending' | 'approved' | 'rejected';
  reviewerId?: string;
  decision?: string; // Reason for decision
}

export class HITLOrchestrator {
  private app: express.Application;
  private tasks: Map<string, HumanReviewTask>;

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json({ limit: '1mb' }));
    this.tasks = new Map();

    this.app.post('/tasks/create', this.createTask.bind(this));
    this.app.post('/tasks/review/:taskId', this.reviewTask.bind(this));
    this.app.get('/tasks/:taskId', this.getTask.bind(this));
    this.app.get('/tasks', this.getAllTasks.bind(this));
  }

  private createTask(req: Request, res: Response) {
    const { workflowId, data } = req.body;
    const taskId = `task-${Date.now()}`;
    const newTask: HumanReviewTask = {
      taskId,
      workflowId,
      data,
      status: 'pending',
    };
    this.tasks.set(taskId, newTask);
    res.status(201).json(newTask);
  }

  private reviewTask(req: Request, res: Response) {
    const { taskId } = req.params;
    const { reviewerId, decision } = req.body;
    const task = this.tasks.get(taskId);

    if (!task) {
      return res.status(404).send('Task not found');
    }

    task.reviewerId = reviewerId;
    task.decision = decision;
    task.status = decision === 'approved' ? 'approved' : 'rejected';
    res.status(200).json(task);
  }

  private getTask(req: Request, res: Response) {
    const { taskId } = req.params;
    const task = this.tasks.get(taskId);
    if (!task) {
      return res.status(404).send('Task not found');
    }
    res.status(200).json(task);
  }

  private getAllTasks(_req: Request, res: Response) {
    res.status(200).json(Array.from(this.tasks.values()));
  }

  start(port: number) {
    this.app.listen(port, () => {
      // console.log(`HITL Orchestrator listening on port ${port}`);
    });
  }
}
