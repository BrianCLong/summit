"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntelGraphAPI = void 0;
const express_1 = __importDefault(require("express"));
class IntelGraphAPI {
    backend;
    router = express_1.default.Router();
    constructor(backend) {
        this.backend = backend;
        this.setupRoutes();
    }
    setupRoutes() {
        this.router.get('/tenants/:tenantId/nodes', async (req, res) => {
            // Security check: Verify tenant isolation
            // Assuming req.user is populated by upstream auth middleware
            const userTenantId = req.user?.tenantId;
            const requestedTenantId = req.params.tenantId;
            if (!userTenantId || userTenantId !== requestedTenantId) {
                res.status(403).json({ error: 'Access denied: Tenant mismatch' });
                return;
            }
            const { type } = req.query;
            try {
                const nodes = await this.backend.queryNodes(requestedTenantId, type);
                res.json(nodes);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.router.post('/nodes', async (req, res) => {
            // Internal use or high-privilege only - strictly check tenant
            const userTenantId = req.user?.tenantId;
            if (!userTenantId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const bodyTenantId = req.body.tenantId;
            if (bodyTenantId && bodyTenantId !== userTenantId) {
                res.status(403).json({ error: 'Access denied: Cannot create nodes for other tenants' });
                return;
            }
            try {
                const node = await this.backend.createNode({
                    ...req.body,
                    tenantId: userTenantId // Force tenantId from auth context
                });
                res.status(201).json(node);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
}
exports.IntelGraphAPI = IntelGraphAPI;
