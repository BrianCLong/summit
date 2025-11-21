import express, { Request, Response } from 'express';
import { QueueManager } from '../core/QueueManager.js';
import { Logger } from '../utils/logger.js';
import { register } from 'prom-client';

export class QueueManagerAPI {
  private app: express.Application;
  private queueManager: QueueManager;
  private logger: Logger;
  private port: number;

  constructor(queueManager: QueueManager, port: number = 3010) {
    this.app = express();
    this.queueManager = queueManager;
    this.logger = new Logger('QueueManagerAPI');
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept',
      );
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Prometheus metrics
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });

    // Queue management endpoints
    this.app.get('/api/queues', this.getAllQueues.bind(this));
    this.app.get('/api/queues/:name', this.getQueue.bind(this));
    this.app.get('/api/queues/:name/metrics', this.getQueueMetrics.bind(this));
    this.app.post('/api/queues/:name/pause', this.pauseQueue.bind(this));
    this.app.post('/api/queues/:name/resume', this.resumeQueue.bind(this));
    this.app.post('/api/queues/:name/clean', this.cleanQueue.bind(this));
    this.app.delete(
      '/api/queues/:name/obliterate',
      this.obliterateQueue.bind(this),
    );

    // Job management endpoints
    this.app.post('/api/queues/:name/jobs', this.addJob.bind(this));
    this.app.post('/api/queues/:name/jobs/bulk', this.addBulkJobs.bind(this));
    this.app.get('/api/queues/:name/jobs/:jobId', this.getJob.bind(this));
    this.app.post(
      '/api/queues/:name/jobs/:jobId/retry',
      this.retryJob.bind(this),
    );
    this.app.delete(
      '/api/queues/:name/jobs/:jobId',
      this.removeJob.bind(this),
    );

    // Workflow endpoints
    this.app.post('/api/workflows', this.executeWorkflow.bind(this));

    // Dashboard metrics endpoint
    this.app.get('/api/dashboard/metrics', this.getDashboardMetrics.bind(this));

    // Serve static dashboard UI
    this.app.use(express.static('public'));
  }

  private async getAllQueues(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.queueManager.getAllMetrics();
      res.json({ queues: metrics });
    } catch (error) {
      this.logger.error('Error getting all queues', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getQueue(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const metrics = await this.queueManager.getQueueMetrics(name);
      res.json({ queue: name, ...metrics });
    } catch (error) {
      this.logger.error(`Error getting queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getQueueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const metrics = await this.queueManager.getQueueMetrics(name);
      res.json(metrics);
    } catch (error) {
      this.logger.error(`Error getting queue metrics ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async pauseQueue(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      await this.queueManager.pauseQueue(name);
      res.json({ message: `Queue ${name} paused` });
    } catch (error) {
      this.logger.error(`Error pausing queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async resumeQueue(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      await this.queueManager.resumeQueue(name);
      res.json({ message: `Queue ${name} resumed` });
    } catch (error) {
      this.logger.error(`Error resuming queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async cleanQueue(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { grace, status } = req.body;
      await this.queueManager.cleanQueue(name, grace, status);
      res.json({ message: `Queue ${name} cleaned` });
    } catch (error) {
      this.logger.error(`Error cleaning queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async obliterateQueue(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      await this.queueManager.obliterateQueue(name);
      res.json({ message: `Queue ${name} obliterated` });
    } catch (error) {
      this.logger.error(`Error obliterating queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async addJob(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { jobName, data, options } = req.body;
      const job = await this.queueManager.addJob(name, jobName, data, options);
      res.json({ jobId: job.id, message: 'Job added successfully' });
    } catch (error) {
      this.logger.error(`Error adding job to queue ${req.params.name}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async addBulkJobs(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { jobs } = req.body;
      const addedJobs = await this.queueManager.addBulk(name, jobs);
      res.json({
        count: addedJobs.length,
        message: `${addedJobs.length} jobs added successfully`,
      });
    } catch (error) {
      this.logger.error(
        `Error adding bulk jobs to queue ${req.params.name}`,
        error,
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getJob(req: Request, res: Response): Promise<void> {
    try {
      const { name, jobId } = req.params;
      const job = await this.queueManager.getJob(name, jobId);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json({
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      });
    } catch (error) {
      this.logger.error(`Error getting job ${req.params.jobId}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const { name, jobId } = req.params;
      await this.queueManager.retryJob(name, jobId);
      res.json({ message: `Job ${jobId} retried` });
    } catch (error) {
      this.logger.error(`Error retrying job ${req.params.jobId}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async removeJob(req: Request, res: Response): Promise<void> {
    try {
      const { name, jobId } = req.params;
      await this.queueManager.removeJob(name, jobId);
      res.json({ message: `Job ${jobId} removed` });
    } catch (error) {
      this.logger.error(`Error removing job ${req.params.jobId}`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const workflow = req.body;
      await this.queueManager.executeWorkflow(workflow);
      res.json({ message: `Workflow ${workflow.name} started` });
    } catch (error) {
      this.logger.error('Error executing workflow', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async getDashboardMetrics(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const metrics = await this.queueManager.getAllMetrics();
      res.json({
        timestamp: new Date().toISOString(),
        queues: metrics,
      });
    } catch (error) {
      this.logger.error('Error getting dashboard metrics', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  start(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`Queue Manager API listening on port ${this.port}`);
      this.logger.info(`Dashboard: http://localhost:${this.port}`);
      this.logger.info(`Metrics: http://localhost:${this.port}/metrics`);
    });
  }
}
