"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const store_js_1 = require("./store.js");
const exporter_js_1 = require("./exporter.js");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const store = new store_js_1.ExperimentStore();
const metricSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    baselineRate: zod_1.z.number().min(0).max(1),
    minDetectableEffect: zod_1.z.number()
});
const stopRuleSchema = zod_1.z.object({
    maxDurationDays: zod_1.z.number().int().positive(),
    maxUnits: zod_1.z.number().int().positive().optional()
});
const analysisPlanSchema = zod_1.z.object({
    method: zod_1.z.literal('difference-in-proportions'),
    alpha: zod_1.z.number().min(0).max(1),
    desiredPower: zod_1.z.number().min(0).max(1)
});
const actorSchema = zod_1.z.object({
    actor: zod_1.z.string().min(1)
});
app.post('/experiments', (req, res) => {
    const schema = zod_1.z
        .object({
        name: zod_1.z.string().min(1),
        hypothesis: zod_1.z.string().min(1),
        metrics: zod_1.z.array(metricSchema).min(1),
        stopRule: stopRuleSchema,
        analysisPlan: analysisPlanSchema,
        actor: zod_1.z.string().min(1)
    })
        .strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }
    try {
        const { actor, ...rest } = parsed.data;
        const experiment = store.createExperiment(rest, actor);
        return res.status(201).json(experiment);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
});
app.get('/experiments/:id', (req, res) => {
    const experiment = store.getExperiment(req.params.id);
    if (!experiment) {
        return res.status(404).json({ message: 'Not found' });
    }
    return res.json(experiment);
});
app.post('/experiments/:id/start', (req, res) => {
    const parsed = actorSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }
    try {
        const experiment = store.startExperiment(req.params.id, parsed.data.actor);
        return res.json(experiment);
    }
    catch (err) {
        return res.status(404).json({ message: err.message });
    }
});
app.put('/experiments/:id/hypothesis', (req, res) => {
    const schema = actorSchema.merge(zod_1.z.object({ hypothesis: zod_1.z.string().min(1) }));
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }
    try {
        store.attemptHypothesisUpdate(req.params.id, parsed.data.hypothesis, parsed.data.actor);
        return res.json(store.getExperiment(req.params.id));
    }
    catch (err) {
        return res.status(409).json({ message: err.message });
    }
});
app.post('/experiments/:id/export', (req, res) => {
    const parsed = actorSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }
    try {
        const experiment = store.getExperiment(req.params.id);
        if (!experiment) {
            return res.status(404).json({ message: 'Not found' });
        }
        const bundle = (0, exporter_js_1.buildExportBundle)(experiment);
        store.recordExport(req.params.id, bundle);
        store.appendAudit(req.params.id, {
            actor: parsed.data.actor,
            action: 'EXPORT_PREREGISTRATION',
            detail: 'Generated preregistration bundle.',
            status: 'SUCCESS'
        });
        return res.json(bundle);
    }
    catch (err) {
        return res.status(400).json({ message: err.message });
    }
});
app.get('/experiments/:id/audit', (req, res) => {
    const experiment = store.getExperiment(req.params.id);
    if (!experiment) {
        return res.status(404).json({ message: 'Not found' });
    }
    return res.json(experiment.auditLog);
});
app.post('/experiments/:id/results', (req, res) => {
    const schema = zod_1.z
        .object({
        metric: zod_1.z.string().min(1),
        variant: zod_1.z.string().min(1),
        value: zod_1.z.number(),
        actor: zod_1.z.string().min(1)
    })
        .strict();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json(parsed.error);
    }
    try {
        const experiment = store.addResult(req.params.id, parsed.data.metric, { variant: parsed.data.variant, value: parsed.data.value }, parsed.data.actor);
        return res.json({ status: 'accepted', results: experiment.results[parsed.data.metric] });
    }
    catch (err) {
        return res.status(409).json({ message: err.message });
    }
});
const port = process.env.PORT ?? 3000;
app.listen(port, () => {
    console.log(`PRER service listening on port ${port}`);
});
