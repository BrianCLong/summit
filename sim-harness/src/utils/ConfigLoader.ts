/**
 * Configuration Loader
 * Loads and validates harness configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { HarnessConfig, GraphSize, WorkflowStrategy } from '../types/index.js';

const DEFAULT_CONFIG: HarnessConfig = {
  api: {
    baseUrl: 'http://localhost:4000',
    graphqlUrl: 'http://localhost:4000/graphql',
    timeout: 30000,
    retries: 3,
  },
  scenarios: {
    defaultSize: 'medium',
    defaultNoise: 0.1,
    deterministic: true,
    seed: 42,
  },
  ghostAnalyst: {
    maxSteps: 50,
    thinkTime: 1000,
    strategy: 'systematic',
    enableAI: false,
  },
  metrics: {
    enabled: true,
    detailed: true,
    exportFormat: 'json',
  },
  reporting: {
    outputDir: './reports',
    format: 'html',
    includeCharts: false,
  },
  safety: {
    nonProdOnly: true,
    maxConcurrentSessions: 5,
    requireConfirmation: false,
  },
};

export class ConfigLoader {
  /**
   * Load configuration from file
   */
  static loadFromFile(filepath: string): HarnessConfig {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Config file not found: ${filepath}`);
    }

    const ext = path.extname(filepath).toLowerCase();
    const content = fs.readFileSync(filepath, 'utf8');

    let config: Partial<HarnessConfig>;

    if (ext === '.json') {
      config = JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      config = yaml.load(content) as Partial<HarnessConfig>;
    } else {
      throw new Error(`Unsupported config file format: ${ext}`);
    }

    return this.mergeWithDefaults(config);
  }

  /**
   * Load configuration from environment variables
   */
  static loadFromEnv(): HarnessConfig {
    const config: Partial<HarnessConfig> = {};

    // API config
    if (process.env.SIM_API_URL) {
      config.api = {
        ...DEFAULT_CONFIG.api,
        baseUrl: process.env.SIM_API_URL,
      };
    }

    if (process.env.SIM_GRAPHQL_URL) {
      config.api = {
        ...(config.api || DEFAULT_CONFIG.api),
        graphqlUrl: process.env.SIM_GRAPHQL_URL,
      };
    }

    if (process.env.SIM_API_TIMEOUT) {
      config.api = {
        ...(config.api || DEFAULT_CONFIG.api),
        timeout: parseInt(process.env.SIM_API_TIMEOUT, 10),
      };
    }

    // Scenario config
    if (process.env.SIM_GRAPH_SIZE) {
      config.scenarios = {
        ...(config.scenarios || DEFAULT_CONFIG.scenarios),
        defaultSize: process.env.SIM_GRAPH_SIZE as GraphSize,
      };
    }

    if (process.env.SIM_NOISE_LEVEL) {
      config.scenarios = {
        ...(config.scenarios || DEFAULT_CONFIG.scenarios),
        defaultNoise: parseFloat(process.env.SIM_NOISE_LEVEL),
      };
    }

    if (process.env.SIM_SEED) {
      config.scenarios = {
        ...(config.scenarios || DEFAULT_CONFIG.scenarios),
        seed: parseInt(process.env.SIM_SEED, 10),
      };
    }

    // Ghost analyst config
    if (process.env.SIM_STRATEGY) {
      config.ghostAnalyst = {
        ...(config.ghostAnalyst || DEFAULT_CONFIG.ghostAnalyst),
        strategy: process.env.SIM_STRATEGY as WorkflowStrategy,
      };
    }

    if (process.env.SIM_THINK_TIME) {
      config.ghostAnalyst = {
        ...(config.ghostAnalyst || DEFAULT_CONFIG.ghostAnalyst),
        thinkTime: parseInt(process.env.SIM_THINK_TIME, 10),
      };
    }

    // Reporting config
    if (process.env.SIM_REPORT_DIR) {
      config.reporting = {
        ...(config.reporting || DEFAULT_CONFIG.reporting),
        outputDir: process.env.SIM_REPORT_DIR,
      };
    }

    if (process.env.SIM_REPORT_FORMAT) {
      config.reporting = {
        ...(config.reporting || DEFAULT_CONFIG.reporting),
        format: process.env.SIM_REPORT_FORMAT as 'html' | 'json' | 'markdown',
      };
    }

    // Log level
    if (process.env.SIM_LOG_LEVEL) {
      // Store for later use
      (global as any).SIM_LOG_LEVEL = process.env.SIM_LOG_LEVEL;
    }

    return this.mergeWithDefaults(config);
  }

  /**
   * Merge provided config with defaults
   */
  static mergeWithDefaults(config: Partial<HarnessConfig>): HarnessConfig {
    return {
      api: {
        ...DEFAULT_CONFIG.api,
        ...config.api,
      },
      scenarios: {
        ...DEFAULT_CONFIG.scenarios,
        ...config.scenarios,
      },
      ghostAnalyst: {
        ...DEFAULT_CONFIG.ghostAnalyst,
        ...config.ghostAnalyst,
      },
      metrics: {
        ...DEFAULT_CONFIG.metrics,
        ...config.metrics,
      },
      reporting: {
        ...DEFAULT_CONFIG.reporting,
        ...config.reporting,
      },
      safety: {
        ...DEFAULT_CONFIG.safety,
        ...config.safety,
      },
    };
  }

  /**
   * Get default configuration
   */
  static getDefaults(): HarnessConfig {
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Validate configuration
   */
  static validate(config: HarnessConfig): void {
    // Validate API config
    if (!config.api.baseUrl) {
      throw new Error('api.baseUrl is required');
    }

    if (!config.api.graphqlUrl) {
      throw new Error('api.graphqlUrl is required');
    }

    // Validate safety
    if (!config.safety.nonProdOnly) {
      throw new Error('safety.nonProdOnly must be true');
    }

    // Validate URLs for safety
    const baseUrl = config.api.baseUrl.toLowerCase();
    if (
      baseUrl.includes('prod') ||
      baseUrl.includes('production') ||
      (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1'))
    ) {
      console.warn(
        'WARNING: API URL appears to target production or external environment'
      );
      if (config.safety.requireConfirmation) {
        throw new Error(
          'Production-like URL detected and confirmations are required'
        );
      }
    }

    // Validate ranges
    if (
      config.scenarios.defaultNoise < 0 ||
      config.scenarios.defaultNoise > 1
    ) {
      throw new Error('scenarios.defaultNoise must be between 0 and 1');
    }

    if (config.ghostAnalyst.thinkTime < 0) {
      throw new Error('ghostAnalyst.thinkTime must be >= 0');
    }

    if (config.safety.maxConcurrentSessions < 1) {
      throw new Error('safety.maxConcurrentSessions must be >= 1');
    }
  }
}
