/**
 * Plugin Architecture for Extensible Issue Fixing
 *
 * Allows custom fix implementations to be dynamically loaded
 */

import { GitHubIssue, IssueClassification } from './types.js';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Plugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;

  // Hook: Called before processing starts
  onInit?: () => Promise<void>;

  // Hook: Called for each issue to determine if plugin should handle it
  canHandle?: (issue: GitHubIssue, classification: IssueClassification) => boolean;

  // Hook: Implement the fix
  fix?: (issue: GitHubIssue, classification: IssueClassification) => Promise<PluginFixResult>;

  // Hook: Verify the fix
  verify?: () => Promise<boolean>;

  // Hook: Called after fix is committed
  postFix?: (issue: GitHubIssue, result: PluginFixResult) => Promise<void>;

  // Hook: Called when run completes
  onComplete?: (stats: PluginStats) => Promise<void>;

  // Hook: Called on errors
  onError?: (error: Error, issue: GitHubIssue) => Promise<void>;
}

export interface PluginFixResult {
  success: boolean;
  changes: string[];
  error?: string;
  metadata?: Record<string, any>;
}

export interface PluginStats {
  issuesHandled: number;
  issuesFixed: number;
  issuesFailed: number;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private stats: Map<string, PluginStats> = new Map();
  private pluginDir: string;

  constructor(pluginDir: string = join(process.cwd(), 'tools/issue-sweeper/plugins')) {
    this.pluginDir = pluginDir;
  }

  /**
   * Load all plugins from plugin directory
   */
  async loadPlugins(): Promise<void> {
    if (!existsSync(this.pluginDir)) {
      console.log('⚠️  Plugin directory not found, skipping plugin loading');
      return;
    }

    const files = readdirSync(this.pluginDir).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.js')
    );

    for (const file of files) {
      try {
        const pluginPath = join(this.pluginDir, file);
        const module = await import(pluginPath);

        if (module.default && typeof module.default === 'object') {
          const plugin = module.default as Plugin;

          if (!plugin.name) {
            console.warn(`⚠️  Plugin in ${file} missing 'name' field`);
            continue;
          }

          this.registerPlugin(plugin);
        }
      } catch (error) {
        console.error(`❌ Failed to load plugin ${file}:`, error);
      }
    }

    // Initialize all enabled plugins
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled && plugin.onInit) {
        try {
          await plugin.onInit();
          console.log(`✅ Initialized plugin: ${name} v${plugin.version}`);
        } catch (error) {
          console.error(`❌ Failed to initialize plugin ${name}:`, error);
        }
      }
    }

    console.log(`📦 Loaded ${this.plugins.size} plugins`);
  }

  /**
   * Register a plugin
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    this.stats.set(plugin.name, {
      issuesHandled: 0,
      issuesFixed: 0,
      issuesFailed: 0,
    });

    console.log(`📦 Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Find plugin that can handle an issue
   */
  async findPluginForIssue(
    issue: GitHubIssue,
    classification: IssueClassification
  ): Promise<Plugin | null> {
    for (const [name, plugin] of this.plugins) {
      if (!plugin.enabled) continue;

      if (plugin.canHandle && plugin.canHandle(issue, classification)) {
        return plugin;
      }
    }

    return null;
  }

  /**
   * Execute plugin fix
   */
  async executeFix(
    plugin: Plugin,
    issue: GitHubIssue,
    classification: IssueClassification
  ): Promise<PluginFixResult> {
    const stats = this.stats.get(plugin.name)!;
    stats.issuesHandled++;

    try {
      if (!plugin.fix) {
        return {
          success: false,
          changes: [],
          error: 'Plugin does not implement fix method',
        };
      }

      const result = await plugin.fix(issue, classification);

      if (result.success) {
        stats.issuesFixed++;

        // Call postFix hook if available
        if (plugin.postFix) {
          await plugin.postFix(issue, result);
        }
      } else {
        stats.issuesFailed++;
      }

      return result;
    } catch (error) {
      stats.issuesFailed++;

      // Call error hook if available
      if (plugin.onError) {
        await plugin.onError(error as Error, issue);
      }

      return {
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify plugin fix
   */
  async verifyFix(plugin: Plugin): Promise<boolean> {
    if (!plugin.verify) {
      return true; // No verification implemented
    }

    try {
      return await plugin.verify();
    } catch (error) {
      console.error(`❌ Plugin verification failed for ${plugin.name}:`, error);
      return false;
    }
  }

  /**
   * Call onComplete for all plugins
   */
  async complete(): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      if (!plugin.enabled) continue;

      if (plugin.onComplete) {
        const stats = this.stats.get(name)!;
        try {
          await plugin.onComplete(stats);
        } catch (error) {
          console.error(`❌ Plugin onComplete failed for ${name}:`, error);
        }
      }
    }
  }

  /**
   * Get plugin statistics
   */
  getStats(): Map<string, PluginStats> {
    return this.stats;
  }

  /**
   * Get loaded plugins
   */
  getPlugins(): Map<string, Plugin> {
    return this.plugins;
  }

  /**
   * Enable/disable plugin
   */
  setPluginEnabled(name: string, enabled: boolean): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = enabled;
    }
  }
}

/**
 * Example plugin template
 */
export const examplePlugin: Plugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Example plugin template',
  author: 'Your Name',
  enabled: false,

  onInit: async () => {
    console.log('Example plugin initialized');
  },

  canHandle: (issue, classification) => {
    // Return true if this plugin should handle the issue
    return issue.title.toLowerCase().includes('example');
  },

  fix: async (issue, classification) => {
    // Implement your fix logic here
    return {
      success: true,
      changes: ['Example fix applied'],
    };
  },

  verify: async () => {
    // Implement verification logic
    return true;
  },

  postFix: async (issue, result) => {
    console.log(`Post-fix hook for issue #${issue.number}`);
  },

  onComplete: async (stats) => {
    console.log('Example plugin stats:', stats);
  },

  onError: async (error, issue) => {
    console.error(`Error in example plugin for issue #${issue.number}:`, error);
  },
};
