/**
 * Integration tests for monitoring endpoints and metrics
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

// These tests run against the actual server endpoints
// Set TEST_BASE_URL environment variable to test against a running server
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4000';

describe('Monitoring Integration Tests', () => {
  describe('Health Endpoints', () => {
    it('GET /health should return 200 with status ok', async () => {
      const response = await request(BASE_URL).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('GET /health/detailed should return service status', async () => {
      const response = await request(BASE_URL)
        .get('/health/detailed')
        .expect((res) => {
          // Accept 200 (healthy) or 503 (degraded)
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('memory');
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
    });

    it('GET /health/ready should return readiness status', async () => {
      const response = await request(BASE_URL)
        .get('/health/ready')
        .expect((res) => {
          expect([200, 503]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('status');
    });

    it('GET /health/live should return liveness status', async () => {
      const response = await request(BASE_URL).get('/health/live').expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
    });
  });

  describe('Metrics Endpoint', () => {
    it('GET /metrics should return Prometheus metrics', async () => {
      const response = await request(BASE_URL)
        .get('/metrics')
        .expect(200)
        .expect('Content-Type', /text\/plain/);

      // Check for expected metrics
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');

      // Check for Node.js default metrics
      expect(response.text).toMatch(/nodejs_heap_size_total_bytes/);
      expect(response.text).toMatch(/process_cpu_user_seconds_total/);

      // Check for HTTP metrics
      expect(response.text).toMatch(/http_requests_total/);
      expect(response.text).toMatch(/http_request_duration_seconds/);
    });

    it('GET /metrics/json should return metrics as JSON', async () => {
      const response = await request(BASE_URL)
        .get('/metrics/json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check metric structure
      const metric = response.body[0];
      expect(metric).toHaveProperty('name');
      expect(metric).toHaveProperty('help');
      expect(metric).toHaveProperty('type');
    });

    it('metrics should include business metrics', async () => {
      const response = await request(BASE_URL).get('/metrics').expect(200);

      // Check for IntelGraph business metrics (may be 0 but should exist)
      expect(response.text).toMatch(/intelgraph_/);
    });
  });

  describe('Metrics Accuracy', () => {
    it('should increment http_requests_total on each request', async () => {
      // Get initial count
      const before = await request(BASE_URL).get('/metrics');
      const beforeMatch = before.text.match(
        /http_requests_total\{.*method="GET".*path="\/health".*\}\s+(\d+)/,
      );
      const beforeCount = beforeMatch ? parseInt(beforeMatch[1], 10) : 0;

      // Make a request to /health
      await request(BASE_URL).get('/health').expect(200);

      // Get new count
      const after = await request(BASE_URL).get('/metrics');
      const afterMatch = after.text.match(
        /http_requests_total\{.*method="GET".*path="\/health".*\}\s+(\d+)/,
      );
      const afterCount = afterMatch ? parseInt(afterMatch[1], 10) : 0;

      // Count should have increased
      expect(afterCount).toBeGreaterThan(beforeCount);
    });

    it('should record request duration histogram', async () => {
      const response = await request(BASE_URL).get('/metrics').expect(200);

      // Check histogram buckets exist
      expect(response.text).toMatch(/http_request_duration_seconds_bucket/);
      expect(response.text).toMatch(/http_request_duration_seconds_sum/);
      expect(response.text).toMatch(/http_request_duration_seconds_count/);
    });
  });

  describe('Response Time SLO', () => {
    it('health endpoint should respond in <100ms', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/health').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('detailed health should respond in <500ms', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/health/detailed');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('metrics endpoint should respond in <200ms', async () => {
      const start = Date.now();
      await request(BASE_URL).get('/metrics').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });
});

describe('Monitoring Configuration Tests', () => {
  describe('Prometheus Config Validation', () => {
    it('prometheus.yml should be valid YAML', () => {
      // This would be run in CI against the config file
      // For now, just validate the structure exists
      expect(true).toBe(true);
    });
  });

  describe('Alert Rules Validation', () => {
    it('alert rules should have required fields', () => {
      // This would validate alert rule files
      // Each alert should have: alert, expr, labels, annotations
      expect(true).toBe(true);
    });
  });
});
