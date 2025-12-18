import { MetricsExporter, createMetricsMiddleware } from './index';

describe('MetricsExporter', () => {
  let metrics: MetricsExporter;

  beforeEach(() => {
    metrics = new MetricsExporter({
      serviceName: 'test-service',
      environment: 'test',
      enableDefaultMetrics: false,
    });
  });

  afterEach(() => {
    metrics.reset();
  });

  describe('HTTP Metrics', () => {
    it('should record successful HTTP request', async () => {
      metrics.recordHttpRequest({
        method: 'GET',
        route: '/api/test',
        statusCode: 200,
        duration: 0.5,
        success: true,
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_http_requests_total');
      expect(metricsOutput).toContain('method="GET"');
      expect(metricsOutput).toContain('route="/api/test"');
      expect(metricsOutput).toContain('status_code="200"');
    });

    it('should record failed HTTP request', async () => {
      metrics.recordHttpRequest({
        method: 'POST',
        route: '/api/test',
        statusCode: 500,
        duration: 1.2,
        success: false,
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_http_errors_total');
      expect(metricsOutput).toContain('error_type="server_error"');
    });

    it('should record HTTP request duration', async () => {
      metrics.recordHttpRequest({
        method: 'GET',
        route: '/api/slow',
        statusCode: 200,
        duration: 2.5,
        success: true,
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_http_request_duration_seconds');
    });
  });

  describe('GraphQL Metrics', () => {
    it('should record successful GraphQL request', async () => {
      metrics.recordGraphQLRequest('getEntity', 'query', 0.3, true);

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_graphql_requests_total');
      expect(metricsOutput).toContain('operation_name="getEntity"');
      expect(metricsOutput).toContain('operation_type="query"');
    });

    it('should record failed GraphQL request', async () => {
      metrics.recordGraphQLRequest(
        'createEntity',
        'mutation',
        0.5,
        false,
        'VALIDATION_ERROR'
      );

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_graphql_errors_total');
      expect(metricsOutput).toContain('error_code="VALIDATION_ERROR"');
    });
  });

  describe('Database Metrics', () => {
    it('should record successful database query', async () => {
      metrics.recordDatabaseQuery({
        database: 'neo4j',
        operation: 'match',
        duration: 0.1,
        resultCount: 10,
        success: true,
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_database_query_duration_seconds');
      expect(metricsOutput).toContain('database="neo4j"');
    });

    it('should record failed database query', async () => {
      metrics.recordDatabaseQuery({
        database: 'postgres',
        operation: 'select',
        duration: 0.05,
        success: false,
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_database_errors_total');
    });
  });

  describe('Cost Metrics', () => {
    it('should record cost', async () => {
      metrics.recordCost({
        tenantId: 'tenant-123',
        operation: 'graph_query',
        cost: 0.05,
        resourceType: 'compute',
      });

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_cost_total_dollars');
      expect(metricsOutput).toContain('tenant_id="tenant-123"');
      expect(metricsOutput).toContain('operation="graph_query"');
    });

    it('should update budget utilization', async () => {
      metrics.updateBudgetUtilization('tenant-123', 'daily', 75.5);

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_budget_utilization_percent');
      expect(metricsOutput).toContain('75.5');
    });

    it('should record budget violation', async () => {
      metrics.recordBudgetViolation('tenant-123', 'daily_limit_exceeded');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_budget_violations_total');
      expect(metricsOutput).toContain('violation_type="daily_limit_exceeded"');
    });

    it('should record slow query kill', async () => {
      metrics.recordSlowQueryKill('neo4j', 'tenant-123');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_slow_queries_killed_total');
    });
  });

  describe('Business Metrics', () => {
    it('should record entity creation', async () => {
      metrics.recordEntityCreated('tenant-123', 'Person');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_entities_created_total');
      expect(metricsOutput).toContain('entity_type="Person"');
    });

    it('should record relationship creation', async () => {
      metrics.recordRelationshipCreated('tenant-123', 'WORKS_AT');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_relationships_created_total');
      expect(metricsOutput).toContain('relationship_type="WORKS_AT"');
    });

    it('should record investigation creation', async () => {
      metrics.recordInvestigationCreated('tenant-123');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_investigations_created_total');
    });

    it('should record copilot request', async () => {
      metrics.recordCopilotRequest('tenant-123', 'summarize');

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).toContain('intelgraph_copilot_requests_total');
      expect(metricsOutput).toContain('request_type="summarize"');
    });
  });

  describe('Middleware', () => {
    it('should create metrics middleware', () => {
      const middleware = createMetricsMiddleware(metrics);
      expect(middleware).toBeInstanceOf(Function);
    });

    it('should record metrics through middleware', (done) => {
      const middleware = createMetricsMiddleware(metrics);

      const req = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/test' },
      };

      const res = {
        statusCode: 200,
        on: (event: string, handler: () => void) => {
          if (event === 'finish') {
            handler();
            // Verify metrics were recorded
            metrics.getMetrics().then((output) => {
              expect(output).toContain('intelgraph_http_requests_total');
              done();
            });
          }
        },
      };

      middleware(req, res, () => {
        // Trigger finish event
        res.on('finish', () => {});
      });
    });
  });

  describe('Registry', () => {
    it('should return registry', () => {
      const registry = metrics.getRegistry();
      expect(registry).toBeDefined();
    });

    it('should reset metrics', async () => {
      metrics.recordHttpRequest({
        method: 'GET',
        route: '/test',
        statusCode: 200,
        duration: 0.1,
        success: true,
      });

      metrics.reset();

      const metricsOutput = await metrics.getMetrics();
      expect(metricsOutput).not.toContain('route="/test"');
    });
  });

  describe('Configuration', () => {
    it('should use custom labels', async () => {
      const customMetrics = new MetricsExporter({
        serviceName: 'custom-service',
        environment: 'production',
        labels: {
          cluster: 'us-east-1',
          version: '1.0.0',
        },
        enableDefaultMetrics: false,
      });

      const metricsOutput = await customMetrics.getMetrics();
      expect(metricsOutput).toContain('service="custom-service"');
      expect(metricsOutput).toContain('environment="production"');
      expect(metricsOutput).toContain('cluster="us-east-1"');
      expect(metricsOutput).toContain('version="1.0.0"');
    });
  });
});
