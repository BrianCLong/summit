"use strict";
/**
 * CompanyOS API Router
 * Main router for all CompanyOS operational endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompanyOSRouter = createCompanyOSRouter;
const express_1 = require("express");
const incidentRoutes_1 = require("./incidentRoutes");
const deploymentRoutes_1 = require("./deploymentRoutes");
const alertRoutes_1 = require("./alertRoutes");
function createCompanyOSRouter(db) {
    const router = (0, express_1.Router)();
    // Mount route modules
    router.use('/incidents', (0, incidentRoutes_1.createIncidentRoutes)(db));
    router.use('/deployments', (0, deploymentRoutes_1.createDeploymentRoutes)(db));
    router.use('/alerts', (0, alertRoutes_1.createAlertRoutes)(db));
    // Health check endpoint
    router.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'companyos-api',
            timestamp: new Date().toISOString(),
        });
    });
    // Dashboard summary endpoint
    router.get('/dashboard', async (req, res) => {
        try {
            // Fetch summary data for dashboard
            const activeIncidents = await db.query('SELECT * FROM maestro.active_incidents_view LIMIT 10');
            const firingAlerts = await db.query('SELECT * FROM maestro.alerts WHERE status = $1 ORDER BY triggered_at DESC LIMIT 10', ['firing']);
            const recentDeployments = await db.query('SELECT * FROM maestro.deployments ORDER BY started_at DESC LIMIT 10');
            const sloViolations = await db.query('SELECT * FROM maestro.slo_violations WHERE resolved_at IS NULL ORDER BY triggered_at DESC LIMIT 10');
            res.json({
                activeIncidents: activeIncidents.rows,
                firingAlerts: firingAlerts.rows,
                recentDeployments: recentDeployments.rows,
                sloViolations: sloViolations.rows,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({ error: 'Failed to fetch dashboard data' });
        }
    });
    return router;
}
