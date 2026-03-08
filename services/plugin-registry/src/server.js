"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const PluginRegistryService_js_1 = require("./PluginRegistryService.js");
const pluginRoutes_js_1 = require("./routes/pluginRoutes.js");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
// Initialize services
const registryService = new PluginRegistryService_js_1.PluginRegistryService();
// Routes
app.use('/api/plugins', (0, pluginRoutes_js_1.createPluginRoutes)(registryService));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'plugin-registry' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});
app.listen(port, () => {
    console.log(`Plugin registry service listening on port ${port}`);
});
