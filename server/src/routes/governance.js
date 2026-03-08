"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const SchemaRegistryService_js_1 = require("../governance/ontology/SchemaRegistryService.js");
const WorkflowService_js_1 = require("../governance/ontology/WorkflowService.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
router.use((0, rateLimit_js_1.createRouteRateLimitMiddleware)('governance'));
const registry = SchemaRegistryService_js_1.SchemaRegistryService.getInstance();
const workflow = WorkflowService_js_1.WorkflowService.getInstance();
// Schema Routes
router.get('/schemas', auth_js_1.ensureAuthenticated, (req, res) => {
    res.json(registry.listSchemas());
});
router.get('/schemas/latest', auth_js_1.ensureAuthenticated, (req, res) => {
    const schema = registry.getLatestSchema();
    if (!schema)
        return res.status(404).json({ error: 'No active schema' });
    res.json(schema);
});
router.get('/schemas/:id', auth_js_1.ensureAuthenticated, (req, res) => {
    const schema = registry.getSchemaById((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    if (!schema)
        return res.status(404).json({ error: 'Schema not found' });
    res.json(schema);
});
// Vocabulary Routes
router.get('/vocabularies', auth_js_1.ensureAuthenticated, (req, res) => {
    res.json(registry.listVocabularies());
});
router.post('/vocabularies', auth_js_1.ensureAuthenticated, (req, res) => {
    try {
        // Permission check: Only schema.admin can create vocabularies
        const userRoles = req.user?.role?.split(',') || [];
        const hasSchemaAdminPermission = userRoles.includes('schema.admin') ||
            userRoles.includes('admin') ||
            req.user?.permissions?.includes('schema.admin');
        if (!hasSchemaAdminPermission) {
            return res.status(403).json({
                error: 'Forbidden: schema.admin permission required to create vocabularies'
            });
        }
        const { name, description, concepts } = req.body;
        const vocab = registry.createVocabulary(name, description, concepts);
        res.status(201).json(vocab);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// Change Request Routes
router.get('/changes', auth_js_1.ensureAuthenticated, (req, res) => {
    res.json(workflow.listChangeRequests());
});
router.post('/changes', auth_js_1.ensureAuthenticated, (req, res) => {
    try {
        const { title, description, proposedChanges } = req.body;
        const author = req.user?.id || 'unknown';
        const cr = workflow.createChangeRequest(title, description, author, proposedChanges);
        res.status(201).json(cr);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
router.get('/changes/:id', auth_js_1.ensureAuthenticated, (req, res) => {
    const cr = workflow.getChangeRequest((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    if (!cr)
        return res.status(404).json({ error: 'Change Request not found' });
    res.json(cr);
});
router.get('/changes/:id/impact', auth_js_1.ensureAuthenticated, (req, res) => {
    // Determine impact
    const impact = workflow.calculateImpact((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    res.json(impact);
});
router.post('/changes/:id/review', auth_js_1.ensureAuthenticated, (req, res) => {
    try {
        const { decision, comment } = req.body;
        const reviewer = req.user?.id || 'unknown';
        const cr = workflow.reviewChangeRequest((0, http_param_js_1.firstStringOr)(req.params.id, ''), reviewer, decision, comment);
        res.json(cr);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
router.post('/changes/:id/merge', auth_js_1.ensureAuthenticated, (req, res) => {
    try {
        const merger = req.user?.id || 'unknown';
        const newSchema = workflow.mergeChangeRequest((0, http_param_js_1.firstStringOr)(req.params.id, ''), merger);
        res.json(newSchema);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
exports.default = router;
