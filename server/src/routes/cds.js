"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CrossDomainGuard_js_1 = require("../cds/CrossDomainGuard.js");
const EntityRepo_js_1 = require("../repos/EntityRepo.js");
const database_js_1 = require("../config/database.js");
const router = express_1.default.Router();
// Initialize Repo and Guard
// Note: In a real app, use dependency injection
const pgPool = (0, database_js_1.getPostgresPool)();
const neo4jDriver = (0, database_js_1.getNeo4jDriver)();
const entityRepo = new EntityRepo_js_1.EntityRepo(pgPool, neo4jDriver);
const guard = new CrossDomainGuard_js_1.CrossDomainGuard(entityRepo);
router.post('/transfer', async (req, res) => {
    try {
        const { entityId, sourceDomainId, targetDomainId, justification } = req.body;
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Construct User Security Context from JWT/Session
        // This assumes the user object has these fields, or we default them for simulation
        const userContext = {
            userId: user.id,
            clearance: user.clearance || 'TOP_SECRET', // Default for simulation
            nationality: user.nationality || 'USA',
            accessCompartments: user.accessCompartments || [],
            authorizedDomains: user.authorizedDomains || ['high-side', 'low-side'],
        };
        const result = await guard.processTransfer({
            entityId,
            sourceDomainId,
            targetDomainId,
            justification,
            userContext,
        });
        if (result.success) {
            res.json(result);
        }
        else {
            res.status(403).json(result);
        }
    }
    catch (error) {
        console.error('CDS Transfer Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.get('/domains', (req, res) => {
    res.json([
        { id: 'high-side', name: 'High Side (TS/SCI)', classification: 'TOP_SECRET' },
        { id: 'low-side', name: 'Low Side (UNCLASSIFIED)', classification: 'UNCLASSIFIED' }
    ]);
});
exports.default = router;
