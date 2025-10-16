// examples/optimization-integration.ts

import express from 'express';
import { OptimizationManager } from '../server/src/optimization/index.js';

/**
 * Complete IntelGraph Performance Optimization Integration Example
 *
 * This example demonstrates how to integrate all optimization systems
 * into an Express.js application with full monitoring and cost control.
 */

const app = express();
const port = process.env.PORT || 3000;

// Initialize the optimization manager with custom configuration
const optimizationManager = new OptimizationManager({
  enabled: true,
  neo4j: {
    enableQueryCaching: true,
    enableMaterializedViews: true,
    queryTimeoutMs: 30000,
    cacheMaxMemoryMB: 512,
  },
  postgres: {
    enableQueryCaching: true,
    enableAutoIndexing: true,
    connectionPoolSize: 25,
    slowQueryThresholdMs: 1000,
  },
  apiGateway: {
    enableResponseCaching: true,
    enableCircuitBreaker: true,
    enableBulkhead: true,
    enableRequestBatching: true,
  },
  costOptimization: {
    enableIntelligentRouting: true,
    enableBudgetTracking: true,
    enableCostPrediction: true,
    defaultBudgetLimit: 100.0,
  },
  monitoring: {
    metricsRetentionHours: 72,
    alertingEnabled: true,
    sloMonitoringEnabled: true,
    regressionDetectionEnabled: true,
  },
});

// Middleware setup
app.use(express.json());

async function setupOptimization() {
  try {
    // Initialize optimization systems
    await optimizationManager.initialize();
    console.log('✅ Optimization systems initialized');

    // Get optimization middleware
    const middleware = optimizationManager.getOptimizedQueryMiddleware();

    // Apply global middleware for API optimization
    app.use(
      '/api',
      middleware.responseCache({
        ttl: 300, // 5 minutes cache
        staleWhileRevalidate: 600, // Serve stale for 10 minutes while revalidating
        tags: ['api_response'],
      }),
    );

    app.use(
      '/api',
      middleware.circuitBreaker({
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        monitoringPeriodMs: 10000,
        halfOpenMaxCalls: 3,
      }),
    );

    app.use(
      '/api',
      middleware.bulkhead({
        maxConcurrent: 100,
        queueSize: 50,
        timeoutMs: 30000,
      }),
    );

    app.use('/api', middleware.budgetTracking());

    // Example: Neo4j query endpoint with optimization
    app.post(
      '/api/neo4j/query',
      middleware.neo4jQuery({
        useCache: true,
        cacheTtl: 600,
        timeout: 15000,
      }),
      async (req, res) => {
        try {
          // If query was optimized, the result is in req.optimizedQuery
          if (req.optimizedQuery) {
            return res.json({
              success: true,
              data: req.optimizedQuery.result,
              metadata: {
                optimizations: req.optimizedQuery.optimizationApplied,
                cacheHit: req.optimizedQuery.cacheHit,
                executionTime: req.optimizedQuery.metrics.executionTimeMs,
              },
            });
          }

          // Fallback to manual query execution
          res.status(400).json({ error: 'Query optimization failed' });
        } catch (error) {
          console.error('Neo4j query error:', error);
          res.status(500).json({ error: error.message });
        }
      },
    );

    // Example: PostgreSQL query endpoint with optimization
    app.post(
      '/api/postgres/query',
      middleware.postgresQuery({
        useCache: true,
        cacheTtl: 300,
        readOnly: true,
      }),
      async (req, res) => {
        try {
          if (req.optimizedQuery) {
            return res.json({
              success: true,
              data: req.optimizedQuery.result.rows,
              metadata: {
                optimizations: req.optimizedQuery.optimizationApplied,
                cacheHit: req.optimizedQuery.cacheHit,
                executionTime: req.optimizedQuery.executionTime,
                planUsed: req.optimizedQuery.planUsed ? true : false,
              },
            });
          }

          res.status(400).json({ error: 'Query optimization failed' });
        } catch (error) {
          console.error('PostgreSQL query error:', error);
          res.status(500).json({ error: error.message });
        }
      },
    );

    // Example: AI model request with intelligent routing
    app.post('/api/ai/query', async (req, res) => {
      try {
        const { task, input, userId, tenantId } = req.body;

        // Select optimal model based on request characteristics
        const modelSelection = await optimizationManager.selectOptimalModel({
          taskType: task.type || 'analysis',
          complexity: task.complexity || 0.5,
          urgency: task.urgency || 'medium',
          qualityRequirement: task.qualityRequirement || 0.8,
          budgetLimit: task.budgetLimit,
          maxLatency: task.maxLatency,
          requiredCapabilities: task.capabilities || [],
          contextSize: input.length,
          expectedOutputSize: task.expectedOutputSize || 1000,
          userId,
          tenantId,
        });

        // Return model selection for client to use
        res.json({
          success: true,
          selectedModel: {
            id: modelSelection.selectedModel.id,
            name: modelSelection.selectedModel.name,
            provider: modelSelection.selectedModel.provider,
            estimatedCost: modelSelection.costPrediction.estimatedCost,
            reasoning: modelSelection.reasoning,
          },
          alternatives: modelSelection.alternatives.map((alt) => ({
            id: alt.id,
            name: alt.name,
            provider: alt.provider,
          })),
          optimizations: modelSelection.optimizationApplied,
        });
      } catch (error) {
        console.error('AI model selection error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Performance dashboard endpoint
    app.get('/api/admin/dashboard', async (req, res) => {
      try {
        const dashboard = await optimizationManager.getDashboard();
        res.json(dashboard);
      } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Optimization report endpoint
    app.get('/api/admin/optimization-report', async (req, res) => {
      try {
        const report = await optimizationManager.generateOptimizationReport();
        res.json(report);
      } catch (error) {
        console.error('Optimization report error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Metrics history endpoint
    app.get('/api/admin/metrics', async (req, res) => {
      try {
        const hours = parseInt(req.query.hours as string) || 24;
        const metrics = await optimizationManager.getMetricsHistory(hours);
        res.json(metrics);
      } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Active alerts endpoint
    app.get('/api/admin/alerts', async (req, res) => {
      try {
        const alerts = await optimizationManager.getActiveAlerts();
        res.json(alerts);
      } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Health check endpoint
    app.get('/api/admin/health', async (req, res) => {
      try {
        const health = await optimizationManager.healthCheck();
        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Cache management endpoints
    app.post('/api/admin/cache/clear', async (req, res) => {
      try {
        const results = await optimizationManager.clearAllCaches();
        res.json({
          success: true,
          results,
        });
      } catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Index optimization endpoint
    app.post('/api/admin/optimize/indexes', async (req, res) => {
      try {
        const limit = parseInt(req.body.limit) || 5;
        const createdIndexes =
          await optimizationManager.createRecommendedIndexes(limit);

        res.json({
          success: true,
          createdIndexes,
          message: `Created ${createdIndexes.length} recommended indexes`,
        });
      } catch (error) {
        console.error('Index optimization error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Budget management endpoint
    app.post('/api/admin/budget/:userId/:tenantId', async (req, res) => {
      try {
        const { userId, tenantId } = req.params;
        const { limit } = req.body;

        await optimizationManager.updateBudgetLimit(userId, tenantId, limit);

        res.json({
          success: true,
          message: `Budget limit updated to $${limit} for user ${userId}`,
        });
      } catch (error) {
        console.error('Budget update error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Configuration endpoint
    app.get('/api/admin/config', (req, res) => {
      const config = optimizationManager.getConfig();
      res.json(config);
    });

    app.put('/api/admin/config', (req, res) => {
      try {
        optimizationManager.updateConfig(req.body);
        res.json({
          success: true,
          message: 'Configuration updated successfully',
        });
      } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Example: Batched requests endpoint
    app.post('/api/batch', middleware.requestBatching(), async (req, res) => {
      // The batching middleware will handle grouping similar requests
      // This endpoint would process the batched requests
      res.json({
        success: true,
        message: 'Batch request processed',
        batchId: req.headers['x-batch-id'],
      });
    });

    // Error handling middleware
    app.use(
      (
        error: Error,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        console.error('Unhandled error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message,
          optimizations: {
            enabled: optimizationManager.getConfig().enabled,
            systemHealth: 'degraded',
          },
        });
      },
    );
  } catch (error) {
    console.error('❌ Failed to setup optimization:', error);
    process.exit(1);
  }
}

// Server startup
async function startServer() {
  await setupOptimization();

  app.listen(port, () => {
    console.log(
      `🚀 IntelGraph server with optimization running on port ${port}`,
    );
    console.log(`📊 Dashboard: http://localhost:${port}/api/admin/dashboard`);
    console.log(`📈 Metrics: http://localhost:${port}/api/admin/metrics`);
    console.log(`🚨 Alerts: http://localhost:${port}/api/admin/alerts`);
    console.log(`❤️ Health: http://localhost:${port}/api/admin/health`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await optimizationManager.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  try {
    await optimizationManager.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

/**
 * Usage Examples for Different Scenarios:
 */

// Example 1: Custom cache configuration for specific routes
export const customCacheExample = () => {
  const customCache = optimizationManager
    .getOptimizedQueryMiddleware()
    .responseCache({
      ttl: 600, // 10 minutes
      staleWhileRevalidate: 1200, // 20 minutes stale serving
      shouldCache: (req, res) => {
        // Only cache successful responses
        return res.statusCode === 200 && req.method === 'GET';
      },
      cacheKey: (req) => {
        // Custom cache key generation
        return `custom:${req.user?.id}:${req.path}:${JSON.stringify(req.query)}`;
      },
      tags: ['user_data', 'analytics'], // For targeted invalidation
    });

  return customCache;
};

// Example 2: Circuit breaker with custom configuration
export const customCircuitBreakerExample = () => {
  const circuitBreaker = optimizationManager
    .getOptimizedQueryMiddleware()
    .circuitBreaker({
      failureThreshold: 10, // Open after 10 failures
      resetTimeoutMs: 120000, // Reset after 2 minutes
      monitoringPeriodMs: 15000, // Monitor over 15 seconds
      halfOpenMaxCalls: 5, // Allow 5 test calls in half-open state
    });

  return circuitBreaker;
};

// Example 3: Intelligent model selection with constraints
export const intelligentModelSelectionExample = async () => {
  const selection = await optimizationManager.selectOptimalModel({
    taskType: 'complex_analysis',
    complexity: 0.9, // High complexity
    urgency: 'high',
    qualityRequirement: 0.95, // High quality required
    budgetLimit: 2.0, // $2 budget limit
    maxLatency: 5000, // 5 second max latency
    requiredCapabilities: ['reasoning', 'analysis', 'code'],
    contextSize: 4000, // 4k tokens context
    expectedOutputSize: 1000, // 1k tokens output
    userId: 'user123',
    tenantId: 'tenant456',
  });

  console.log('Selected model:', selection.selectedModel.name);
  console.log('Estimated cost:', selection.costPrediction.estimatedCost);
  console.log('Reasoning:', selection.reasoning);

  return selection;
};

// Example 4: Real-time monitoring and alerting
export const monitoringExample = () => {
  // Listen for optimization events
  optimizationManager['neo4jOptimizer'].on('queryExecuted', (data) => {
    if (data.executionTime > 5000) {
      console.log('⚠️ Slow Neo4j query detected:', data);
    }
  });

  optimizationManager['costOptimizer'].on('budgetAlert', (alert) => {
    console.log('💰 Budget alert:', alert);
    // Send notification to admin
  });

  optimizationManager['monitoringSystem'].on('alertTriggered', (alert) => {
    console.log('🚨 Performance alert:', alert.title);
    if (alert.severity === 'critical') {
      // Trigger automated response
    }
  });
};

export default app;
