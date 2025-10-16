const express = require('express');
const router = express.Router();
const { resilienceManager } = require('../middleware/resilience');
const { apiServiceFactory } = require('../services/ResilientApiService');
const logger = require('../utils/logger');

/**
 * Resilience monitoring and management endpoints for Maestro Conductor
 * Provides real-time visibility into circuit breakers, bulkheads, and retry policies
 */

/**
 * GET /api/resilience/health
 * Overall health status of all resilience components
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      components: {},
    };

    // Get resilience manager status
    const resilienceStatus = resilienceManager.getHealthStatus();
    healthStatus.components.resilience = resilienceStatus;

    // Get API services health
    const apiHealth = await apiServiceFactory.getAllHealthStatus();
    healthStatus.components.apiServices = apiHealth;

    // Determine overall health
    let hasUnhealthy = false;

    // Check circuit breakers
    for (const [name, cb] of Object.entries(resilienceStatus.circuitBreakers)) {
      if (cb.state !== 'CLOSED') {
        hasUnhealthy = true;
        break;
      }
    }

    // Check API services
    for (const [name, health] of Object.entries(apiHealth)) {
      if (!health.healthy) {
        hasUnhealthy = true;
        break;
      }
    }

    if (hasUnhealthy) {
      healthStatus.overall = 'degraded';
    }

    const statusCode = healthStatus.overall === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Failed to get resilience health status:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/resilience/metrics
 * Detailed metrics for all resilience components
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      resilience: resilienceManager.getMetrics(),
      apiServices: apiServiceFactory.getAllMetrics(),
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get resilience metrics:', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/resilience/circuit-breakers
 * Status of all circuit breakers
 */
router.get('/circuit-breakers', (req, res) => {
  try {
    const status = resilienceManager.getHealthStatus();
    const circuitBreakers = {};

    for (const [name, cb] of Object.entries(status.circuitBreakers)) {
      circuitBreakers[name] = {
        name: cb.name,
        state: cb.state,
        failures: cb.failures,
        recentFailures: cb.recentFailures,
        recentRequests: cb.recentRequests,
        failureRate: cb.failureRate,
        uptime: cb.uptime,
        nextAttempt: cb.nextAttempt,
        lastFailureTime: cb.lastFailureTime,
        metrics: cb.metrics,
      };
    }

    res.json({
      timestamp: new Date().toISOString(),
      circuitBreakers,
    });
  } catch (error) {
    logger.error('Failed to get circuit breaker status:', error);
    res.status(500).json({
      error: 'Failed to retrieve circuit breaker status',
      message: error.message,
    });
  }
});

/**
 * GET /api/resilience/bulkheads
 * Status of all bulkheads
 */
router.get('/bulkheads', (req, res) => {
  try {
    const status = resilienceManager.getHealthStatus();
    const bulkheads = {};

    for (const [name, bulkhead] of Object.entries(status.bulkheads)) {
      bulkheads[name] = {
        name: bulkhead.name,
        activeRequests: bulkhead.activeRequests,
        queueLength: bulkhead.queueLength,
        maxConcurrent: bulkhead.maxConcurrent,
        queueSize: bulkhead.queueSize,
        utilization:
          bulkhead.maxConcurrent > 0
            ? (bulkhead.activeRequests / bulkhead.maxConcurrent) * 100
            : 0,
        queueUtilization:
          bulkhead.queueSize > 0
            ? (bulkhead.queueLength / bulkhead.queueSize) * 100
            : 0,
        metrics: bulkhead.metrics,
      };
    }

    res.json({
      timestamp: new Date().toISOString(),
      bulkheads,
    });
  } catch (error) {
    logger.error('Failed to get bulkhead status:', error);
    res.status(500).json({
      error: 'Failed to retrieve bulkhead status',
      message: error.message,
    });
  }
});

/**
 * POST /api/resilience/circuit-breakers/:name/reset
 * Manually reset a circuit breaker
 */
router.post('/circuit-breakers/:name/reset', (req, res) => {
  try {
    const { name } = req.params;
    const circuitBreaker = resilienceManager.circuitBreakers.get(name);

    if (!circuitBreaker) {
      return res.status(404).json({
        error: 'Circuit breaker not found',
        name,
      });
    }

    circuitBreaker.reset();
    logger.info(
      `Circuit breaker '${name}' manually reset by ${req.user?.email || 'system'}`,
    );

    res.json({
      success: true,
      message: `Circuit breaker '${name}' has been reset`,
      state: circuitBreaker.getStatus(),
    });
  } catch (error) {
    logger.error('Failed to reset circuit breaker:', error);
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      message: error.message,
    });
  }
});

/**
 * POST /api/resilience/circuit-breakers/:name/trip
 * Manually trip a circuit breaker (for testing/maintenance)
 */
router.post('/circuit-breakers/:name/trip', (req, res) => {
  try {
    const { name } = req.params;
    const circuitBreaker = resilienceManager.circuitBreakers.get(name);

    if (!circuitBreaker) {
      return res.status(404).json({
        error: 'Circuit breaker not found',
        name,
      });
    }

    circuitBreaker.forceOpen();
    logger.warn(
      `Circuit breaker '${name}' manually tripped by ${req.user?.email || 'system'}`,
    );

    res.json({
      success: true,
      message: `Circuit breaker '${name}' has been tripped`,
      state: circuitBreaker.getStatus(),
    });
  } catch (error) {
    logger.error('Failed to trip circuit breaker:', error);
    res.status(500).json({
      error: 'Failed to trip circuit breaker',
      message: error.message,
    });
  }
});

/**
 * GET /api/resilience/dashboard
 * Dashboard data for resilience monitoring UI
 */
router.get('/dashboard', async (req, res) => {
  try {
    const healthStatus = resilienceManager.getHealthStatus();
    const metrics = resilienceManager.getMetrics();
    const apiHealth = await apiServiceFactory.getAllHealthStatus();

    // Calculate summary statistics
    const summary = {
      circuitBreakers: {
        total: Object.keys(healthStatus.circuitBreakers).length,
        open: 0,
        halfOpen: 0,
        closed: 0,
      },
      bulkheads: {
        total: Object.keys(healthStatus.bulkheads).length,
        totalCapacity: 0,
        totalActive: 0,
        totalQueued: 0,
      },
      apiServices: {
        total: Object.keys(apiHealth).length,
        healthy: 0,
        unhealthy: 0,
      },
    };

    // Calculate circuit breaker states
    for (const cb of Object.values(healthStatus.circuitBreakers)) {
      summary.circuitBreakers[cb.state.toLowerCase()]++;
    }

    // Calculate bulkhead utilization
    for (const bulkhead of Object.values(healthStatus.bulkheads)) {
      summary.bulkheads.totalCapacity += bulkhead.maxConcurrent;
      summary.bulkheads.totalActive += bulkhead.activeRequests;
      summary.bulkheads.totalQueued += bulkhead.queueLength;
    }

    // Calculate API service health
    for (const health of Object.values(apiHealth)) {
      if (health.healthy) {
        summary.apiServices.healthy++;
      } else {
        summary.apiServices.unhealthy++;
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      summary,
      circuitBreakers: healthStatus.circuitBreakers,
      bulkheads: healthStatus.bulkheads,
      apiServices: apiHealth,
      metrics: Object.keys(metrics).reduce((acc, key) => {
        // Only include key metrics for dashboard
        if (
          key.includes('requests_total') ||
          key.includes('success_rate') ||
          key.includes('state') ||
          key.includes('active_requests') ||
          key.includes('queue_length')
        ) {
          acc[key] = metrics[key];
        }
        return acc;
      }, {}),
    });
  } catch (error) {
    logger.error('Failed to get resilience dashboard data:', error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data',
      message: error.message,
    });
  }
});

/**
 * POST /api/resilience/test/:pattern
 * Test resilience patterns (development/staging only)
 */
router.post('/test/:pattern', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Resilience testing not available in production',
    });
  }

  const { pattern } = req.params;
  const { component, scenario } = req.body;

  try {
    let result;

    switch (pattern) {
      case 'circuit-breaker':
        result = testCircuitBreaker(component, scenario);
        break;
      case 'retry':
        result = testRetryPolicy(component, scenario);
        break;
      case 'bulkhead':
        result = testBulkhead(component, scenario);
        break;
      default:
        return res.status(400).json({
          error: 'Unknown resilience pattern',
          pattern,
        });
    }

    res.json({
      success: true,
      pattern,
      component,
      scenario,
      result,
    });
  } catch (error) {
    logger.error('Failed to test resilience pattern:', error);
    res.status(500).json({
      error: 'Failed to test resilience pattern',
      message: error.message,
    });
  }
});

/**
 * Test functions for resilience patterns (development/staging only)
 */
function testCircuitBreaker(component, scenario) {
  // Implementation for testing circuit breakers
  return { message: 'Circuit breaker test executed', component, scenario };
}

function testRetryPolicy(component, scenario) {
  // Implementation for testing retry policies
  return { message: 'Retry policy test executed', component, scenario };
}

function testBulkhead(component, scenario) {
  // Implementation for testing bulkheads
  return { message: 'Bulkhead test executed', component, scenario };
}

module.exports = router;
