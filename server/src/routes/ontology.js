"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OntologyExecutionService_js_1 = require("../governance/ontology/OntologyExecutionService.js");
const SchemaRegistryService_js_1 = require("../governance/ontology/SchemaRegistryService.js");
const opa_client_js_1 = require("../services/opa-client.js");
const async_handler_js_1 = require("../middleware/async-handler.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
const executionService = OntologyExecutionService_js_1.OntologyExecutionService.getInstance();
const registryService = SchemaRegistryService_js_1.SchemaRegistryService.getInstance();
// Validate
router.post('/validate', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { entityType, data } = req.body;
    if (!entityType || !data) {
        return res.status(400).json({ error: 'Missing entityType or data' });
    }
    const result = await executionService.validate(entityType, data);
    res.json(result);
}));
// Infer
router.post('/infer', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { assertions } = req.body;
    if (!assertions || !Array.isArray(assertions)) {
        return res.status(400).json({ error: 'Missing assertions array' });
    }
    const result = await executionService.infer(assertions);
    res.json(result);
}));
// Explain
router.post('/explain', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const { assertion } = req.body;
    if (!assertion) {
        return res.status(400).json({ error: 'Missing assertion' });
    }
    const result = await executionService.explain(assertion);
    res.json({ explanation: result });
}));
// Get Active Schema
router.get('/schema', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const schema = registryService.getLatestSchema();
    if (!schema) {
        // Try to ensure initialized if first run
        await registryService.ensureInitialized();
        const retry = registryService.getLatestSchema();
        if (!retry)
            return res.status(404).json({ error: 'No active schema found' });
        return res.json(retry);
    }
    res.json(schema);
}));
// Get specific schema
router.get('/schema/:version', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const schema = registryService.getSchema((0, http_param_js_1.firstStringOr)(req.params.version, ''));
    if (!schema) {
        return res.status(404).json({ error: 'Schema version not found' });
    }
    res.json(schema);
}));
// Create Schema (Draft) - Protected by OPA
router.post('/schema', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // OPA Check
    const opaInput = {
        user: {
            id: user.id,
            roles: user.roles || []
        },
        action: 'create_draft',
        resource: { type: 'schema' }
    };
    try {
        const allowed = await opa_client_js_1.opaClient.evaluateQuery('ontology/allow', opaInput);
        if (allowed !== true) {
            return res.status(403).json({ error: 'Policy denied schema creation' });
        }
    }
    catch (e) {
        console.error('OPA check failed', e);
        // Fail closed
        return res.status(500).json({ error: 'Policy check failed' });
    }
    const { definition, changelog } = req.body;
    const schema = await registryService.registerSchema(definition, changelog, user.id);
    res.status(201).json(schema);
}));
// Approve Schema - Protected by OPA
router.post('/schema/:id/approve', (0, async_handler_js_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const schemaId = (0, http_param_js_1.firstStringOr)(req.params.id, '');
    const schema = registryService.getSchemaById(schemaId);
    if (!schema) {
        return res.status(404).json({ error: 'Schema not found' });
    }
    const opaInput = {
        user: {
            id: user.id,
            roles: user.roles || []
        },
        action: 'approve_schema',
        resource: {
            type: 'schema',
            status: schema.status,
            version: schema.version,
            previousVersion: '0.0.0',
            hasBreakingChanges: false
        }
    };
    try {
        const allowed = await opa_client_js_1.opaClient.evaluateQuery('ontology/allow', opaInput);
        if (allowed !== true) {
            return res.status(403).json({ error: 'Policy denied schema approval' });
        }
    }
    catch (e) {
        console.error('OPA check failed', e);
        // Fail closed
        return res.status(500).json({ error: 'Policy check failed' });
    }
    await registryService.activateSchema(schemaId, user.id);
    res.json({ status: 'approved', schemaId });
}));
exports.default = router;
