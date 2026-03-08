"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PluginExecutor_js_1 = require("./PluginExecutor.js");
const executorRoutes_js_1 = require("./routes/executorRoutes.js");
const app = (0, express_1.default)();
const port = process.env.PORT || 3002;
app.use(express_1.default.json());
// Initialize executor
const executor = new PluginExecutor_js_1.PluginExecutor();
// Routes
app.use('/api/execute', (0, executorRoutes_js_1.createExecutorRoutes)(executor));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'plugin-executor' });
});
app.listen(port, () => {
    console.log(`Plugin executor service listening on port ${port}`);
});
