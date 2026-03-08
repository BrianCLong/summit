"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const HumintService_js_1 = require("../services/HumintService.js");
const auth_js_1 = require("../middleware/auth.js");
const tenantContext_js_1 = require("../middleware/tenantContext.js");
const zod_1 = require("zod");
const humint_js_1 = require("../types/humint.js");
const router = express_1.default.Router();
const service = HumintService_js_1.HumintService.getInstance();
// Middleware
router.use(auth_js_1.ensureAuthenticated);
router.use(tenantContext_js_1.tenantContext);
// --- Sources ---
const createSourceSchema = zod_1.z.object({
    cryptonym: zod_1.z.string(),
    reliability: zod_1.z.nativeEnum(humint_js_1.SourceReliability),
    accessLevel: zod_1.z.string(),
    status: zod_1.z.nativeEnum(humint_js_1.SourceStatus),
    recruitedAt: zod_1.z.string().datetime().optional(),
});
router.post('/sources', async (req, res) => {
    try {
        const data = createSourceSchema.parse(req.body);
        const tenantId = req.user.tenantId; // ensureAuthenticated guarantees req.user
        const source = await service.createSource(tenantId, req.user.id, {
            ...data,
            recruitedAt: data.recruitedAt ? new Date(data.recruitedAt) : undefined,
        });
        res.json(source);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/sources', async (req, res) => {
    try {
        const sources = await service.listSources(req.user.tenantId);
        res.json(sources);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/sources/:id', async (req, res) => {
    try {
        const source = await service.getSource(req.user.tenantId, req.params.id);
        if (!source)
            return res.status(404).json({ error: 'Source not found' });
        res.json(source);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// --- Reports ---
const createReportSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    content: zod_1.z.string(),
    grading: zod_1.z.nativeEnum(humint_js_1.ReportGrading),
    disseminationList: zod_1.z.array(zod_1.z.string()).optional(),
});
router.post('/reports', async (req, res) => {
    try {
        const data = createReportSchema.parse(req.body);
        const report = await service.createReport(req.user.tenantId, req.user.id, data);
        res.json(report);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/reports', async (req, res) => {
    try {
        const sourceId = req.query.sourceId;
        const reports = await service.listReports(req.user.tenantId, sourceId);
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.patch('/reports/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        if (!Object.values(humint_js_1.ReportStatus).includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const report = await service.updateReportStatus(req.user.tenantId, req.params.id, status);
        if (!report)
            return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// --- Debriefs ---
const debriefSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    date: zod_1.z.string().datetime(),
    location: zod_1.z.string(),
    notes: zod_1.z.string(),
});
router.post('/debriefs', async (req, res) => {
    try {
        const data = debriefSchema.parse(req.body);
        const debrief = await service.logDebrief(req.user.tenantId, req.user.id, {
            ...data,
            date: new Date(data.date),
        });
        res.json(debrief);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// --- Requirements ---
const requirementSchema = zod_1.z.object({
    description: zod_1.z.string(),
    priority: zod_1.z.nativeEnum(humint_js_1.RequirementPriority),
    deadline: zod_1.z.string().datetime().optional(),
    assignedTo: zod_1.z.string().optional(),
});
router.post('/requirements', async (req, res) => {
    try {
        const data = requirementSchema.parse(req.body);
        const reqItem = await service.createRequirement(req.user.tenantId, {
            ...data,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
        });
        res.json(reqItem);
    }
    catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// --- Network/Graph ---
router.post('/sources/:id/relationships', async (req, res) => {
    try {
        const { targetName, relationshipType, notes } = req.body;
        await service.addSourceRelationship(req.user.tenantId, req.params.id, targetName, relationshipType, notes);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
router.get('/sources/:id/network', async (req, res) => {
    try {
        const network = await service.getSourceNetwork(req.user.tenantId, req.params.id);
        res.json(network);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
// --- CI Screening ---
router.post('/sources/:id/screen', async (req, res) => {
    try {
        const result = await service.runCIScreening(req.user.tenantId, req.params.id);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});
exports.default = router;
