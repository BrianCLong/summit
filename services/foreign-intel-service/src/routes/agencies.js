"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agenciesRouter = void 0;
const express_1 = require("express");
const foreign_intelligence_1 = require("@intelgraph/foreign-intelligence");
exports.agenciesRouter = (0, express_1.Router)();
const tracker = new foreign_intelligence_1.AgencyTracker();
// List agencies
exports.agenciesRouter.get('/', async (req, res) => {
    try {
        const { country, agencyType, classification } = req.query;
        // TODO: Query from database
        res.json({ agencies: [], total: 0, filters: { country, agencyType, classification } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get agency
exports.agenciesRouter.get('/:id', async (req, res) => {
    try {
        // TODO: Query from database
        res.status(404).json({ error: 'Agency not found' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create agency
exports.agenciesRouter.post('/', async (req, res) => {
    try {
        const agency = tracker.createAgencyProfile({
            ...req.body,
            tenantId: req.body.tenantId || 'default',
        });
        res.status(201).json(agency);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
// Get agency assessment
exports.agenciesRouter.get('/:id/assessment', async (req, res) => {
    try {
        // TODO: Fetch agency from database
        const agency = null;
        if (!agency)
            return res.status(404).json({ error: 'Agency not found' });
        const assessment = tracker.getAgencyAssessment(agency);
        res.json(assessment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Organizational units
exports.agenciesRouter.get('/:id/units', async (req, res) => {
    try {
        // TODO: Query organizational units
        res.json({ units: [], total: 0 });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.agenciesRouter.post('/:id/units', async (req, res) => {
    try {
        const { id } = req.params;
        const units = tracker.mapOrganizationalStructure(id, [req.body]);
        res.status(201).json(units[0]);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
// Leadership profiles
exports.agenciesRouter.get('/:id/leadership', async (req, res) => {
    try {
        // TODO: Query leadership profiles
        res.json({ leaders: [], total: 0 });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.agenciesRouter.post('/:id/leadership', async (req, res) => {
    try {
        const profile = foreign_intelligence_1.leadershipProfileSchema.parse({
            ...req.body,
            id: crypto.randomUUID(),
            agencyId: req.params.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: req.body.tenantId || 'default',
        });
        res.status(201).json(profile);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
// Operational priorities
exports.agenciesRouter.get('/:id/priorities', async (req, res) => {
    try {
        // TODO: Query operational priorities
        res.json({ priorities: [], total: 0 });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.agenciesRouter.post('/:id/priorities', async (req, res) => {
    try {
        const priority = foreign_intelligence_1.operationalPrioritySchema.parse({
            ...req.body,
            id: crypto.randomUUID(),
            agencyId: req.params.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: req.body.tenantId || 'default',
        });
        res.status(201).json(priority);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
