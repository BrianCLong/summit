/**
 * REST API for Agent Execution Platform
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { agentRunner } from '../runner/index.js';
import { pipelineEngine } from '../pipeline/index.js';
import { promptRegistry } from '../registry/index.js';
import { logger } from '../logging/index.js';
import { configManager } from '../config/index.js';
import {
  APIResponse,
  PaginatedResponse,
  AgentConfig,
  AgentContext,
  PipelineDefinition,
  PromptTemplate,
} from '../types/index.js';

export class APIServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 4000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: configManager.get().server.cors.origins,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: configManager.get().server.rateLimit.windowMs,
      max: configManager.get().server.rateLimit.maxRequests,
      message: 'Too many requests from this IP',
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();

      res.on('finish', () => {
        logger.getLogger().info('HTTP Request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs: Date.now() - startTime,
        });
      });

      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date(),
        version: '1.0.0',
      });
    });

    // Agent execution endpoints
    router.post('/agents/execute', this.executeAgent.bind(this));
    router.get('/agents/executions', this.listExecutions.bind(this));
    router.get('/agents/executions/:id', this.getExecution.bind(this));
    router.delete('/agents/executions/:id', this.cancelExecution.bind(this));
    router.get('/agents/stats', this.getAgentStats.bind(this));

    // Pipeline endpoints
    router.post('/pipelines/execute', this.executePipeline.bind(this));
    router.get('/pipelines/executions', this.listPipelineExecutions.bind(this));
    router.get('/pipelines/executions/:id', this.getPipelineExecution.bind(this));
    router.delete('/pipelines/executions/:id', this.cancelPipelineExecution.bind(this));

    // Prompt registry endpoints
    router.post('/prompts', this.registerPrompt.bind(this));
    router.get('/prompts', this.listPrompts.bind(this));
    router.get('/prompts/:name', this.getPrompt.bind(this));
    router.post('/prompts/:name/render', this.renderPrompt.bind(this));
    router.delete('/prompts/:name', this.deletePrompt.bind(this));
    router.get('/prompts/:name/versions', this.getPromptVersions.bind(this));
    router.get('/prompts/stats', this.getPromptStats.bind(this));

    // Logging endpoints
    router.get('/logs', this.queryLogs.bind(this));
    router.get('/logs/stats', this.getLogStats.bind(this));

    this.app.use('/api', router);
  }

  private setupErrorHandling(): void {
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.getLogger().error('Unhandled error', error, {
        path: req.path,
        method: req.method,
      });

      const response: APIResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.status(500).json(response);
    });
  }

  // Agent execution handlers
  private async executeAgent(req: Request, res: Response): Promise<void> {
    try {
      const { config, input, context } = req.body as {
        config: AgentConfig;
        input: any;
        context: AgentContext;
      };

      const result = await agentRunner.execute(config, input, context);

      const response: APIResponse = {
        success: result.success,
        data: result,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async listExecutions(req: Request, res: Response): Promise<void> {
    try {
      const executions = await agentRunner.listExecutions();

      const response: APIResponse = {
        success: true,
        data: executions,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await agentRunner.getExecution(id);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Execution not found',
          },
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        data: execution,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cancelled = await agentRunner.cancelExecution(id);

      const response: APIResponse = {
        success: cancelled,
        data: { cancelled },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getAgentStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = agentRunner.getStats();

      const response: APIResponse = {
        success: true,
        data: stats,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  // Pipeline handlers
  private async executePipeline(req: Request, res: Response): Promise<void> {
    try {
      const { definition, context } = req.body as {
        definition: PipelineDefinition;
        context: AgentContext;
      };

      const execution = await pipelineEngine.execute(definition, context);

      const response: APIResponse = {
        success: true,
        data: execution,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async listPipelineExecutions(req: Request, res: Response): Promise<void> {
    try {
      const executions = await pipelineEngine.listExecutions();

      const response: APIResponse = {
        success: true,
        data: executions,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getPipelineExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await pipelineEngine.getExecution(id);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Pipeline execution not found',
          },
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        data: execution,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async cancelPipelineExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cancelled = await pipelineEngine.cancelExecution(id);

      const response: APIResponse = {
        success: cancelled,
        data: { cancelled },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  // Prompt registry handlers
  private async registerPrompt(req: Request, res: Response): Promise<void> {
    try {
      const template = req.body as PromptTemplate;
      await promptRegistry.register(template);

      const response: APIResponse = {
        success: true,
        data: { registered: true },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { tags } = req.query;
      const tagArray = tags ? (tags as string).split(',') : undefined;

      const prompts = await promptRegistry.list(tagArray);

      const response: APIResponse = {
        success: true,
        data: prompts,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { version } = req.query;

      const prompt = await promptRegistry.get(name, version as string);

      if (!prompt) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Prompt not found',
          },
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        data: prompt,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async renderPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { variables, version } = req.body;

      const rendered = await promptRegistry.render(name, variables, version);

      const response: APIResponse = {
        success: true,
        data: rendered,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { version } = req.query;

      const deleted = await promptRegistry.delete(name, version as string);

      const response: APIResponse = {
        success: deleted,
        data: { deleted },
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getPromptVersions(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const versions = await promptRegistry.getVersions(name);

      const response: APIResponse = {
        success: true,
        data: versions,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getPromptStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = promptRegistry.getStats();

      const response: APIResponse = {
        success: true,
        data: stats,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  // Logging handlers
  private async queryLogs(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query;
      const logs = await logger.getStore().query(query);

      const response: APIResponse = {
        success: true,
        data: logs,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private async getLogStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = logger.getStore().getStats();

      const response: APIResponse = {
        success: true,
        data: stats,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          version: '1.0.0',
        },
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error as Error);
    }
  }

  private handleError(res: Response, error: Error): void {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'REQUEST_ERROR',
        message: error.message,
      },
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        version: '1.0.0',
      },
    };

    res.status(400).json(response);
  }

  private generateRequestId(): string {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.getLogger().info('API server started', {
          port: this.port,
        });
        resolve();
      });
    });
  }

  getApp(): express.Application {
    return this.app;
  }
}
