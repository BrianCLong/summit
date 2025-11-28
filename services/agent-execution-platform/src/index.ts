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

import dotenv from 'dotenv';
import { APIServer } from './api/index.js';
import { configManager } from './config/index.js';
import { logger } from './logging/index.js';
import { agentRunner } from './runner/index.js';
import { pipelineEngine } from './pipeline/index.js';
import { promptRegistry } from './registry/index.js';

// Load environment variables
dotenv.config();

// Export all modules for library use
export * from './types/index.js';
export * from './config/index.js';
export * from './logging/index.js';
export * from './safety/index.js';
export * from './registry/index.js';
export * from './pipeline/index.js';
export * from './runner/index.js';
export * from './api/index.js';

// Main application class
export class AgentExecutionPlatform {
  private apiServer: APIServer;
  private initialized: boolean = false;

  constructor() {
    this.apiServer = new APIServer(configManager.get().server.port);
  }

  async initialize(): Promise<void> {
    logger.getLogger().info('Initializing Agent Execution Platform');

    try {
      // Validate configuration
      configManager.validate();

      // Initialize components
      logger.getLogger().info('Initializing components');

      // Load default prompts if needed
      await this.loadDefaultPrompts();

      this.initialized = true;

      logger.getLogger().info('Agent Execution Platform initialized successfully');
    } catch (error) {
      logger.getLogger().fatal('Failed to initialize platform', error as Error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    logger.getLogger().info('Starting Agent Execution Platform');

    try {
      // Start API server
      await this.apiServer.start();

      logger.getLogger().info('Agent Execution Platform started successfully', {
        port: configManager.get().server.port,
      });

      // Log platform status
      this.logStatus();
    } catch (error) {
      logger.getLogger().fatal('Failed to start platform', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.getLogger().info('Shutting down Agent Execution Platform');

    try {
      // Graceful shutdown logic here
      logger.getLogger().info('Agent Execution Platform shut down successfully');
    } catch (error) {
      logger.getLogger().error('Error during shutdown', error as Error);
      throw error;
    }
  }

  private async loadDefaultPrompts(): Promise<void> {
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
            type: 'string' as const,
            required: true,
            description: 'The name of the entity to analyze',
          },
          {
            name: 'analysisType',
            type: 'string' as const,
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
        await promptRegistry.register(prompt);
      } catch (error) {
        logger.getLogger().warn('Failed to load default prompt', {
          promptId: prompt.id,
          error: (error as Error).message,
        });
      }
    }
  }

  private logStatus(): void {
    const agentStats = agentRunner.getStats();
    const promptStats = promptRegistry.getStats();
    const logStats = logger.getStore().getStats();

    logger.getLogger().info('Platform Status', {
      agents: agentStats,
      prompts: promptStats,
      logs: logStats,
    });
  }

  getAPIServer(): APIServer {
    return this.apiServer;
  }
}

// Main execution when run directly
if (import.meta.url === 'file://' + process.argv[1]) {
  const platform = new AgentExecutionPlatform();

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.getLogger().info('SIGTERM received, shutting down gracefully');
    await platform.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.getLogger().info('SIGINT received, shutting down gracefully');
    await platform.shutdown();
    process.exit(0);
  });

  // Start the platform
  platform.start().catch((error) => {
    logger.getLogger().fatal('Fatal error starting platform', error);
    process.exit(1);
  });
}
