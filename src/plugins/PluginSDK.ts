import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

export interface PluginManifest {
  name: string;
  version: string;
  apiVersion: string;
  author: string;
  description: string;
  entryPoint: string;
  permissions: PluginPermission[];
  signature?: PluginSignature;
  dependencies: { [key: string]: string };
  minComposerVersion: string;
  maxComposerVersion?: string;
}

export interface PluginPermission {
  type: 'filesystem' | 'network' | 'process' | 'env' | 'registry';
  scope: string[];
  description: string;
}

export interface PluginSignature {
  algorithm: string;
  keyId: string;
  signature: string;
  certificate?: string;
  timestamp: Date;
}

export interface PluginContext {
  name: string;
  version: string;
  workingDirectory: string;
  tempDirectory: string;
  configDirectory: string;
  logger: PluginLogger;
  api: PluginAPI;
  sandbox: PluginSandbox;
}

export interface PluginAPI {
  // Build system integration
  getBuildTargets(): Promise<BuildTarget[]>;
  getBuildGraph(): Promise<BuildGraph>;
  executeBuild(targets: string[], options?: BuildOptions): Promise<BuildResult>;
  getTestResults(filter?: TestFilter): Promise<TestResult[]>;

  // Cache operations
  getCacheStats(): Promise<CacheStats>;
  invalidateCache(pattern?: string): Promise<void>;
  prefetchArtifacts(keys: string[]): Promise<void>;

  // Artifact management
  getArtifacts(buildId: string): Promise<Artifact[]>;
  publishArtifact(artifact: ArtifactSpec): Promise<string>;

  // Registry operations
  queryRegistry(query: RegistryQuery): Promise<RegistryResult[]>;
  publishToRegistry(spec: PublishSpec): Promise<void>;

  // Telemetry and metrics
  recordMetric(
    name: string,
    value: number,
    tags?: { [key: string]: string },
  ): void;
  recordEvent(event: PluginEvent): void;

  // Configuration
  getConfig(key: string, defaultValue?: any): Promise<any>;
  setConfig(key: string, value: any): Promise<void>;
}

export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface PluginSandbox {
  allowedPaths: string[];
  networkAccess: boolean;
  processSpawning: boolean;
  environmentAccess: string[];
  maxMemoryMB: number;
  maxCpuPercent: number;
  timeoutSeconds: number;
}

// Plugin lifecycle hooks
export interface PluginLifecycle {
  onLoad?(context: PluginContext): Promise<void>;
  onUnload?(context: PluginContext): Promise<void>;
  onBuildStart?(buildId: string, context: PluginContext): Promise<void>;
  onBuildComplete?(
    buildId: string,
    result: BuildResult,
    context: PluginContext,
  ): Promise<void>;
  onTestStart?(testId: string, context: PluginContext): Promise<void>;
  onTestComplete?(
    testId: string,
    result: TestResult,
    context: PluginContext,
  ): Promise<void>;
}

// Supporting types
export interface BuildTarget {
  id: string;
  type: string;
  sources: string[];
  dependencies: string[];
  outputs: string[];
}

export interface BuildGraph {
  nodes: BuildTarget[];
  edges: { from: string; to: string }[];
}

export interface BuildOptions {
  parallel?: number;
  cache?: boolean;
  verbose?: boolean;
  targets?: string[];
}

export interface BuildResult {
  buildId: string;
  success: boolean;
  duration: number;
  artifacts: string[];
  logs: string;
  metrics: { [key: string]: number };
}

export interface TestFilter {
  pattern?: string;
  tags?: string[];
  status?: 'passed' | 'failed' | 'skipped';
}

export interface TestResult {
  testId: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  message?: string;
  stackTrace?: string;
}

export interface CacheStats {
  hitRate: number;
  totalSize: number;
  entryCount: number;
  evictions: number;
}

export interface Artifact {
  id: string;
  name: string;
  path: string;
  size: number;
  checksum: string;
  metadata: { [key: string]: any };
}

export interface ArtifactSpec {
  name: string;
  path: string;
  metadata?: { [key: string]: any };
}

export interface RegistryQuery {
  type: string;
  filters: { [key: string]: any };
  limit?: number;
}

export interface RegistryResult {
  id: string;
  type: string;
  metadata: { [key: string]: any };
}

export interface PublishSpec {
  type: string;
  data: any;
  metadata: { [key: string]: any };
}

export interface PluginEvent {
  type: string;
  timestamp: Date;
  data: { [key: string]: any };
}

export class PluginSDK extends EventEmitter {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private signingKeys: Map<string, string> = new Map();
  private apiVersions: Map<string, APIVersionInfo> = new Map();

  constructor() {
    super();
    this.initializeAPIVersions();
    this.loadSigningKeys();
  }

  async loadPlugin(pluginPath: string): Promise<string> {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest: PluginManifest = JSON.parse(manifestContent);

      // Validate plugin manifest
      this.validateManifest(manifest);

      // Check API compatibility
      this.checkAPICompatibility(manifest);

      // Verify plugin signature
      await this.verifyPluginSignature(pluginPath, manifest);

      // Create sandbox
      const sandbox = this.createSandbox(manifest);

      // Load plugin module
      const pluginModule = await this.loadPluginModule(pluginPath, manifest);

      const loadedPlugin: LoadedPlugin = {
        id: `${manifest.name}@${manifest.version}`,
        manifest,
        module: pluginModule,
        context: this.createPluginContext(manifest, pluginPath, sandbox),
        loadedAt: new Date(),
        active: true,
      };

      this.plugins.set(loadedPlugin.id, loadedPlugin);
      this.sandboxes.set(loadedPlugin.id, sandbox);

      // Call plugin lifecycle hook
      if (pluginModule.onLoad) {
        await pluginModule.onLoad(loadedPlugin.context);
      }

      this.emit('plugin-loaded', {
        id: loadedPlugin.id,
        name: manifest.name,
        version: manifest.version,
        permissions: manifest.permissions.length,
      });

      return loadedPlugin.id;
    } catch (error) {
      this.emit('plugin-load-error', {
        path: pluginPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
      // Call plugin lifecycle hook
      if (plugin.module.onUnload) {
        await plugin.module.onUnload(plugin.context);
      }

      plugin.active = false;
      this.plugins.delete(pluginId);
      this.sandboxes.delete(pluginId);

      this.emit('plugin-unloaded', { id: pluginId });
    } catch (error) {
      this.emit('plugin-unload-error', {
        id: pluginId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async reloadPlugin(pluginId: string, pluginPath: string): Promise<void> {
    await this.unloadPlugin(pluginId);
    await this.loadPlugin(pluginPath);
  }

  getLoadedPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map((plugin) => ({
      id: plugin.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      author: plugin.manifest.author,
      description: plugin.manifest.description,
      apiVersion: plugin.manifest.apiVersion,
      loadedAt: plugin.loadedAt,
      active: plugin.active,
      permissions: plugin.manifest.permissions,
    }));
  }

  async validateAllPlugins(): Promise<ValidationReport[]> {
    const reports: ValidationReport[] = [];

    for (const [id, plugin] of this.plugins) {
      const report: ValidationReport = {
        pluginId: id,
        valid: true,
        errors: [],
        warnings: [],
      };

      try {
        // Re-validate manifest
        this.validateManifest(plugin.manifest);

        // Check API compatibility
        this.checkAPICompatibility(plugin.manifest);

        // Verify signature is still valid
        const pluginPath = path.dirname(plugin.context.configDirectory);
        await this.verifyPluginSignature(pluginPath, plugin.manifest);

        // Check sandbox compliance
        this.validateSandboxCompliance(plugin);
      } catch (error) {
        report.valid = false;
        report.errors.push(
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      reports.push(report);
    }

    return reports;
  }

  async generatePluginSignature(
    pluginPath: string,
    privateKeyPath: string,
  ): Promise<PluginSignature> {
    const manifest = JSON.parse(
      await fs.readFile(path.join(pluginPath, 'plugin.json'), 'utf8'),
    );

    // Create hash of plugin contents
    const pluginHash = await this.hashPluginContents(pluginPath);

    // Load private key
    const privateKey = await fs.readFile(privateKeyPath, 'utf8');

    // Create signature
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${manifest.name}:${manifest.version}:${pluginHash}`);
    const signature = sign.sign(privateKey, 'base64');

    return {
      algorithm: 'RSA-SHA256',
      keyId: this.generateKeyId(privateKey),
      signature,
      timestamp: new Date(),
    };
  }

  private validateManifest(manifest: PluginManifest): void {
    const required = ['name', 'version', 'apiVersion', 'author', 'entryPoint'];
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate semver format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error(`Invalid version format: ${manifest.version}`);
    }

    // Validate permissions
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        this.validatePermission(permission);
      }
    }
  }

  private checkAPICompatibility(manifest: PluginManifest): void {
    const apiInfo = this.apiVersions.get(manifest.apiVersion);
    if (!apiInfo) {
      throw new Error(`Unsupported API version: ${manifest.apiVersion}`);
    }

    if (apiInfo.deprecated) {
      this.emit('plugin-warning', {
        message: `Plugin uses deprecated API version: ${manifest.apiVersion}`,
        plugin: manifest.name,
      });
    }

    // Check Composer version compatibility
    const currentVersion = '1.24.0'; // Would be dynamic in production
    if (
      !this.isVersionCompatible(
        currentVersion,
        manifest.minComposerVersion,
        manifest.maxComposerVersion,
      )
    ) {
      throw new Error(
        `Incompatible Composer version. Required: ${manifest.minComposerVersion}${manifest.maxComposerVersion ? `-${manifest.maxComposerVersion}` : '+'}, Current: ${currentVersion}`,
      );
    }
  }

  private async verifyPluginSignature(
    pluginPath: string,
    manifest: PluginManifest,
  ): Promise<void> {
    if (!manifest.signature) {
      throw new Error('Plugin signature required but not found');
    }

    const publicKey = this.signingKeys.get(manifest.signature.keyId);
    if (!publicKey) {
      throw new Error(`Unknown signing key: ${manifest.signature.keyId}`);
    }

    // Create hash of plugin contents
    const pluginHash = await this.hashPluginContents(pluginPath);

    // Verify signature
    const verify = crypto.createVerify(manifest.signature.algorithm);
    verify.update(`${manifest.name}:${manifest.version}:${pluginHash}`);

    const isValid = verify.verify(
      publicKey,
      manifest.signature.signature,
      'base64',
    );
    if (!isValid) {
      throw new Error('Plugin signature verification failed');
    }

    this.emit('plugin-signature-verified', {
      plugin: manifest.name,
      keyId: manifest.signature.keyId,
    });
  }

  private createSandbox(manifest: PluginManifest): PluginSandbox {
    const sandbox: PluginSandbox = {
      allowedPaths: ['/tmp', process.cwd()],
      networkAccess: false,
      processSpawning: false,
      environmentAccess: ['PATH', 'HOME'],
      maxMemoryMB: 256,
      maxCpuPercent: 25,
      timeoutSeconds: 300,
    };

    // Configure sandbox based on permissions
    for (const permission of manifest.permissions) {
      switch (permission.type) {
        case 'filesystem':
          sandbox.allowedPaths.push(...permission.scope);
          break;
        case 'network':
          sandbox.networkAccess = true;
          break;
        case 'process':
          sandbox.processSpawning = true;
          break;
        case 'env':
          sandbox.environmentAccess.push(...permission.scope);
          break;
      }
    }

    return sandbox;
  }

  private async loadPluginModule(
    pluginPath: string,
    manifest: PluginManifest,
  ): Promise<any> {
    const entryPath = path.join(pluginPath, manifest.entryPoint);

    // In production, this would use a secure module loader with sandbox enforcement
    const module = await import(entryPath);

    // Validate that module implements required interface
    if (typeof module.default === 'function') {
      return module.default;
    } else if (typeof module === 'object') {
      return module;
    } else {
      throw new Error('Plugin module must export a default function or object');
    }
  }

  private createPluginContext(
    manifest: PluginManifest,
    pluginPath: string,
    sandbox: PluginSandbox,
  ): PluginContext {
    return {
      name: manifest.name,
      version: manifest.version,
      workingDirectory: pluginPath,
      tempDirectory: path.join(pluginPath, 'tmp'),
      configDirectory: path.join(pluginPath, 'config'),
      logger: this.createPluginLogger(manifest.name),
      api: this.createPluginAPI(manifest.name),
      sandbox,
    };
  }

  private createPluginLogger(pluginName: string): PluginLogger {
    return {
      debug: (message: string, ...args: any[]) => {
        this.emit('plugin-log', {
          level: 'debug',
          plugin: pluginName,
          message,
          args,
        });
      },
      info: (message: string, ...args: any[]) => {
        this.emit('plugin-log', {
          level: 'info',
          plugin: pluginName,
          message,
          args,
        });
      },
      warn: (message: string, ...args: any[]) => {
        this.emit('plugin-log', {
          level: 'warn',
          plugin: pluginName,
          message,
          args,
        });
      },
      error: (message: string, ...args: any[]) => {
        this.emit('plugin-log', {
          level: 'error',
          plugin: pluginName,
          message,
          args,
        });
      },
    };
  }

  private createPluginAPI(pluginName: string): PluginAPI {
    return {
      getBuildTargets: async () => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getBuildTargets',
        });
        // Implementation would call actual build system
        return [];
      },

      getBuildGraph: async () => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getBuildGraph',
        });
        return { nodes: [], edges: [] };
      },

      executeBuild: async (targets: string[], options?: BuildOptions) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'executeBuild',
          targets,
        });
        // Implementation would execute actual build
        return {
          buildId: `build-${Date.now()}`,
          success: true,
          duration: 1000,
          artifacts: [],
          logs: '',
          metrics: {},
        };
      },

      getTestResults: async (filter?: TestFilter) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getTestResults',
        });
        return [];
      },

      getCacheStats: async () => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getCacheStats',
        });
        return { hitRate: 0.8, totalSize: 1024, entryCount: 100, evictions: 5 };
      },

      invalidateCache: async (pattern?: string) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'invalidateCache',
          pattern,
        });
      },

      prefetchArtifacts: async (keys: string[]) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'prefetchArtifacts',
          keys,
        });
      },

      getArtifacts: async (buildId: string) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getArtifacts',
          buildId,
        });
        return [];
      },

      publishArtifact: async (artifact: ArtifactSpec) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'publishArtifact',
        });
        return `artifact-${Date.now()}`;
      },

      queryRegistry: async (query: RegistryQuery) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'queryRegistry',
        });
        return [];
      },

      publishToRegistry: async (spec: PublishSpec) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'publishToRegistry',
        });
      },

      recordMetric: (
        name: string,
        value: number,
        tags?: { [key: string]: string },
      ) => {
        this.emit('plugin-metric', { plugin: pluginName, name, value, tags });
      },

      recordEvent: (event: PluginEvent) => {
        this.emit('plugin-event', { plugin: pluginName, event });
      },

      getConfig: async (key: string, defaultValue?: any) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'getConfig',
          key,
        });
        return defaultValue;
      },

      setConfig: async (key: string, value: any) => {
        this.emit('plugin-api-call', {
          plugin: pluginName,
          method: 'setConfig',
          key,
        });
      },
    };
  }

  private validatePermission(permission: PluginPermission): void {
    const validTypes = ['filesystem', 'network', 'process', 'env', 'registry'];
    if (!validTypes.includes(permission.type)) {
      throw new Error(`Invalid permission type: ${permission.type}`);
    }

    if (!permission.scope || permission.scope.length === 0) {
      throw new Error(
        `Permission scope cannot be empty for type: ${permission.type}`,
      );
    }
  }

  private validateSandboxCompliance(plugin: LoadedPlugin): void {
    const sandbox = this.sandboxes.get(plugin.id);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin: ${plugin.id}`);
    }

    // In production, this would check actual resource usage, file access, etc.
    // For now, we simulate compliance checking
    if (
      sandbox.networkAccess &&
      !plugin.manifest.permissions.some((p) => p.type === 'network')
    ) {
      throw new Error('Plugin using network without permission');
    }
  }

  private async hashPluginContents(pluginPath: string): Promise<string> {
    const hash = crypto.createHash('sha256');

    // Hash all relevant files in the plugin directory
    const files = await this.getAllFiles(pluginPath);
    for (const file of files.sort()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        const content = await fs.readFile(file);
        hash.update(content);
      }
    }

    return hash.digest('hex');
  }

  private generateKeyId(publicKey: string): string {
    return crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 16);
  }

  private isVersionCompatible(
    current: string,
    min: string,
    max?: string,
  ): boolean {
    // Simplified semver comparison
    const parseVersion = (v: string) => v.split('.').map(Number);
    const currentParts = parseVersion(current);
    const minParts = parseVersion(min);
    const maxParts = max ? parseVersion(max) : null;

    // Check minimum version
    for (let i = 0; i < 3; i++) {
      if (currentParts[i] > minParts[i])
        return maxParts
          ? this.compareVersions(currentParts, maxParts) <= 0
          : true;
      if (currentParts[i] < minParts[i]) return false;
    }

    // Check maximum version
    return maxParts ? this.compareVersions(currentParts, maxParts) <= 0 : true;
  }

  private compareVersions(v1: number[], v2: number[]): number {
    for (let i = 0; i < 3; i++) {
      if (v1[i] !== v2[i]) return v1[i] - v2[i];
    }
    return 0;
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getAllFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private initializeAPIVersions(): void {
    this.apiVersions.set('1.0.0', {
      version: '1.0.0',
      deprecated: false,
      supportedUntil: new Date('2025-12-31'),
      breaking: false,
    });

    this.apiVersions.set('0.9.0', {
      version: '0.9.0',
      deprecated: true,
      supportedUntil: new Date('2024-06-30'),
      breaking: false,
    });
  }

  private async loadSigningKeys(): Promise<void> {
    // In production, load from secure key store
    const examplePublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`;

    this.signingKeys.set('example-key', examplePublicKey);
  }
}

// Supporting interfaces
interface LoadedPlugin {
  id: string;
  manifest: PluginManifest;
  module: any;
  context: PluginContext;
  loadedAt: Date;
  active: boolean;
}

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  apiVersion: string;
  loadedAt: Date;
  active: boolean;
  permissions: PluginPermission[];
}

interface ValidationReport {
  pluginId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface APIVersionInfo {
  version: string;
  deprecated: boolean;
  supportedUntil: Date;
  breaking: boolean;
}
