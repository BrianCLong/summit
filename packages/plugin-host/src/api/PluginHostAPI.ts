import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PluginHostService } from '../PluginHostService.js';
import { Logger } from '../types.js';
import { PluginManifestSchema } from '@summit/plugin-system';

/**
 * REST API for Plugin Host Service
 */
export class PluginHostAPI {
  private app: express.Application;
  private service: PluginHostService;
  private logger: Logger;

  constructor(service: PluginHostService, logger: Logger) {
    this.app = express();
    this.service = service;
    this.logger = logger;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/plugins', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', async (_req: Request, res: Response) => {
      try {
        const health = await this.service.getServiceHealth();
        res.status(health.healthy ? 200 : 503).json(health);
      } catch (error) {
        res.status(500).json({ error: 'Health check failed' });
      }
    });

    // List plugins
    router.get('/plugins', async (req: Request, res: Response) => {
      try {
        const filter = {
          category: req.query.category as string | undefined,
          state: req.query.state as any,
          author: req.query.author as string | undefined,
        };

        const plugins = await this.service.listPlugins(filter);
        res.json({ plugins, total: plugins.length });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get plugin details
    router.get('/plugins/:id', async (req: Request, res: Response) => {
      try {
        const plugin = await this.service.getPlugin(req.params.id);

        if (!plugin) {
          res.status(404).json({ error: 'Plugin not found' });
          return;
        }

        res.json(plugin);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Install plugin
    router.post('/plugins', async (req: Request, res: Response) => {
      try {
        // Validate manifest
        const manifest = PluginManifestSchema.parse(req.body.manifest);
        const source = req.body.source;

        if (!source || !source.type) {
          res.status(400).json({ error: 'Source information required' });
          return;
        }

        const options = {
          userId: req.body.userId,
          tenantId: req.body.tenantId,
          forceInstall: req.body.forceInstall === true,
        };

        await this.service.installPlugin(manifest, source, options);

        res.status(201).json({ message: 'Plugin installed successfully', pluginId: manifest.id });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Uninstall plugin
    router.delete('/plugins/:id', async (req: Request, res: Response) => {
      try {
        await this.service.uninstallPlugin(req.params.id);
        res.json({ message: 'Plugin uninstalled successfully' });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Enable plugin
    router.post('/plugins/:id/enable', async (req: Request, res: Response) => {
      try {
        const options = {
          userId: req.body.userId,
          tenantId: req.body.tenantId,
        };

        await this.service.enablePlugin(req.params.id, options);
        res.json({ message: 'Plugin enabled successfully' });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Disable plugin
    router.post('/plugins/:id/disable', async (req: Request, res: Response) => {
      try {
        await this.service.disablePlugin(req.params.id);
        res.json({ message: 'Plugin disabled successfully' });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Reload plugin
    router.post('/plugins/:id/reload', async (req: Request, res: Response) => {
      try {
        await this.service.reloadPlugin(req.params.id);
        res.json({ message: 'Plugin reloaded successfully' });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Update plugin
    router.put('/plugins/:id', async (req: Request, res: Response) => {
      try {
        const newVersion = req.body.version;

        if (!newVersion) {
          res.status(400).json({ error: 'Version required' });
          return;
        }

        await this.service.updatePlugin(req.params.id, newVersion);
        res.json({ message: 'Plugin updated successfully' });
      } catch (error) {
        this.handleError(error, res);
      }
    });

    // Get plugin health
    router.get('/plugins/:id/health', async (req: Request, res: Response) => {
      try {
        const health = await this.service.getPluginHealth(req.params.id);
        res.status(health.healthy ? 200 : 503).json(health);
      } catch (error) {
        this.handleError(error, res);
      }
    });

    this.app.use('/api', router);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
      this.logger.error('Unhandled error', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: unknown, res: Response): void {
    this.logger.error('API error', { error });

    if (error instanceof Error) {
      // Check for validation errors
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.message });
        return;
      }

      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  }

  /**
   * Start the API server
   */
  async start(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        this.logger.info(`Plugin Host API listening on port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }
}
