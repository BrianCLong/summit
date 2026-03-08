"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incident_service_1 = require("../services/incident.service");
const opa_1 = require("../lib/opa");
const router = (0, express_1.Router)();
const incidentService = new incident_service_1.IncidentService();
/**
 * @description Create a new incident
 * @route POST /incidents
 */
router.post('/incidents', (0, opa_1.authorize)('create'), (req, res) => {
    const { tenant_id, title, severity, owner_id } = req.body;
    if (!tenant_id || !title || !severity || !owner_id) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    const newIncident = incidentService.createIncident(req.body);
    res.status(201).json({ message: 'Incident created successfully', data: newIncident });
});
/**
 * @description Get all incidents for the current tenant, with filtering
 * @route GET /incidents
 */
router.get('/incidents', (0, opa_1.authorize)('view'), (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'tenant-123';
    const { tag, status, owner_id } = req.query;
    const filters = {
        tag: tag,
        status: status,
        owner_id: owner_id,
    };
    const incidents = incidentService.getIncidents(tenantId, filters);
    res.status(200).json({ message: 'Incidents retrieved successfully', data: incidents });
});
/**
 * @description Get a single incident by its ID
 * @route GET /incidents/:id
 */
router.get('/incidents/:id', (0, opa_1.authorize)('view'), (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'tenant-123';
    const incident = incidentService.getIncidentById(req.params.id, tenantId);
    if (incident) {
        res.status(200).json({ message: `Incident ${req.params.id} retrieved successfully`, data: incident });
    }
    else {
        res.status(404).json({ message: 'Incident not found' });
    }
});
/**
 * @description Update an existing incident
 * @route PATCH /incidents/:id
 */
router.patch('/incidents/:id', (0, opa_1.authorize)('update'), (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'tenant-123';
    const updatedIncident = incidentService.updateIncident(req.params.id, tenantId, req.body);
    if (updatedIncident) {
        res.status(200).json({ message: `Incident ${req.params.id} updated successfully`, data: updatedIncident });
    }
    else {
        res.status(404).json({ message: 'Incident not found' });
    }
});
exports.default = router;
