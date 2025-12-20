/**
 * Analytics Routes - Performance analytics for every market
 */

import type { FastifyInstance } from 'fastify';

export async function analyticsRoutes(server: FastifyInstance) {
  // Real-time dashboard
  server.get('/dashboard', async (request) => {
    const { serviceId } = request.query as { serviceId?: string };
    return server.analyticsCollector.getDashboard(serviceId);
  });

  // Service metrics
  server.get('/services/:id/metrics', async (request) => {
    const { id } = request.params as { id: string };
    const { start, end } = request.query as { start?: string; end?: string };

    const period = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return server.analyticsCollector.getServiceMetrics(id, period);
  });

  // Market analytics
  server.get('/markets/:market', async (request) => {
    const { market } = request.params as { market: string };
    const { start, end } = request.query as { start?: string; end?: string };

    const period = {
      start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: end ? new Date(end) : new Date(),
    };

    return server.analyticsCollector.getMarketAnalytics(market, period);
  });

  // Compliance report
  server.get('/services/:id/compliance', async (request) => {
    const { id } = request.params as { id: string };
    const { framework } = request.query as { framework?: string };

    return server.complianceEngine.generateReport(
      id,
      (framework as 'fedramp' | 'soc2' | 'hipaa' | 'gdpr') || 'internal',
    );
  });
}
