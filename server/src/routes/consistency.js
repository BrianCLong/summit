"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_js_1 = require("../config/database.js");
const GraphConsistencyService_js_1 = require("../services/consistency/GraphConsistencyService.js");
const ConsistencyStore_js_1 = require("../services/consistency/ConsistencyStore.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
router.use(auth_js_1.ensureAuthenticated);
router.get('/reports', async (req, res) => {
    try {
        const store = new ConsistencyStore_js_1.ConsistencyStore();
        // Fetch cached reports which are updated by the background worker
        const reports = await store.getReports();
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/check/:investigationId', async (req, res) => {
    try {
        const pg = (0, database_js_1.getPostgresPool)();
        const neo4j = (0, database_js_1.getNeo4jDriver)();
        const service = new GraphConsistencyService_js_1.GraphConsistencyService(pg, neo4j);
        const investigationId = req.params.investigationId;
        const { rows } = await pg.query('SELECT tenant_id FROM investigations WHERE id = $1', [investigationId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Investigation not found' });
        }
        const tenantId = rows[0].tenant_id;
        // Real-time check for specific investigation is allowed
        const report = await service.checkInvestigation(investigationId, tenantId);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/repair/:investigationId', async (req, res) => {
    try {
        const pg = (0, database_js_1.getPostgresPool)();
        const neo4j = (0, database_js_1.getNeo4jDriver)();
        const service = new GraphConsistencyService_js_1.GraphConsistencyService(pg, neo4j);
        const investigationId = req.params.investigationId;
        const { rows } = await pg.query('SELECT tenant_id FROM investigations WHERE id = $1', [investigationId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Investigation not found' });
        }
        const tenantId = rows[0].tenant_id;
        const report = await service.repairInvestigation(investigationId, tenantId);
        // Optionally update cache, but better to let worker do it or do partial update
        // For now, we just return the result.
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
