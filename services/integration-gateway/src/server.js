"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = void 0;
const express_1 = __importDefault(require("express"));
const src_1 = require("../../../packages/mandates/src");
const src_2 = require("../../../packages/integration-twin/src");
const ToolRegistry_1 = require("./ToolRegistry");
const Gateway_1 = require("./Gateway");
// import { JiraConnector } from './connectors/JiraConnector'; // Mock connector for demo purposes
const app = (0, express_1.default)();
app.use(express_1.default.json());
const mandates = new src_1.MandateService();
const registry = new ToolRegistry_1.ToolRegistry();
const twin = new src_2.IntegrationTwin();
const gateway = new Gateway_1.Gateway(registry, mandates, twin);
// Discovery Endpoint
app.get('/mcp/v1/tools/list', (req, res) => {
    const tools = registry.getAllTools();
    res.json({ tools });
});
// Invoke Endpoint
app.post('/mcp/v1/tools/call', async (req, res) => {
    const { toolName, args, mandateId, dryRun } = req.body;
    if (!mandateId) {
        return res.status(401).json({ error: 'Missing mandateId' });
    }
    if (dryRun) {
        const result = await gateway.dryRun(mandateId, toolName, args);
        if (!result.allowed) {
            return res.status(403).json(result);
        }
        return res.json(result);
    }
    const result = await gateway.execute(mandateId, toolName, args);
    if (!result.success) {
        return res.status(500).json(result);
    }
    res.json(result);
});
// Mandate Endpoint (for issuance in this demo server)
app.post('/mandates/issue', (req, res) => {
    const { issuer, description, scopes, limits } = req.body;
    const mandate = mandates.createMandate(issuer, description, scopes, limits);
    res.json(mandate);
});
const startServer = (port) => {
    return app.listen(port, () => {
        console.log(`Integration Gateway running on port ${port}`);
    });
};
exports.startServer = startServer;
