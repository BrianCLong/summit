import EventEmitter from 'eventemitter3';
import {
  PluginManager,
  DefaultPluginLoader,
  PluginSandbox,
  DefaultDependencyResolver,
  InMemoryPluginRegistry,
  PluginSecurity,
  QuotaEnforcer,
  CPUTimeTracker,
  AuthorizationProvider,
  OPAAuthorizationProvider,
  DevelopmentAuthorizationProvider,
  PluginManifest,
  PluginMetadata,
  PluginState,
} from '@summit/plugin-system';
import type { Logger } from './types.js';

/**
 * Plugin Host Service - Manages plugin lifecycle at the platform level
 */
export class PluginHostService extends EventEmitter {
  private manager: PluginManager;
  private loader: DefaultPluginLoader;
  private sandbox: PluginSandbox;
  private registry: InMemoryPluginRegistry;
  private resolver: DefaultDependencyResolver;
  private security: PluginSecurity;
  private quotaEnforcer: QuotaEnforcer;
  private cpuTracker: CPUTimeTracker;
  private authProvider: AuthorizationProvider;
  private logger: Logger;
  private config: PluginHostConfig;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: PluginHostConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger;

    // Initialize components
    this.sandbox = new PluginSandbox();
    this.loader = new DefaultPluginLoader(this.sandbox);
    this.registry = new InMemoryPluginRegistry();
    this.resolver = new DefaultDependencyResolver(config.platformVersion);
    this.security = new PluginSecurity();
    this.quotaEnforcer = new QuotaEnforcer();
    this.cpuTracker = new CPUTimeTracker();

    // Initialize authorization provider
    this.authProvider = this.createAuthProvider(config);

    // Create plugin manager
    this.manager = new PluginManager(
      this.loader,
      this.registry,
      this.resolver,
      config.platformVersion
    );

    this.setupEventHandlers();
  }

  /**
   * Start the plugin host service
   */
  async start(): Promise<void> {
    this.logger.info('Starting Plugin Host Service...');

    try {
      // Start health check monitoring
      this.startHealthCheckMonitoring();

      // Load auto-start plugins
      await this.loadAutoStartPlugins();

      this.logger.info('Plugin Host Service started successfully');
      this.emit('started');
    } catch (error) {
      this.logger.error('Failed to start Plugin Host Service', { error });
      throw error;
    }
  }

  /**
   * Stop the plugin host service
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Plugin Host Service...');

    try {
      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Disable all active plugins
      const enabled = this.manager.listEnabled();
      for (const instance of enabled) {
        await this.manager.disable(instance.metadata.manifest.id);
      }

      this.logger.info('Plugin Host Service stopped successfully');
      this.emit('stopped');
    } catch (error) {
      this.logger.error('Failed to stop Plugin Host Service', { error });
      throw error;
    }
  }

  /**
   * Install a plugin
   */
  async installPlugin(
    manifest: PluginManifest,
    source: PluginSource,
    options?: InstallOptions
  ): Promise<void> {
    this.logger.info(`Installing plugin: ${manifest.id}`, { version: manifest.version });

    try {
      // Security scan if enabled
      if (this.config.security.scanOnInstall && source.path) {
        const scanResult = await this.security.scanPlugin(source.path, manifest);
        if (!scanResult.safe) {
          const criticalVulns = scanResult.vulnerabilities.filter(
            v => v.severity === 'critical'
          );
          throw new Error(
            `Plugin ${manifest.id} failed security scan: ${criticalVulns.map(v => v.message).join(', ')}`
          );
        }
      }

      // Check authorization
      const authContext = {
        environment: this.config.environment,
        userId: options?.userId,
        tenantId: options?.tenantId,
      };

      const permissionsAllowed = await this.authProvider.checkManifestPermissions(
        manifest,
        authContext
      );

      if (!permissionsAllowed && !options?.forceInstall) {
        throw new Error(
          `Plugin ${manifest.id} permissions not authorized. Use forceInstall option to bypass.`
        );
      }

      // Register plugin path with loader
      if (source.path) {
        this.loader.registerPath(manifest.id, source.path);
      }

      // Install via manager
      await this.manager.install(manifest, { type: source.type, location: source.path || '' });

      // Set resource quota
      const quota = this.security.enforceResourceQuota(manifest);
      this.quotaEnforcer.setQuota(manifest.id, quota);

      this.logger.info(`Plugin ${manifest.id} installed successfully`);
      this.emit('plugin:installed', { pluginId: manifest.id, version: manifest.version });
    } catch (error) {
      this.logger.error(`Failed to install plugin ${manifest.id}`, { error });
      throw error;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    this.logger.info(`Uninstalling plugin: ${pluginId}`);

    try {
      await this.manager.uninstall(pluginId);
      this.quotaEnforcer.cleanup(pluginId);
      this.cpuTracker.reset(pluginId);

      this.logger.info(`Plugin ${pluginId} uninstalled successfully`);
      this.emit('plugin:uninstalled', { pluginId });
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string, options?: EnableOptions): Promise<void> {
    this.logger.info(`Enabling plugin: ${pluginId}`);

    try {
      // Check authorization
      if (options?.userId) {
        const metadata = await this.registry.get(pluginId);
        if (metadata) {
          const authContext = {
            environment: this.config.environment,
            userId: options.userId,
            tenantId: options.tenantId,
          };

          const allowed = await this.authProvider.checkManifestPermissions(
            metadata.manifest,
            authContext
          );

          if (!allowed) {
            throw new Error(`Not authorized to enable plugin ${pluginId}`);
          }
        }
      }

      await this.manager.enable(pluginId);

      this.logger.info(`Plugin ${pluginId} enabled successfully`);
      this.emit('plugin:enabled', { pluginId });
    } catch (error) {
      this.logger.error(`Failed to enable plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    this.logger.info(`Disabling plugin: ${pluginId}`);

    try {
      await this.manager.disable(pluginId);

      this.logger.info(`Plugin ${pluginId} disabled successfully`);
      this.emit('plugin:disabled', { pluginId });
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * Update a plugin
   */
  async updatePlugin(pluginId: string, newVersion: string): Promise<void> {
    this.logger.info(`Updating plugin ${pluginId} to version ${newVersion}`);

    try {
      await this.manager.update(pluginId, newVersion);

      this.logger.info(`Plugin ${pluginId} updated to ${newVersion}`);
      this.emit('plugin:updated', { pluginId, version: newVersion });
    } catch (error) {
      this.logger.error(`Failed to update plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * Reload a plugin (hot reload)
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    this.logger.info(`Reloading plugin: ${pluginId}`);

    try {
      await this.manager.reload(pluginId);

      this.logger.info(`Plugin ${pluginId} reloaded successfully`);
      this.emit('plugin:reloaded', { pluginId });
    } catch (error) {
      this.logger.error(`Failed to reload plugin ${pluginId}`, { error });
      throw error;
    }
  }

  /**
   * List all installed plugins
   */
  async listPlugins(filter?: PluginFilter): Promise<PluginMetadata[]> {
    return this.registry.list(filter);
  }

  /**
   * Get plugin details
   */
  async getPlugin(pluginId: string): Promise<PluginMetadata | null> {
    return this.registry.get(pluginId);
  }

  /**
   * Get plugin health status
   */
  async getPluginHealth(pluginId: string): Promise<PluginHealthStatus> {
    try {
      const health = await this.manager.checkHealth(pluginId);
      const quota = this.quotaEnforcer.getQuota(pluginId);
      const usage = this.quotaEnforcer.getUsage(pluginId);
      const violations = this.quotaEnforcer.getViolations(pluginId);

      return {
        pluginId,
        healthy: health.healthy && violations.length === 0,
        message: health.message,
        details: health.details,
        resources: {
          quota,
          usage,
          violations,
        },
      };
    } catch (error) {
      return {
        pluginId,
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get overall service health
   */
  async getServiceHealth(): Promise<ServiceHealthStatus> {
    const installed = await this.listPlugins();
    const enabled = this.manager.listEnabled();
    const pluginsWithViolations = this.quotaEnforcer.getPluginsWithViolations();

    return {
      healthy: pluginsWithViolations.length === 0,
      totalPlugins: installed.length,
      enabledPlugins: enabled.length,
      pluginsWithViolations: pluginsWithViolations.length,
      uptime: process.uptime(),
    };
  }

  /**
   * Create authorization provider based on config
   */
  private createAuthProvider(config: PluginHostConfig): AuthorizationProvider {
    if (config.environment === 'development') {
      this.logger.warn('Using development authorization provider - all permissions allowed');
      return new DevelopmentAuthorizationProvider();
    }

    if (config.authorization.provider === 'opa') {
      return new OPAAuthorizationProvider(
        config.authorization.opaEndpoint,
        config.authorization.policyPath
      );
    }

    // Default to development mode
    return new DevelopmentAuthorizationProvider();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.manager.on('plugin:installed', (event: any) => {
      this.logger.info('Plugin installed event', event);
      this.emit('plugin:installed', event);
    });

    this.manager.on('plugin:enabled', (event: any) => {
      this.logger.info('Plugin enabled event', event);
      this.emit('plugin:enabled', event);
    });

    this.manager.on('plugin:disabled', (event: any) => {
      this.logger.info('Plugin disabled event', event);
      this.emit('plugin:disabled', event);
    });

    this.manager.on('plugin:updated', (event: any) => {
      this.logger.info('Plugin updated event', event);
      this.emit('plugin:updated', event);
    });

    this.manager.on('plugin:reloaded', (event: any) => {
      this.logger.info('Plugin reloaded event', event);
      this.emit('plugin:reloaded', event);
    });
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    const interval = this.config.monitoring.healthCheckIntervalMs;

    this.healthCheckInterval = setInterval(async () => {
      const enabled = this.manager.listEnabled();

      for (const instance of enabled) {
        const pluginId = instance.metadata.manifest.id;

        try {
          const health = await this.manager.checkHealth(pluginId);
          if (!health.healthy) {
            this.logger.warn(`Plugin ${pluginId} health check failed`, health);
            this.emit('plugin:unhealthy', { pluginId, health });
          }

          // Update resource usage
          const resourceUsage = await this.sandbox.getResourceUsage(pluginId);
          if (resourceUsage) {
            this.quotaEnforcer.updateUsage(pluginId, {
              memoryUsedMB: resourceUsage.memoryUsedMB,
              cpuTimeMs: this.cpuTracker.getTotalTime(pluginId),
              storageUsedMB: 0, // Would track actual storage
              networkUsedMbps: 0, // Would track actual network
            });
          }

          // Check for quota violations
          const violations = this.quotaEnforcer.getViolations(pluginId);
          if (violations.length > 0) {
            this.logger.warn(`Plugin ${pluginId} quota violations`, { violations });
            this.emit('plugin:quota-violation', { pluginId, violations });

            // Auto-disable on critical violations if configured
            const critical = violations.some(v => v.severity === 'critical');
            if (critical && this.config.monitoring.autoDisableOnViolation) {
              this.logger.error(`Auto-disabling plugin ${pluginId} due to critical violations`);
              await this.manager.disable(pluginId);
            }
          }
        } catch (error) {
          this.logger.error(`Health check failed for plugin ${pluginId}`, { error });
        }
      }
    }, interval);
  }

  /**
   * Load auto-start plugins
   */
  private async loadAutoStartPlugins(): Promise<void> {
    if (!this.config.autoStart?.enabled) {
      return;
    }

    const plugins = this.config.autoStart.plugins || [];
    this.logger.info(`Loading ${plugins.length} auto-start plugins`);

    for (const pluginId of plugins) {
      try {
        const metadata = await this.registry.get(pluginId);
        if (metadata && metadata.state === PluginState.UNLOADED) {
          await this.manager.enable(pluginId);
          this.logger.info(`Auto-started plugin: ${pluginId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to auto-start plugin ${pluginId}`, { error });
      }
    }
  }
}

export interface PluginHostConfig {
  platformVersion: string;
  environment: 'development' | 'staging' | 'production';
  security: {
    scanOnInstall: boolean;
    requireSignature: boolean;
  };
  authorization: {
    provider: 'opa' | 'development';
    opaEndpoint?: string;
    policyPath?: string;
  };
  monitoring: {
    healthCheckIntervalMs: number;
    autoDisableOnViolation: boolean;
  };
  autoStart?: {
    enabled: boolean;
    plugins?: string[];
  };
}

export interface PluginSource {
  type: 'npm' | 'git' | 'local' | 'marketplace';
  path?: string;
  url?: string;
}

export interface InstallOptions {
  userId?: string;
  tenantId?: string;
  forceInstall?: boolean;
}

export interface EnableOptions {
  userId?: string;
  tenantId?: string;
}

export interface PluginFilter {
  category?: string;
  state?: PluginState;
  author?: string;
  tags?: string[];
  minRating?: number;
}

export interface PluginHealthStatus {
  pluginId: string;
  healthy: boolean;
  message?: string;
  details?: Record<string, any>;
  resources?: {
    quota?: any;
    usage?: any;
    violations?: any[];
  };
}

export interface ServiceHealthStatus {
  healthy: boolean;
  totalPlugins: number;
  enabledPlugins: number;
  pluginsWithViolations: number;
  uptime: number;
}
