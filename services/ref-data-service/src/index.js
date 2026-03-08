"use strict";
/**
 * Reference Data Service
 * Service for distributing and publishing reference data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const reference_data_1 = require("@intelgraph/reference-data");
const app = (0, express_1.default)();
const PORT = process.env.REF_DATA_SERVICE_PORT || 3101;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize manager
const refDataManager = new reference_data_1.ReferenceDataManager();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'ref-data-service', timestamp: new Date() });
});
// Code Lists API
app.get('/api/v1/code-lists', async (req, res) => {
    try {
        const codeLists = await refDataManager.getActiveCodeLists();
        res.json({ codeLists });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/code-lists/:name', async (req, res) => {
    try {
        const codeList = await refDataManager.getCodeListByName(req.params.name);
        if (codeList) {
            res.json(codeList);
        }
        else {
            res.status(404).json({ error: 'Code list not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/code-lists/:name/codes/:code', async (req, res) => {
    try {
        const code = await refDataManager.lookupCode(req.params.name, req.params.code);
        if (code) {
            res.json(code);
        }
        else {
            res.status(404).json({ error: 'Code not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Reference Data Service running on port ${PORT}`);
});
exports.default = app;
