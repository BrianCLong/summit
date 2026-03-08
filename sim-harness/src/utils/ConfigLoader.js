"use strict";
/**
 * Configuration Loader
 * Loads and validates harness configuration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const DEFAULT_CONFIG = {
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
class ConfigLoader {
    /**
     * Load configuration from file
     */
    static loadFromFile(filepath) {
        if (!fs.existsSync(filepath)) {
            throw new Error(`Config file not found: ${filepath}`);
        }
        const ext = path.extname(filepath).toLowerCase();
        const content = fs.readFileSync(filepath, 'utf8');
        let config;
        if (ext === '.json') {
            config = JSON.parse(content);
        }
        else if (ext === '.yaml' || ext === '.yml') {
            config = yaml.load(content);
        }
        else {
            throw new Error(`Unsupported config file format: ${ext}`);
        }
        return this.mergeWithDefaults(config);
    }
    /**
     * Load configuration from environment variables
     */
    static loadFromEnv() {
        const config = {};
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
                defaultSize: process.env.SIM_GRAPH_SIZE,
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
                strategy: process.env.SIM_STRATEGY,
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
                format: process.env.SIM_REPORT_FORMAT,
            };
        }
        // Log level
        if (process.env.SIM_LOG_LEVEL) {
            // Store for later use
            global.SIM_LOG_LEVEL = process.env.SIM_LOG_LEVEL;
        }
        return this.mergeWithDefaults(config);
    }
    /**
     * Merge provided config with defaults
     */
    static mergeWithDefaults(config) {
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
    static getDefaults() {
        return { ...DEFAULT_CONFIG };
    }
    /**
     * Validate configuration
     */
    static validate(config) {
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
        if (baseUrl.includes('prod') ||
            baseUrl.includes('production') ||
            (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1'))) {
            console.warn('WARNING: API URL appears to target production or external environment');
            if (config.safety.requireConfirmation) {
                throw new Error('Production-like URL detected and confirmations are required');
            }
        }
        // Validate ranges
        if (config.scenarios.defaultNoise < 0 ||
            config.scenarios.defaultNoise > 1) {
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
exports.ConfigLoader = ConfigLoader;
