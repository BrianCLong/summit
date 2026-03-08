"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capabilitiesRouter = void 0;
const express_1 = require("express");
const foreign_intelligence_1 = require("@intelgraph/foreign-intelligence");
const technical_intelligence_1 = require("@intelgraph/technical-intelligence");
exports.capabilitiesRouter = (0, express_1.Router)();
const analyzer = new technical_intelligence_1.TechintAnalyzer();
// List capability assessments
exports.capabilitiesRouter.get('/', async (req, res) => {
    try {
        const { agencyId, capabilityType, maturityLevel } = req.query;
        // TODO: Query from database
        res.json({ assessments: [], total: 0, filters: { agencyId, capabilityType, maturityLevel } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create capability assessment
exports.capabilitiesRouter.post('/', async (req, res) => {
    try {
        const assessment = foreign_intelligence_1.capabilityAssessmentSchema.parse({
            ...req.body,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: req.body.tenantId || 'default',
        });
        res.status(201).json(assessment);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
// Get capability assessment
exports.capabilitiesRouter.get('/:id', async (req, res) => {
    try {
        // TODO: Query from database
        res.status(404).json({ error: 'Assessment not found' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// List doctrines
exports.capabilitiesRouter.get('/doctrine', async (req, res) => {
    try {
        const { agencyId, category } = req.query;
        // TODO: Query from database
        res.json({ doctrines: [], total: 0, filters: { agencyId, category } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create doctrine record
exports.capabilitiesRouter.post('/doctrine', async (req, res) => {
    try {
        const doctrine = foreign_intelligence_1.doctrineSchema.parse({
            ...req.body,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tenantId: req.body.tenantId || 'default',
        });
        res.status(201).json(doctrine);
    }
    catch (error) {
        res.status(400).json({ error: 'Validation failed', details: error.message });
    }
});
// Assess technical capability
exports.capabilitiesRouter.post('/assess', async (req, res) => {
    try {
        const { platforms, technology, sophistication } = req.body;
        const capability = analyzer.assessCapability({ platforms, technology, sophistication });
        res.json({ ...capability, assessedAt: new Date().toISOString() });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
