"use strict";
/**
 * Government AI Governance Service
 *
 * Open source, auditable AI modules for government services.
 * Guarantees privacy, compliance, and ethical standards.
 * Provides citizens with full transparency and control over their data.
 *
 * @license Apache-2.0
 *
 * Core Principles:
 * 1. TRANSPARENCY - All AI decisions are explainable and auditable
 * 2. CITIZEN CONTROL - Full data access, portability, and deletion rights
 * 3. ETHICAL AI - Mandatory bias assessment and ethical review
 * 4. COMPLIANCE - Built-in support for NIST AI RMF, EU AI Act, EO 14110
 * 5. AUDITABILITY - Immutable, hash-chained audit trail
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.TransparencyService = exports.EthicalAIRegistry = exports.CitizenDataControl = void 0;
const express_1 = __importDefault(require("express"));
const citizen_data_control_js_1 = require("./citizen-data-control.js");
const ethical_ai_registry_js_1 = require("./ethical-ai-registry.js");
const transparency_service_js_1 = require("./transparency-service.js");
const types_js_1 = require("./types.js");
__exportStar(require("./types.js"), exports);
var citizen_data_control_js_2 = require("./citizen-data-control.js");
Object.defineProperty(exports, "CitizenDataControl", { enumerable: true, get: function () { return citizen_data_control_js_2.CitizenDataControl; } });
var ethical_ai_registry_js_2 = require("./ethical-ai-registry.js");
Object.defineProperty(exports, "EthicalAIRegistry", { enumerable: true, get: function () { return ethical_ai_registry_js_2.EthicalAIRegistry; } });
var transparency_service_js_2 = require("./transparency-service.js");
Object.defineProperty(exports, "TransparencyService", { enumerable: true, get: function () { return transparency_service_js_2.TransparencyService; } });
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// Initialize services
const citizenDataControl = new citizen_data_control_js_1.CitizenDataControl();
const ethicalRegistry = new ethical_ai_registry_js_1.EthicalAIRegistry();
const transparencyService = new transparency_service_js_1.TransparencyService({ agency: process.env.AGENCY_NAME ?? 'Government Agency' });
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'gov-ai-governance', version: '1.0.0' });
});
// ============================================================================
// Citizen Data Control Endpoints
// ============================================================================
app.post('/citizen/consent', async (req, res, next) => {
    try {
        const consent = types_js_1.CitizenConsentSchema.omit({ consentTimestamp: true }).parse(req.body);
        const result = await citizenDataControl.grantConsent(consent);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.delete('/citizen/:citizenId/consent', async (req, res, next) => {
    try {
        const { citizenId } = req.params;
        const { dataCategories, purposes } = req.body;
        const success = await citizenDataControl.withdrawConsent(citizenId, dataCategories, purposes);
        res.json({ success });
    }
    catch (error) {
        next(error);
    }
});
app.get('/citizen/:citizenId/consents', async (req, res, next) => {
    try {
        const consents = await citizenDataControl.getConsents(req.params.citizenId);
        res.json(consents);
    }
    catch (error) {
        next(error);
    }
});
app.post('/citizen/data-request', async (req, res, next) => {
    try {
        const request = types_js_1.DataAccessRequestSchema.omit({
            requestId: true,
            submittedAt: true,
            status: true,
        }).parse(req.body);
        const result = await citizenDataControl.submitAccessRequest(request);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/citizen/:citizenId/export', async (req, res, next) => {
    try {
        const data = await citizenDataControl.exportCitizenData(req.params.citizenId);
        res.json(data);
    }
    catch (error) {
        next(error);
    }
});
// ============================================================================
// AI Model Registry Endpoints
// ============================================================================
app.post('/models/register', async (req, res, next) => {
    try {
        const registration = types_js_1.AIModelRegistrationSchema.omit({
            modelId: true,
            registeredAt: true,
        }).parse(req.body);
        const result = await ethicalRegistry.registerModel(registration);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/models', async (req, res, next) => {
    try {
        const models = await ethicalRegistry.listModels({
            riskLevel: req.query.riskLevel,
            deploymentEnvironment: req.query.environment,
        });
        res.json(models);
    }
    catch (error) {
        next(error);
    }
});
app.get('/models/:modelId', async (req, res, next) => {
    try {
        const model = await ethicalRegistry.getModel(req.params.modelId);
        if (!model) {
            res.status(404).json({ error: 'Model not found' });
            return;
        }
        res.json(model);
    }
    catch (error) {
        next(error);
    }
});
app.post('/models/:modelId/deploy', async (req, res, next) => {
    try {
        const { environment } = req.body;
        const result = await ethicalRegistry.deployModel(req.params.modelId, environment);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/compliance/standards', (_req, res) => {
    res.json(ethicalRegistry.getStandards());
});
// ============================================================================
// Transparency Endpoints
// ============================================================================
app.post('/decisions', async (req, res, next) => {
    try {
        const decision = types_js_1.AIDecisionSchema.omit({
            decisionId: true,
            madeAt: true,
        }).parse(req.body);
        const result = await transparencyService.recordDecision(decision);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/decisions/:decisionId', async (req, res, next) => {
    try {
        const decision = await transparencyService.getDecision(req.params.decisionId);
        if (!decision) {
            res.status(404).json({ error: 'Decision not found' });
            return;
        }
        res.json(decision);
    }
    catch (error) {
        next(error);
    }
});
app.get('/decisions/:decisionId/explain', async (req, res, next) => {
    try {
        const explanation = await transparencyService.getDecisionExplanation(req.params.decisionId);
        if (!explanation) {
            res.status(404).json({ error: 'Decision not found' });
            return;
        }
        res.json(explanation);
    }
    catch (error) {
        next(error);
    }
});
app.post('/decisions/:decisionId/appeal', async (req, res, next) => {
    try {
        const { citizenId, grounds } = req.body;
        const result = await transparencyService.fileAppeal(req.params.decisionId, citizenId, grounds);
        res.status(201).json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get('/transparency/reports', async (_req, res, next) => {
    try {
        const reports = await transparencyService.getPublishedReports();
        res.json(reports);
    }
    catch (error) {
        next(error);
    }
});
app.post('/transparency/reports/generate', async (req, res, next) => {
    try {
        const { periodStart, periodEnd } = req.body;
        const report = await transparencyService.generateReport(new Date(periodStart), new Date(periodEnd));
        res.status(201).json(report);
    }
    catch (error) {
        next(error);
    }
});
app.get('/audit', async (req, res, next) => {
    try {
        const events = await transparencyService.queryAuditTrail({
            eventType: req.query.eventType,
            actorId: req.query.actorId,
            resourceId: req.query.resourceId,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
        });
        res.json(events);
    }
    catch (error) {
        next(error);
    }
});
app.get('/audit/verify', async (_req, res, next) => {
    try {
        const integrity = await transparencyService.verifyAuditIntegrity();
        res.json(integrity);
    }
    catch (error) {
        next(error);
    }
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: err.message });
});
const PORT = process.env.PORT ?? 3100;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Gov AI Governance Service running on port ${PORT}`);
    });
}
