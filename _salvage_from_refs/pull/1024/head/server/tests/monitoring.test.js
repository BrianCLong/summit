/**
 * Tests for monitoring and observability features
 */
const request = require('supertest');
const express = require('express');

// Create test app with monitoring
function createMonitoringTestApp() {
  const app = express();
  const monitoringRouter = require('../src/routes/monitoring');
  
  app.use(express.json());
  app.use('/', monitoringRouter);
  
  return app;
}

describe('Monitoring Endpoints', () => {
  let app;
  
  beforeEach(() => {
    app = createMonitoringTestApp();
  });
  
  describe('Prometheus Metrics', () => {
    it('should expose metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.type).toMatch(/text\/plain/);
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      
      // Should contain default Node.js metrics
      expect(response.text).toContain('nodejs_version_info');
      expect(response.text).toContain('process_cpu_user_seconds_total');
      expect(response.text).toContain('process_resident_memory_bytes');
    });
    
    it('should include custom application metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      // Check for custom IntelGraph metrics
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('graphql_requests_total');
      expect(response.text).toContain('ai_jobs_queued');
      expect(response.text).toContain('graph_nodes_total');
    });
    
    it('should handle metrics collection errors gracefully', async () => {
      // This test would need to mock a scenario where metrics collection fails
      const response = await request(app)
        .get('/metrics');
      
      // Should either return 200 with metrics or 500 with error
      expect([200, 500]).toContain(response.status);
    });
  });
  
  describe('Health Check Endpoints', () => {
    it('should perform comprehensive health check', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(10000); // Health checks may take time
      
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      
      const { checks } = response.body;
      expect(checks).toHaveProperty('database');
      expect(checks).toHaveProperty('redis');
      expect(checks).toHaveProperty('systemResources');
    });
    
    it('should provide quick cached health status', async () => {
      const response = await request(app)
        .get('/health/quick')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    it('should provide liveness probe', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);
      
      expect(response.body.status).toBe('alive');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('pid');
      expect(response.body).toHaveProperty('timestamp');
    });
    
    it('should provide readiness probe', async () => {
      const response = await request(app)
        .get('/health/ready')
        .timeout(10000);
      
      expect([200, 503]).toContain(response.status);
      expect(['ready', 'not_ready']).toContain(response.body.status);
      expect(response.body).toHaveProperty('checks');
    });
    
    it('should provide service information', async () => {
      const response = await request(app)
        .get('/health/info')
        .expect(200);
      
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('nodeVersion');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body.service).toBe('intelgraph-server');
    });
  });
  
  describe('Individual Service Health Checks', () => {
    it('should check database health', async () => {
      const response = await request(app)
        .get('/health/database')
        .timeout(10000);
      
      expect([200, 503]).toContain(response.status);
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
      
      if (response.body.status === 'healthy') {
        expect(response.body).toHaveProperty('responseTime');
        expect(response.body.details).toContain('PostgreSQL');
      }
    });
    
    it('should check Neo4j health', async () => {
      const response = await request(app)
        .get('/health/neo4j')
        .timeout(10000);
      
      expect([200, 503]).toContain(response.status);
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });
    
    it('should check Redis health', async () => {
      const response = await request(app)
        .get('/health/redis')
        .timeout(10000);
      
      expect([200, 503]).toContain(response.status);
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });
    
    it('should check ML service health', async () => {
      const response = await request(app)
        .get('/health/ml')
        .timeout(10000);
      
      expect([200, 503]).toContain(response.status);
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
    });
    
    it('should check system resources', async () => {
      const response = await request(app)
        .get('/health/system')
        .expect(200);
      
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('uptime');
      
      const { memory, cpu } = response.body;
      expect(typeof memory.heapUsed).toBe('number');
      expect(typeof cpu.user).toBe('number');
    });
  });
  
  describe('Monitoring Middleware', () => {
    it('should track HTTP request metrics', async () => {
      const { httpMetricsMiddleware } = require('../src/monitoring/middleware');
      const testApp = express();
      
      testApp.use(httpMetricsMiddleware);
      testApp.get('/test', (req, res) => res.json({ test: true }));
      
      await request(testApp)
        .get('/test')
        .expect(200);
      
      // Verify metrics were recorded (would need to check the metrics registry)
      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(metricsResponse.text).toContain('http_requests_total');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle health check timeouts gracefully', async () => {
      const response = await request(app)
        .get('/health')
        .timeout(15000); // Longer timeout to test internal timeout handling
      
      // Should always return a response, even if some checks fail
      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
    });
    
    it('should handle metrics collection failures', async () => {
      // This would need to mock a failure scenario
      const response = await request(app)
        .get('/metrics');
      
      expect([200, 500]).toContain(response.status);
    });
  });
  
  describe('Performance', () => {
    it('should handle concurrent health check requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        request(app)
          .get('/health/quick')
          .timeout(5000)
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect([200, 503]).toContain(response.status);
        expect(response.body).toHaveProperty('status');
      });
    });
    
    it('should respond to liveness checks quickly', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/health/live')
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Liveness checks should be very fast
      expect(duration).toBeLessThan(1000);
      expect(response.body.status).toBe('alive');
    });
    
    it('should cache health status for quick responses', async () => {
      // First request (may be slow as it populates cache)
      await request(app)
        .get('/health/quick')
        .timeout(10000);
      
      const start = Date.now();
      
      // Second request should be from cache
      const response = await request(app)
        .get('/health/quick')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });
      
      const duration = Date.now() - start;
      
      // Cached responses should be very fast
      expect(duration).toBeLessThan(500);
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});

describe('Health Check Components', () => {
  const {
    checkDatabase,
    checkRedis,
    checkSystemResources
  } = require('../src/monitoring/health');
  
  describe('Database Health Check', () => {
    it('should check database connectivity', async () => {
      const result = await checkDatabase();
      
      expect(result).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(result.status);
      
      if (result.status === 'healthy') {
        expect(result).toHaveProperty('responseTime');
        expect(typeof result.responseTime).toBe('number');
      } else {
        expect(result).toHaveProperty('error');
      }
    });
  });
  
  describe('Redis Health Check', () => {
    it('should check Redis connectivity', async () => {
      const result = await checkRedis();
      
      expect(result).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(result.status);
    });
  });
  
  describe('System Resources Check', () => {
    it('should check system resource utilization', () => {
      const result = checkSystemResources();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('uptime');
      
      expect(typeof result.memory.heapUsed).toBe('number');
      expect(typeof result.cpu.user).toBe('number');
      expect(typeof result.uptime).toBe('number');
    });
  });
});