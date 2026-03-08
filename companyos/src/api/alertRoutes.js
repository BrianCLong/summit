"use strict";
/**
 * Alert API Routes
 * REST endpoints for alert management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlertRoutes = createAlertRoutes;
const express_1 = require("express");
const alertService_1 = require("../services/alertService");
function createAlertRoutes(db) {
    const router = (0, express_1.Router)();
    const alertService = new alertService_1.AlertService(db);
    // GET /api/companyos/alerts - List alerts
    router.get('/', async (req, res) => {
        try {
            const filter = {};
            if (req.query.alertName)
                filter.alertName = req.query.alertName;
            if (req.query.severity)
                filter.severity = req.query.severity;
            if (req.query.status)
                filter.status = req.query.status;
            if (req.query.serviceName)
                filter.serviceName = req.query.serviceName;
            if (req.query.fromDate)
                filter.fromDate = new Date(req.query.fromDate);
            if (req.query.toDate)
                filter.toDate = new Date(req.query.toDate);
            const limit = parseInt(req.query.limit) || 25;
            const offset = parseInt(req.query.offset) || 0;
            const alerts = await alertService.listAlerts(filter, limit, offset);
            res.json({ alerts, count: alerts.length });
        }
        catch (error) {
            console.error('Error listing alerts:', error);
            res.status(500).json({ error: 'Failed to list alerts' });
        }
    });
    // GET /api/companyos/alerts/firing - Get firing alerts
    router.get('/firing', async (req, res) => {
        try {
            const alerts = await alertService.getFiringAlerts();
            res.json({ alerts });
        }
        catch (error) {
            console.error('Error fetching firing alerts:', error);
            res.status(500).json({ error: 'Failed to fetch firing alerts' });
        }
    });
    // GET /api/companyos/alerts/metrics - Get alert metrics
    router.get('/metrics', async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const metrics = await alertService.getAlertMetrics(days);
            res.json({ metrics });
        }
        catch (error) {
            console.error('Error fetching alert metrics:', error);
            res.status(500).json({ error: 'Failed to fetch alert metrics' });
        }
    });
    // GET /api/companyos/alerts/:id - Get alert by ID
    router.get('/:id', async (req, res) => {
        try {
            const alert = await alertService.getAlert(req.params.id);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error fetching alert:', error);
            res.status(500).json({ error: 'Failed to fetch alert' });
        }
    });
    // POST /api/companyos/alerts - Create alert
    router.post('/', async (req, res) => {
        try {
            // Check for duplicate using fingerprint
            if (req.body.fingerprint) {
                const existing = await alertService.findByFingerprint(req.body.fingerprint);
                if (existing && existing.status === 'firing') {
                    // Alert already exists and is firing, return existing
                    return res.json({ alert: existing, deduplicated: true });
                }
            }
            const input = req.body;
            const alert = await alertService.createAlert(input);
            res.status(201).json({ alert });
        }
        catch (error) {
            console.error('Error creating alert:', error);
            res.status(500).json({ error: 'Failed to create alert' });
        }
    });
    // PATCH /api/companyos/alerts/:id - Update alert
    router.patch('/:id', async (req, res) => {
        try {
            const input = req.body;
            const alert = await alertService.updateAlert(req.params.id, input);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error updating alert:', error);
            res.status(500).json({ error: 'Failed to update alert' });
        }
    });
    // POST /api/companyos/alerts/:id/acknowledge - Acknowledge alert
    router.post('/:id/acknowledge', async (req, res) => {
        try {
            const acknowledgedBy = req.user?.id || req.body.acknowledgedBy || 'system';
            const alert = await alertService.acknowledgeAlert(req.params.id, acknowledgedBy);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error acknowledging alert:', error);
            res.status(500).json({ error: 'Failed to acknowledge alert' });
        }
    });
    // POST /api/companyos/alerts/:id/resolve - Resolve alert
    router.post('/:id/resolve', async (req, res) => {
        try {
            const alert = await alertService.resolveAlert(req.params.id);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error resolving alert:', error);
            res.status(500).json({ error: 'Failed to resolve alert' });
        }
    });
    // POST /api/companyos/alerts/:id/silence - Silence alert
    router.post('/:id/silence', async (req, res) => {
        try {
            const alert = await alertService.silenceAlert(req.params.id);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error silencing alert:', error);
            res.status(500).json({ error: 'Failed to silence alert' });
        }
    });
    // POST /api/companyos/alerts/:id/link-incident - Link alert to incident
    router.post('/:id/link-incident', async (req, res) => {
        try {
            const { incidentId } = req.body;
            if (!incidentId) {
                return res.status(400).json({ error: 'Missing incidentId' });
            }
            const alert = await alertService.linkToIncident(req.params.id, incidentId);
            if (!alert) {
                return res.status(404).json({ error: 'Alert not found' });
            }
            res.json({ alert });
        }
        catch (error) {
            console.error('Error linking alert to incident:', error);
            res.status(500).json({ error: 'Failed to link alert to incident' });
        }
    });
    return router;
}
