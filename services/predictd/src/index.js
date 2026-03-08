"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const predictive_graph_intelligence_1 = require("@intelgraph/predictive-graph-intelligence");
const app = (0, express_1.default)();
const PORT = process.env.PREDICTD_PORT || 4001;
// Middleware
app.use(body_parser_1.default.json());
// Routes
app.get('/api/v1/signals', (req, res) => {
    const signals = (0, predictive_graph_intelligence_1.getPredictiveSignals)();
    res.json({ signals });
});
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Predictd Service running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
    });
}
exports.default = app;
