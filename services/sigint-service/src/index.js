"use strict";
/**
 * SIGINT Processing Service
 * TRAINING/SIMULATION ONLY
 *
 * Enterprise signals intelligence training platform.
 * No actual interception capabilities.
 *
 * Compliance: NSPM-7, EO 12333, USSID 18
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceManager = exports.sigintEngine = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const SIGINTEngine_1 = require("./processing/SIGINTEngine");
const ComplianceManager_1 = require("./compliance/ComplianceManager");
const routes_1 = require("./api/routes");
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 3000;
// Initialize components
const complianceManager = new ComplianceManager_1.ComplianceManager();
exports.complianceManager = complianceManager;
const sigintEngine = new SIGINTEngine_1.SIGINTEngine(complianceManager);
exports.sigintEngine = sigintEngine;
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        mode: 'TRAINING',
        version: '1.0.0',
        disclaimer: 'SIMULATION ONLY - No actual SIGINT capabilities'
    });
});
// API routes
app.use('/api/v1', (0, routes_1.createAPIRouter)(sigintEngine, complianceManager));
// Start server
app.listen(port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              SIGINT TRAINING PLATFORM v1.0.0                     ║
║══════════════════════════════════════════════════════════════════║
║  MODE: TRAINING/SIMULATION                                       ║
║  STATUS: OPERATIONAL                                             ║
║                                                                  ║
║  NOTICE: This is a TRAINING system only.                         ║
║  No actual signal interception capabilities are implemented.     ║
║                                                                  ║
║  Compliance: NSPM-7, EO 12333, USSID 18, DoD 5240.1-R           ║
╚══════════════════════════════════════════════════════════════════╝

Server running on port ${port}
  `);
});
