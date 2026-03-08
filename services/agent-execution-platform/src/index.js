"use strict";
/**
 * Agent Execution Platform - Main Entry Point
 *
 * A comprehensive platform for orchestrating autonomous agents with:
 * - Agent Runner: Core execution and orchestration
 * - Execution Pipelines: DAG-based workflow engine
 * - Prompt Registry: Centralized prompt management
 * - Safety Layer: Input validation, PII detection, rate limiting
 * - Logging Framework: Structured logging and monitoring
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentExecutionPlatform = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const index_js_1 = require("./api/index.js");
const index_js_2 = require("./config/index.js");
const index_js_3 = require("./logging/index.js");
const index_js_4 = require("./runner/index.js");
const index_js_5 = require("./registry/index.js");
// Load environment variables
dotenv_1.default.config();
// Export all modules for library use
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./config/index.js"), exports);
__exportStar(require("./logging/index.js"), exports);
__exportStar(require("./safety/index.js"), exports);
__exportStar(require("./registry/index.js"), exports);
__exportStar(require("./pipeline/index.js"), exports);
__exportStar(require("./runner/index.js"), exports);
__exportStar(require("./api/index.js"), exports);
// Main application class
class AgentExecutionPlatform {
    apiServer;
    initialized = false;
    constructor() {
        this.apiServer = new index_js_1.APIServer(index_js_2.configManager.get().server.port);
    }
    async initialize() {
        index_js_3.logger.getLogger().info('Initializing Agent Execution Platform');
        try {
            // Validate configuration
            index_js_2.configManager.validate();
            // Initialize components
            index_js_3.logger.getLogger().info('Initializing components');
            // Load default prompts if needed
            await this.loadDefaultPrompts();
            this.initialized = true;
            index_js_3.logger.getLogger().info('Agent Execution Platform initialized successfully');
        }
        catch (error) {
            index_js_3.logger.getLogger().fatal('Failed to initialize platform', error);
            throw error;
        }
    }
    async start() {
        if (!this.initialized) {
            await this.initialize();
        }
        index_js_3.logger.getLogger().info('Starting Agent Execution Platform');
        try {
            // Start API server
            await this.apiServer.start();
            index_js_3.logger.getLogger().info('Agent Execution Platform started successfully', {
                port: index_js_2.configManager.get().server.port,
            });
            // Log platform status
            this.logStatus();
        }
        catch (error) {
            index_js_3.logger.getLogger().fatal('Failed to start platform', error);
            throw error;
        }
    }
    async shutdown() {
        index_js_3.logger.getLogger().info('Shutting down Agent Execution Platform');
        try {
            // Graceful shutdown logic here
            index_js_3.logger.getLogger().info('Agent Execution Platform shut down successfully');
        }
        catch (error) {
            index_js_3.logger.getLogger().error('Error during shutdown', error);
            throw error;
        }
    }
    async loadDefaultPrompts() {
        // Example: Load some default prompts
        const defaultPrompts = [
            {
                id: 'analysis-prompt-001',
                name: 'entity-analysis',
                version: '1.0.0',
                content: 'Analyze the following entity: {{entityName}}. Provide insights on: {{analysisType}}',
                variables: [
                    {
                        name: 'entityName',
                        type: 'string',
                        required: true,
                        description: 'The name of the entity to analyze',
                    },
                    {
                        name: 'analysisType',
                        type: 'string',
                        required: true,
                        description: 'Type of analysis to perform',
                    },
                ],
                metadata: {
                    author: 'system',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    description: 'Default prompt for entity analysis',
                    category: 'analysis',
                },
                tags: ['analysis', 'entity', 'default'],
            },
        ];
        for (const prompt of defaultPrompts) {
            try {
                await index_js_5.promptRegistry.register(prompt);
            }
            catch (error) {
                index_js_3.logger.getLogger().warn('Failed to load default prompt', {
                    promptId: prompt.id,
                    error: error.message,
                });
            }
        }
    }
    logStatus() {
        const agentStats = index_js_4.agentRunner.getStats();
        const promptStats = index_js_5.promptRegistry.getStats();
        const logStats = index_js_3.logger.getStore().getStats();
        index_js_3.logger.getLogger().info('Platform Status', {
            agents: agentStats,
            prompts: promptStats,
            logs: logStats,
        });
    }
    getAPIServer() {
        return this.apiServer;
    }
}
exports.AgentExecutionPlatform = AgentExecutionPlatform;
// Main execution when run directly
if (import.meta.url === 'file://' + process.argv[1]) {
    const platform = new AgentExecutionPlatform();
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
        index_js_3.logger.getLogger().info('SIGTERM received, shutting down gracefully');
        await platform.shutdown();
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        index_js_3.logger.getLogger().info('SIGINT received, shutting down gracefully');
        await platform.shutdown();
        process.exit(0);
    });
    // Start the platform
    platform.start().catch((error) => {
        index_js_3.logger.getLogger().fatal('Fatal error starting platform', error);
        process.exit(1);
    });
}
