/**
 * Documentation Microsite Federation & Management Engine
 * Advanced Microsite Architecture and Multi-Tenant Management
 * Phase 48: Microsite Federation Platform
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface MicrositeConfig {
  federation: FederationConfig;
  templates: TemplateConfig;
  deployment: DeploymentConfig;
  routing: RoutingConfig;
  themes: ThemeConfig;
  plugins: PluginConfig;
  analytics: AnalyticsConfig;
  cdn: CDNConfig;
}

export interface FederationConfig {
  enabled: boolean;
  registry: RegistryConfig;
  discovery: DiscoveryConfig;
  synchronization: SyncConfig;
  governance: GovernanceConfig;
  isolation: IsolationConfig;
}

export interface Microsite {
  id: string;
  name: string;
  description: string;
  owner: string;
  team: string;
  domain: string;
  subdomain?: string;
  path?: string;
  template: string;
  theme: string;
  version: string;
  status: MicrositeStatus;
  configuration: MicrositeConfiguration;
  content: ContentConfiguration;
  deployment: MicrositeDeployment;
  metadata: MicrositeMetadata;
}

export interface MicrositeTemplate {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'documentation' | 'api' | 'blog' | 'landing' | 'portal' | 'custom';
  structure: TemplateStructure;
  components: TemplateComponent[];
  assets: TemplateAsset[];
  configuration: TemplateConfiguration;
  dependencies: TemplateDependency[];
}

export interface MicrositeTheme {
  id: string;
  name: string;
  version: string;
  description: string;
  styles: ThemeStyles;
  layout: ThemeLayout;
  components: ThemeComponents;
  customization: ThemeCustomization;
  compatibility: string[];
}

export class MicrositeEngineCore extends EventEmitter {
  private config: MicrositeConfig;
  private microsites: Map<string, Microsite> = new Map();
  private templates: Map<string, MicrositeTemplate> = new Map();
  private themes: Map<string, MicrositeTheme> = new Map();
  private federationRegistry: FederationRegistry;
  private deploymentQueue: DeploymentTask[] = [];

  constructor(config: MicrositeConfig) {
    super();
    this.config = config;
    this.federationRegistry = new FederationRegistry(
      config.federation.registry,
    );
    this.initializeMicrositeEngine();
  }

  /**
   * Initialize microsite federation engine
   */
  private async initializeMicrositeEngine(): Promise<void> {
    await this.loadTemplates();
    await this.loadThemes();
    await this.initializeFederation();
    await this.setupRouting();
    await this.startDeploymentWorker();
    await this.enableAnalytics();
    this.emit('engine:initialized');
  }

  /**
   * Create new microsite
   */
  async createMicrosite(config: CreateMicrositeRequest): Promise<Microsite> {
    const micrositeId = this.generateMicrositeId(config.name);

    // Validate template exists
    const template = this.templates.get(config.templateId);
    if (!template) {
      throw new Error(`Template ${config.templateId} not found`);
    }

    // Validate theme exists
    const theme = this.themes.get(config.themeId);
    if (!theme) {
      throw new Error(`Theme ${config.themeId} not found`);
    }

    // Generate microsite configuration
    const microsite: Microsite = {
      id: micrositeId,
      name: config.name,
      description: config.description,
      owner: config.owner,
      team: config.team,
      domain: config.domain || this.generateDomain(config.name),
      subdomain: config.subdomain,
      path: config.path,
      template: config.templateId,
      theme: config.themeId,
      version: '1.0.0',
      status: 'creating',
      configuration: await this.generateMicrositeConfiguration(
        config,
        template,
        theme,
      ),
      content: await this.initializeContent(config, template),
      deployment: {
        status: 'pending',
        environments: [],
        history: [],
      },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
        tags: config.tags || [],
        customData: config.customData || {},
      },
    };

    this.microsites.set(micrositeId, microsite);

    // Register with federation if enabled
    if (this.config.federation.enabled) {
      await this.federationRegistry.registerMicrosite(microsite);
    }

    // Queue deployment
    await this.queueDeployment(microsite);

    this.emit('microsite:created', { micrositeId, name: config.name });
    return microsite;
  }

  /**
   * Deploy microsite to specified environment
   */
  async deployMicrosite(
    micrositeId: string,
    environment: string,
    options?: DeploymentOptions,
  ): Promise<DeploymentResult> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    const deploymentId = this.generateDeploymentId();
    const deployment: MicrositeDeploymentTask = {
      id: deploymentId,
      micrositeId,
      environment,
      options: options || {},
      status: 'queued',
      startTime: new Date(),
      steps: [],
    };

    this.emit('deployment:started', { deploymentId, micrositeId, environment });

    try {
      // Build microsite
      const buildResult = await this.buildMicrosite(microsite);
      deployment.steps.push({
        name: 'build',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        result: buildResult,
      });

      // Deploy static assets to CDN
      const cdnResult = await this.deployCDNAssets(microsite, buildResult);
      deployment.steps.push({
        name: 'cdn-deploy',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        result: cdnResult,
      });

      // Configure routing
      const routingResult = await this.configureRouting(microsite, environment);
      deployment.steps.push({
        name: 'routing',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        result: routingResult,
      });

      // Update DNS
      const dnsResult = await this.updateDNS(microsite, environment);
      deployment.steps.push({
        name: 'dns',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        result: dnsResult,
      });

      // Verify deployment
      const verificationResult = await this.verifyDeployment(
        microsite,
        environment,
      );
      deployment.steps.push({
        name: 'verification',
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        result: verificationResult,
      });

      deployment.status = 'completed';
      deployment.endTime = new Date();

      // Update microsite deployment status
      microsite.deployment.status = 'deployed';
      microsite.deployment.environments.push({
        name: environment,
        url: routingResult.url,
        deployedAt: new Date(),
        version: microsite.version,
      });

      microsite.deployment.history.push({
        deploymentId,
        environment,
        version: microsite.version,
        deployedAt: new Date(),
        deployedBy: options?.deployedBy || 'system',
        status: 'success',
      });

      this.emit('deployment:completed', {
        deploymentId,
        micrositeId,
        environment,
        url: routingResult.url,
      });

      return {
        deploymentId,
        status: 'success',
        url: routingResult.url,
        environment,
        deployedAt: deployment.endTime,
        steps: deployment.steps,
      };
    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = new Date();
      deployment.error = error.message;

      microsite.deployment.history.push({
        deploymentId,
        environment,
        version: microsite.version,
        deployedAt: new Date(),
        deployedBy: options?.deployedBy || 'system',
        status: 'failed',
        error: error.message,
      });

      this.emit('deployment:failed', {
        deploymentId,
        micrositeId,
        environment,
        error,
      });
      throw error;
    }
  }

  /**
   * Update microsite content
   */
  async updateMicrositeContent(
    micrositeId: string,
    contentUpdate: ContentUpdate,
  ): Promise<void> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    // Apply content updates
    if (contentUpdate.pages) {
      for (const [pageId, pageContent] of Object.entries(contentUpdate.pages)) {
        microsite.content.pages[pageId] = {
          ...microsite.content.pages[pageId],
          ...pageContent,
          lastModified: new Date(),
        };
      }
    }

    if (contentUpdate.navigation) {
      microsite.content.navigation = {
        ...microsite.content.navigation,
        ...contentUpdate.navigation,
      };
    }

    if (contentUpdate.assets) {
      microsite.content.assets = {
        ...microsite.content.assets,
        ...contentUpdate.assets,
      };
    }

    // Update metadata
    microsite.metadata.lastModified = new Date();
    microsite.version = this.incrementVersion(microsite.version);

    // Sync with federation if enabled
    if (this.config.federation.enabled) {
      await this.federationRegistry.updateMicrosite(microsite);
    }

    this.emit('content:updated', { micrositeId, version: microsite.version });
  }

  /**
   * Manage microsite themes
   */
  async applyTheme(
    micrositeId: string,
    themeId: string,
    customization?: ThemeCustomization,
  ): Promise<void> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }

    // Apply theme
    microsite.theme = themeId;
    microsite.configuration.theme = {
      id: themeId,
      customization: customization || {},
      appliedAt: new Date(),
    };

    // Update metadata
    microsite.metadata.lastModified = new Date();
    microsite.version = this.incrementVersion(microsite.version);

    this.emit('theme:applied', { micrositeId, themeId });
  }

  /**
   * Federation discovery and synchronization
   */
  async discoverMicrosites(): Promise<FederatedMicrosite[]> {
    if (!this.config.federation.enabled) {
      return [];
    }

    return await this.federationRegistry.discoverMicrosites();
  }

  /**
   * Sync with federated microsites
   */
  async syncFederation(): Promise<FederationSyncResult> {
    if (!this.config.federation.enabled) {
      return { synced: 0, errors: 0, results: [] };
    }

    const syncResults: SyncResult[] = [];
    const discoveredMicrosites = await this.discoverMicrosites();

    for (const federated of discoveredMicrosites) {
      try {
        const result = await this.syncFederatedMicrosite(federated);
        syncResults.push(result);
      } catch (error) {
        syncResults.push({
          micrositeId: federated.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    const syncResult: FederationSyncResult = {
      synced: syncResults.filter((r) => r.status === 'success').length,
      errors: syncResults.filter((r) => r.status === 'error').length,
      results: syncResults,
    };

    this.emit('federation:synced', syncResult);
    return syncResult;
  }

  /**
   * Get microsite analytics
   */
  async getMicrositeAnalytics(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<MicrositeAnalytics> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    const analytics: MicrositeAnalytics = {
      micrositeId,
      period: period || 'last30days',
      metrics: {
        pageViews: await this.getPageViews(micrositeId, period),
        uniqueVisitors: await this.getUniqueVisitors(micrositeId, period),
        bounceRate: await this.getBounceRate(micrositeId, period),
        avgSessionDuration: await this.getAvgSessionDuration(
          micrositeId,
          period,
        ),
        topPages: await this.getTopPages(micrositeId, period),
        searchQueries: await this.getSearchQueries(micrositeId, period),
        userFlow: await this.getUserFlow(micrositeId, period),
        performance: await this.getPerformanceMetrics(micrositeId, period),
      },
      trends: await this.getTrends(micrositeId, period),
      comparisons: await this.getComparisons(micrositeId, period),
    };

    return analytics;
  }

  /**
   * Generate microsite sitemap
   */
  async generateSitemap(micrositeId: string): Promise<MicrositeSitemap> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    const sitemap: MicrositeSitemap = {
      micrositeId,
      lastModified: new Date(),
      urls: [],
    };

    // Add pages to sitemap
    for (const [pageId, page] of Object.entries(microsite.content.pages)) {
      sitemap.urls.push({
        url: this.buildPageUrl(microsite, pageId),
        lastModified: page.lastModified,
        changeFrequency: this.getChangeFrequency(page),
        priority: this.getPagePriority(page),
      });
    }

    // Sort by priority
    sitemap.urls.sort((a, b) => b.priority - a.priority);

    return sitemap;
  }

  /**
   * Export microsite
   */
  async exportMicrosite(
    micrositeId: string,
    format: ExportFormat,
  ): Promise<ExportResult> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    const exportId = this.generateExportId();
    const exportPath = path.join(
      process.cwd(),
      'exports',
      `${micrositeId}-${exportId}`,
    );

    // Create export directory
    fs.mkdirSync(exportPath, { recursive: true });

    let result: ExportResult;

    switch (format.type) {
      case 'static':
        result = await this.exportAsStatic(microsite, exportPath, format);
        break;
      case 'archive':
        result = await this.exportAsArchive(microsite, exportPath, format);
        break;
      case 'docker':
        result = await this.exportAsDocker(microsite, exportPath, format);
        break;
      default:
        throw new Error(`Unsupported export format: ${format.type}`);
    }

    this.emit('export:completed', {
      micrositeId,
      exportId,
      format: format.type,
    });
    return result;
  }

  /**
   * Clone microsite
   */
  async cloneMicrosite(
    sourceMicrositeId: string,
    config: CloneMicrositeRequest,
  ): Promise<Microsite> {
    const sourceMicrosite = this.microsites.get(sourceMicrositeId);
    if (!sourceMicrosite) {
      throw new Error(`Source microsite ${sourceMicrositeId} not found`);
    }

    const clonedMicrosite: Microsite = {
      ...sourceMicrosite,
      id: this.generateMicrositeId(config.name),
      name: config.name,
      description: config.description || sourceMicrosite.description,
      owner: config.owner,
      team: config.team || sourceMicrosite.team,
      domain: config.domain || this.generateDomain(config.name),
      subdomain: config.subdomain,
      path: config.path,
      version: '1.0.0',
      status: 'creating',
      deployment: {
        status: 'pending',
        environments: [],
        history: [],
      },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
        tags: config.tags || sourceMicrosite.metadata.tags,
        customData: config.customData || sourceMicrosite.metadata.customData,
        clonedFrom: sourceMicrositeId,
      },
    };

    this.microsites.set(clonedMicrosite.id, clonedMicrosite);

    this.emit('microsite:cloned', {
      sourceMicrositeId,
      clonedMicrositeId: clonedMicrosite.id,
      name: config.name,
    });

    return clonedMicrosite;
  }

  /**
   * Delete microsite
   */
  async deleteMicrosite(
    micrositeId: string,
    options?: DeleteOptions,
  ): Promise<void> {
    const microsite = this.microsites.get(micrositeId);
    if (!microsite) {
      throw new Error(`Microsite ${micrositeId} not found`);
    }

    // Soft delete by default
    if (!options?.permanent) {
      microsite.status = 'deleted';
      microsite.metadata.deletedAt = new Date();
      microsite.metadata.deletedBy = options?.deletedBy || 'system';
    } else {
      // Cleanup deployments
      for (const env of microsite.deployment.environments) {
        await this.cleanupDeployment(microsite, env.name);
      }

      // Remove from federation
      if (this.config.federation.enabled) {
        await this.federationRegistry.unregisterMicrosite(micrositeId);
      }

      // Remove from local registry
      this.microsites.delete(micrositeId);
    }

    this.emit('microsite:deleted', {
      micrositeId,
      permanent: options?.permanent,
    });
  }

  // Private utility methods
  private async loadTemplates(): Promise<void> {
    for (const template of this.config.templates.available) {
      this.templates.set(template.id, template);
    }
    this.emit('templates:loaded', { count: this.templates.size });
  }

  private async loadThemes(): Promise<void> {
    for (const theme of this.config.themes.available) {
      this.themes.set(theme.id, theme);
    }
    this.emit('themes:loaded', { count: this.themes.size });
  }

  private async initializeFederation(): Promise<void> {
    if (this.config.federation.enabled) {
      await this.federationRegistry.initialize();
      this.emit('federation:initialized');
    }
  }

  private async setupRouting(): Promise<void> {
    // Initialize routing system
    this.emit('routing:initialized');
  }

  private async startDeploymentWorker(): Promise<void> {
    // Start background worker for processing deployments
    setInterval(() => {
      this.processDeploymentQueue();
    }, 5000);
  }

  private async enableAnalytics(): Promise<void> {
    if (this.config.analytics.enabled) {
      // Initialize analytics collection
      this.emit('analytics:enabled');
    }
  }

  private generateMicrositeId(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${sanitized}-${Date.now()}`;
  }

  private generateDomain(name: string): string {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${sanitized}.docs.example.com`;
  }

  private generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExportId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async generateMicrositeConfiguration(
    config: CreateMicrositeRequest,
    template: MicrositeTemplate,
    theme: MicrositeTheme,
  ): Promise<MicrositeConfiguration> {
    return {
      template: {
        id: template.id,
        version: template.version,
        configuration: template.configuration,
      },
      theme: {
        id: theme.id,
        customization: config.themeCustomization || {},
        appliedAt: new Date(),
      },
      features: config.features || {},
      plugins: config.plugins || [],
      seo: config.seo || {},
      analytics: config.analytics || {},
      performance: config.performance || {},
    };
  }

  private async initializeContent(
    config: CreateMicrositeRequest,
    template: MicrositeTemplate,
  ): Promise<ContentConfiguration> {
    return {
      pages: this.generateInitialPages(template),
      navigation: this.generateInitialNavigation(template),
      assets: {},
      metadata: {
        title: config.name,
        description: config.description,
        keywords: config.tags || [],
        author: config.owner,
      },
    };
  }

  private generateInitialPages(
    template: MicrositeTemplate,
  ): Record<string, PageContent> {
    const pages: Record<string, PageContent> = {};

    for (const component of template.components) {
      if (component.type === 'page') {
        pages[component.id] = {
          id: component.id,
          title: component.title,
          content: component.content || '',
          layout: component.layout || 'default',
          metadata: component.metadata || {},
          lastModified: new Date(),
        };
      }
    }

    return pages;
  }

  private generateInitialNavigation(
    template: MicrositeTemplate,
  ): NavigationConfiguration {
    return {
      primary: template.structure.navigation?.primary || [],
      secondary: template.structure.navigation?.secondary || [],
      footer: template.structure.navigation?.footer || [],
      breadcrumbs: template.structure.navigation?.breadcrumbs || false,
    };
  }

  // Placeholder methods for deployment steps (would be fully implemented)
  private async buildMicrosite(microsite: Microsite): Promise<BuildResult> {
    return { outputPath: '/tmp/build', assets: [], size: 1024 };
  }

  private async deployCDNAssets(
    microsite: Microsite,
    buildResult: BuildResult,
  ): Promise<CDNResult> {
    return { urls: [], totalSize: buildResult.size };
  }

  private async configureRouting(
    microsite: Microsite,
    environment: string,
  ): Promise<RoutingResult> {
    return { url: `https://${microsite.domain}` };
  }

  private async updateDNS(
    microsite: Microsite,
    environment: string,
  ): Promise<DNSResult> {
    return { records: [], propagated: true };
  }

  private async verifyDeployment(
    microsite: Microsite,
    environment: string,
  ): Promise<VerificationResult> {
    return { healthy: true, checks: [] };
  }

  // Placeholder analytics methods
  private async getPageViews(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<number> {
    return 1000;
  }

  private async getUniqueVisitors(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<number> {
    return 500;
  }

  private async getBounceRate(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<number> {
    return 0.3;
  }

  private async getAvgSessionDuration(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<number> {
    return 300;
  }

  private async getTopPages(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<PageMetric[]> {
    return [];
  }

  private async getSearchQueries(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<SearchMetric[]> {
    return [];
  }

  private async getUserFlow(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<UserFlowMetric[]> {
    return [];
  }

  private async getPerformanceMetrics(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<PerformanceMetric[]> {
    return [];
  }

  private async getTrends(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<TrendMetric[]> {
    return [];
  }

  private async getComparisons(
    micrositeId: string,
    period?: AnalyticsPeriod,
  ): Promise<ComparisonMetric[]> {
    return [];
  }
}

// Federation Registry implementation
class FederationRegistry {
  constructor(private config: RegistryConfig) {}

  async initialize(): Promise<void> {
    // Initialize federation registry
  }

  async registerMicrosite(microsite: Microsite): Promise<void> {
    // Register microsite with federation
  }

  async updateMicrosite(microsite: Microsite): Promise<void> {
    // Update microsite in federation
  }

  async unregisterMicrosite(micrositeId: string): Promise<void> {
    // Remove microsite from federation
  }

  async discoverMicrosites(): Promise<FederatedMicrosite[]> {
    // Discover federated microsites
    return [];
  }
}

// Type definitions
export type MicrositeStatus =
  | 'creating'
  | 'active'
  | 'inactive'
  | 'deploying'
  | 'failed'
  | 'deleted';
export type AnalyticsPeriod =
  | 'last24hours'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'lastyear';

export interface CreateMicrositeRequest {
  name: string;
  description: string;
  owner: string;
  team: string;
  templateId: string;
  themeId: string;
  domain?: string;
  subdomain?: string;
  path?: string;
  features?: Record<string, any>;
  plugins?: string[];
  themeCustomization?: ThemeCustomization;
  seo?: SEOConfiguration;
  analytics?: AnalyticsConfiguration;
  performance?: PerformanceConfiguration;
  tags?: string[];
  customData?: Record<string, any>;
}

export interface MicrositeConfiguration {
  template: {
    id: string;
    version: string;
    configuration: TemplateConfiguration;
  };
  theme: {
    id: string;
    customization: ThemeCustomization;
    appliedAt: Date;
  };
  features: Record<string, any>;
  plugins: string[];
  seo: SEOConfiguration;
  analytics: AnalyticsConfiguration;
  performance: PerformanceConfiguration;
}

export interface ContentConfiguration {
  pages: Record<string, PageContent>;
  navigation: NavigationConfiguration;
  assets: Record<string, AssetMetadata>;
  metadata: ContentMetadata;
}

export interface PageContent {
  id: string;
  title: string;
  content: string;
  layout: string;
  metadata: Record<string, any>;
  lastModified: Date;
}

export interface NavigationConfiguration {
  primary: NavigationItem[];
  secondary: NavigationItem[];
  footer: NavigationItem[];
  breadcrumbs: boolean;
}

export interface NavigationItem {
  label: string;
  url: string;
  children?: NavigationItem[];
  metadata?: Record<string, any>;
}

export interface MicrositeDeployment {
  status: 'pending' | 'deploying' | 'deployed' | 'failed';
  environments: DeploymentEnvironment[];
  history: DeploymentHistory[];
}

export interface DeploymentEnvironment {
  name: string;
  url: string;
  deployedAt: Date;
  version: string;
}

export interface DeploymentHistory {
  deploymentId: string;
  environment: string;
  version: string;
  deployedAt: Date;
  deployedBy: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface MicrositeMetadata {
  createdAt: Date;
  lastModified: Date;
  tags: string[];
  customData: Record<string, any>;
  deletedAt?: Date;
  deletedBy?: string;
  clonedFrom?: string;
}

export interface TemplateStructure {
  layout: string;
  components: string[];
  navigation?: {
    primary?: NavigationItem[];
    secondary?: NavigationItem[];
    footer?: NavigationItem[];
    breadcrumbs?: boolean;
  };
  pages: TemplatePage[];
}

export interface TemplatePage {
  id: string;
  title: string;
  layout: string;
  components: string[];
}

export interface TemplateComponent {
  id: string;
  name: string;
  type: string;
  title: string;
  content?: string;
  layout?: string;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface TemplateAsset {
  id: string;
  name: string;
  type: string;
  path: string;
  size: number;
}

export interface TemplateConfiguration {
  defaults: Record<string, any>;
  customizable: string[];
  required: string[];
}

export interface TemplateDependency {
  name: string;
  version: string;
  type: 'npm' | 'cdn' | 'local';
  required: boolean;
}

export interface ThemeStyles {
  css: string;
  variables: Record<string, string>;
  fonts: ThemeFont[];
  colors: ThemeColorPalette;
}

export interface ThemeLayout {
  grid: GridConfiguration;
  spacing: SpacingConfiguration;
  breakpoints: BreakpointConfiguration;
}

export interface ThemeComponents {
  overrides: Record<string, ComponentOverride>;
  variants: Record<string, ComponentVariant>;
}

export interface ThemeCustomization {
  colors?: Partial<ThemeColorPalette>;
  fonts?: ThemeFont[];
  spacing?: Partial<SpacingConfiguration>;
  custom?: Record<string, any>;
}

// Supporting interfaces
export interface RegistryConfig {
  url: string;
  authentication: any;
  discovery: any;
}

export interface DiscoveryConfig {
  enabled: boolean;
  interval: number;
  sources: string[];
}

export interface SyncConfig {
  enabled: boolean;
  interval: number;
  conflicts: 'overwrite' | 'merge' | 'skip';
}

export interface GovernanceConfig {
  policies: string[];
  approvals: boolean;
  auditing: boolean;
}

export interface IsolationConfig {
  tenants: boolean;
  resources: boolean;
  data: boolean;
}

export interface TemplateConfig {
  available: MicrositeTemplate[];
  repository: string;
  cache: boolean;
}

export interface DeploymentConfig {
  providers: string[];
  environments: string[];
  automation: boolean;
}

export interface RoutingConfig {
  strategy: 'subdomain' | 'path' | 'domain';
  ssl: boolean;
  cdn: boolean;
}

export interface ThemeConfig {
  available: MicrositeTheme[];
  repository: string;
  customization: boolean;
}

export interface PluginConfig {
  available: string[];
  repository: string;
  installation: 'automatic' | 'manual';
}

export interface AnalyticsConfig {
  enabled: boolean;
  provider: string;
  tracking: string[];
}

export interface CDNConfig {
  enabled: boolean;
  provider: string;
  regions: string[];
}

export interface DeploymentOptions {
  deployedBy?: string;
  notes?: string;
  rollback?: boolean;
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'success' | 'failed';
  url?: string;
  environment: string;
  deployedAt: Date;
  steps: DeploymentStep[];
}

export interface DeploymentStep {
  name: string;
  status: 'completed' | 'failed';
  startTime: Date;
  endTime: Date;
  result: any;
}

export interface MicrositeDeploymentTask {
  id: string;
  micrositeId: string;
  environment: string;
  options: DeploymentOptions;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  steps: DeploymentStep[];
  error?: string;
}

export interface ContentUpdate {
  pages?: Record<string, Partial<PageContent>>;
  navigation?: Partial<NavigationConfiguration>;
  assets?: Record<string, AssetMetadata>;
  metadata?: Partial<ContentMetadata>;
}

export interface FederatedMicrosite {
  id: string;
  name: string;
  owner: string;
  url: string;
  lastModified: Date;
  metadata: Record<string, any>;
}

export interface FederationSyncResult {
  synced: number;
  errors: number;
  results: SyncResult[];
}

export interface SyncResult {
  micrositeId: string;
  status: 'success' | 'error';
  error?: string;
}

export interface MicrositeAnalytics {
  micrositeId: string;
  period: AnalyticsPeriod;
  metrics: {
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
    avgSessionDuration: number;
    topPages: PageMetric[];
    searchQueries: SearchMetric[];
    userFlow: UserFlowMetric[];
    performance: PerformanceMetric[];
  };
  trends: TrendMetric[];
  comparisons: ComparisonMetric[];
}

export interface MicrositeSitemap {
  micrositeId: string;
  lastModified: Date;
  urls: SitemapUrl[];
}

export interface SitemapUrl {
  url: string;
  lastModified: Date;
  changeFrequency: string;
  priority: number;
}

export interface ExportFormat {
  type: 'static' | 'archive' | 'docker';
  options?: Record<string, any>;
}

export interface ExportResult {
  exportId: string;
  format: string;
  path: string;
  size: number;
  downloadUrl?: string;
}

export interface CloneMicrositeRequest {
  name: string;
  description?: string;
  owner: string;
  team?: string;
  domain?: string;
  subdomain?: string;
  path?: string;
  tags?: string[];
  customData?: Record<string, any>;
}

export interface DeleteOptions {
  permanent?: boolean;
  deletedBy?: string;
}

export interface DeploymentTask {
  id: string;
  micrositeId: string;
  priority: number;
  scheduledAt: Date;
}

// Additional supporting interfaces
export interface AssetMetadata {
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface ContentMetadata {
  title: string;
  description: string;
  keywords: string[];
  author: string;
}

export interface SEOConfiguration {
  title?: string;
  description?: string;
  keywords?: string[];
  robots?: string;
  canonical?: string;
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
}

export interface AnalyticsConfiguration {
  provider?: string;
  trackingId?: string;
  events?: string[];
  customDimensions?: Record<string, string>;
}

export interface PerformanceConfiguration {
  optimization?: boolean;
  compression?: boolean;
  caching?: CachingConfiguration;
  cdn?: boolean;
}

export interface CachingConfiguration {
  enabled: boolean;
  ttl: number;
  strategy: string;
}

export interface ThemeFont {
  name: string;
  url: string;
  weights: number[];
  styles: string[];
}

export interface ThemeColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  warning: string;
  success: string;
}

export interface GridConfiguration {
  columns: number;
  gutter: string;
  maxWidth: string;
}

export interface SpacingConfiguration {
  base: string;
  scale: number;
  units: string[];
}

export interface BreakpointConfiguration {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ComponentOverride {
  styles: Record<string, any>;
  props: Record<string, any>;
}

export interface ComponentVariant {
  name: string;
  styles: Record<string, any>;
  props: Record<string, any>;
}

// Analytics interfaces
export interface PageMetric {
  page: string;
  views: number;
  uniqueViews: number;
}

export interface SearchMetric {
  query: string;
  count: number;
  results: number;
}

export interface UserFlowMetric {
  from: string;
  to: string;
  count: number;
}

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
}

export interface TrendMetric {
  metric: string;
  values: Array<{ date: Date; value: number }>;
}

export interface ComparisonMetric {
  metric: string;
  current: number;
  previous: number;
  change: number;
}

// Deployment result interfaces
export interface BuildResult {
  outputPath: string;
  assets: string[];
  size: number;
}

export interface CDNResult {
  urls: string[];
  totalSize: number;
}

export interface RoutingResult {
  url: string;
}

export interface DNSResult {
  records: string[];
  propagated: boolean;
}

export interface VerificationResult {
  healthy: boolean;
  checks: string[];
}
