"use strict";
// @ts-nocheck
/**
 * Analytics Routes - Performance analytics for every market
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = analyticsRoutes;
async function analyticsRoutes(server) {
    // Real-time dashboard
    server.get('/dashboard', async (request) => {
        const { serviceId } = request.query;
        return server.analyticsCollector.getDashboard(serviceId);
    });
    // Service metrics
    server.get('/services/:id/metrics', async (request) => {
        const { id } = request.params;
        const { start, end } = request.query;
        const period = {
            start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: end ? new Date(end) : new Date(),
        };
        return server.analyticsCollector.getServiceMetrics(id, period);
    });
    // Market analytics
    server.get('/markets/:market', async (request) => {
        const { market } = request.params;
        const { start, end } = request.query;
        const period = {
            start: start ? new Date(start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: end ? new Date(end) : new Date(),
        };
        return server.analyticsCollector.getMarketAnalytics(market, period);
    });
    // Compliance report
    server.get('/services/:id/compliance', async (request) => {
        const { id } = request.params;
        const { framework } = request.query;
        return server.complianceEngine.generateReport(id, framework || 'internal');
    });
}
