"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const pipelines_repo_js_1 = require("./pipelines-repo.js");
const auth_js_1 = require("../../middleware/auth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const dsl_js_1 = require("../dsl.js");
const dsl_schema_js_1 = require("../dsl-schema.js");
const PipelineScheduleService_js_1 = require("../scheduler/PipelineScheduleService.js");
const router = express_1.default.Router();
router.use(express_1.default.json());
router.use(auth_js_1.ensureAuthenticated); // Ensure all routes require authentication
const PipelineCreate = zod_1.z.object({
    name: zod_1.z.string().min(3).max(128),
    spec: zod_1.z.record(zod_1.z.any()).default({}),
});
const PipelineUpdate = zod_1.z.object({
    name: zod_1.z.string().min(3).max(128).optional(),
    spec: zod_1.z.record(zod_1.z.any()).optional(),
});
const PipelineSchedule = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    cron: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
});
const ajv = new ajv_1.default({ allErrors: true, strict: false });
(0, ajv_formats_1.default)(ajv);
const validateDsl = ajv.compile(dsl_schema_js_1.MAESTRO_DSL_SCHEMA);
router.get('/pipelines', (0, rbac_js_1.requirePermission)('pipeline:read'), async (req, res) => {
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const items = await pipelines_repo_js_1.pipelinesRepo.list(tenantId);
    res.json(items);
});
router.post('/pipelines', (0, rbac_js_1.requirePermission)('pipeline:create'), async (req, res) => {
    const parse = PipelineCreate.safeParse(req.body || {});
    if (!parse.success)
        return res
            .status(400)
            .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const created = await pipelines_repo_js_1.pipelinesRepo.create(parse.data.name, parse.data.spec, tenantId);
    res.status(201).json(created);
});
router.get('/pipelines/schema', (0, rbac_js_1.requirePermission)('pipeline:read'), (_req, res) => {
    res.json(dsl_schema_js_1.MAESTRO_DSL_SCHEMA);
});
router.post('/pipelines/validate', (0, rbac_js_1.requirePermission)('pipeline:read'), (req, res) => {
    const spec = req.body?.spec ?? req.body;
    if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ error: 'invalid_spec' });
    }
    const schemaValid = validateDsl(spec);
    const schemaErrors = schemaValid
        ? []
        : (validateDsl.errors || []).map((err) => ({
            path: err.instancePath || err.schemaPath,
            message: err.message,
        }));
    const dslResult = dsl_js_1.MaestroDSL.validate(spec);
    const dslError = dslResult.valid ? null : dslResult.error;
    const valid = schemaValid && dslResult.valid;
    return res.json({
        valid,
        schemaErrors,
        dslError,
    });
});
router.post('/pipelines/simulate', (0, rbac_js_1.requirePermission)('pipeline:read'), (req, res) => {
    const spec = req.body?.spec ?? req.body;
    if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ error: 'invalid_spec' });
    }
    const schemaValid = validateDsl(spec);
    const dslResult = dsl_js_1.MaestroDSL.validate(spec);
    if (!schemaValid || !dslResult.valid) {
        return res.status(400).json({
            error: 'invalid_spec',
            schemaErrors: validateDsl.errors || [],
            dslError: dslResult.error,
        });
    }
    const nodeCount = Array.isArray(spec.nodes) ? spec.nodes.length : 0;
    const edgeCount = Array.isArray(spec.edges) ? spec.edges.length : 0;
    const taskNodes = Array.isArray(spec.nodes)
        ? spec.nodes.filter((node) => node.kind === 'task').length
        : 0;
    const estimatedDurationMs = Math.max(500, nodeCount * 750 + edgeCount * 220);
    const estimatedCostUSD = Number((0.002 * nodeCount + 0.001 * edgeCount + 0.003 * taskNodes).toFixed(4));
    res.json({
        estimate: {
            estimatedCostUSD,
            estimatedDurationMs,
            nodes: nodeCount,
            edges: edgeCount,
            taskNodes,
        },
        explain: {
            assumptions: [
                'Cost scales with node count and task density.',
                'Edge count increases orchestration overhead.',
                'Durations are sampled using a 750ms baseline per node.',
            ],
        },
        sampledRuns: [
            {
                run: 1,
                estimatedCostUSD: Number((estimatedCostUSD * 0.92).toFixed(4)),
                estimatedDurationMs: Math.round(estimatedDurationMs * 0.9),
            },
            {
                run: 2,
                estimatedCostUSD: Number((estimatedCostUSD * 1.06).toFixed(4)),
                estimatedDurationMs: Math.round(estimatedDurationMs * 1.1),
            },
        ],
    });
});
router.get('/pipelines/:id', (0, rbac_js_1.requirePermission)('pipeline:read'), async (req, res) => {
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const got = await pipelines_repo_js_1.pipelinesRepo.get(req.params.id, tenantId);
    if (!got)
        return res.status(404).json({ error: 'not_found' });
    res.json(got);
});
router.put('/pipelines/:id', (0, rbac_js_1.requirePermission)('pipeline:update'), async (req, res) => {
    const parse = PipelineUpdate.safeParse(req.body || {});
    if (!parse.success)
        return res
            .status(400)
            .json({ error: 'invalid_input', details: parse.error.issues });
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const upd = await pipelines_repo_js_1.pipelinesRepo.update(req.params.id, parse.data, tenantId);
    if (!upd)
        return res.status(404).json({ error: 'not_found' });
    res.json(upd);
});
router.put('/pipelines/:id/schedule', (0, rbac_js_1.requirePermission)('pipeline:update'), async (req, res) => {
    const schedulePayload = req.body?.schedule ?? req.body;
    const scheduleParse = PipelineSchedule.safeParse(schedulePayload);
    if (!scheduleParse.success) {
        return res.status(400).json({
            error: 'invalid_schedule',
            details: scheduleParse.error.issues,
        });
    }
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const pipeline = await pipelines_repo_js_1.pipelinesRepo.get(req.params.id, tenantId);
    if (!pipeline)
        return res.status(404).json({ error: 'not_found' });
    const nextSpec = {
        ...(pipeline.spec || {}),
        schedule: scheduleParse.data,
    };
    const updated = await pipelines_repo_js_1.pipelinesRepo.update(req.params.id, { spec: nextSpec }, tenantId);
    try {
        const scheduleStatus = await PipelineScheduleService_js_1.pipelineScheduleService.applySchedule(req.params.id, tenantId, scheduleParse.data);
        return res.json({
            pipeline: updated,
            schedule: scheduleParse.data,
            nextRunAt: scheduleStatus.nextRunAt,
        });
    }
    catch (error) {
        return res.status(400).json({
            error: 'invalid_schedule',
            message: error?.message || 'Schedule could not be applied',
        });
    }
});
router.delete('/pipelines/:id', (0, rbac_js_1.requirePermission)('pipeline:update'), async (req, res) => {
    const tenantId = req.tenant || req.user?.tenantId || 'default';
    const ok = await pipelines_repo_js_1.pipelinesRepo.delete(req.params.id, tenantId);
    res.status(ok ? 204 : 404).send();
});
// Policy hints (stub)
router.post('/pipelines/hints', async (req, res) => {
    const spec = req.body && typeof req.body === 'object' ? req.body : {};
    const hints = [];
    // Static heuristics
    if (spec.nodes?.length > 8)
        hints.push('Consider breaking into stages; >8 nodes may impact readability and retries');
    if (spec.nodes?.some((n) => n.type === 'llm' && n.temperature > 0.7))
        hints.push('High temperature; consider lower for determinism in CI flows');
    // OPA policy hints (if engine available)
    try {
        const mod = await Promise.resolve().then(() => __importStar(require('../../conductor/governance/opa-integration.js')));
        const engine = mod?.opaPolicyEngine;
        if (engine && typeof engine.evaluateTenantIsolation === 'function') {
            const context = {
                userId: req.user?.id || 'unknown',
                pipeline: spec,
                action: 'plan',
                role: req.user?.role || 'user',
                resource: 'pipeline',
                tenantId: req.tenant || 'default',
            };
            const decision = await engine.evaluatePolicy('conductor/pipeline_hints', context);
            if (decision?.conditions?.length)
                hints.push(...decision.conditions.map((w) => String(w)));
        }
    }
    catch {
        /* ignore OPA absence */
    }
    res.json({ hints });
});
// Copilot suggest (stub)
router.post('/pipelines/copilot/suggest', async (req, res) => {
    const prompt = String(req.body?.prompt || '');
    const suggestion = {
        name: 'Suggested Pipeline',
        spec: {
            nodes: [
                { id: 'source', type: 'ingest', config: { source: 'kb://docs' } },
                {
                    id: 'transform',
                    type: 'normalize',
                    config: { policy: 'pii-redact' },
                },
                {
                    id: 'analyze',
                    type: 'llm',
                    config: { model: 'gpt-4o', temperature: 0.2 },
                },
            ],
            edges: [
                { from: 'source', to: 'transform' },
                { from: 'transform', to: 'analyze' },
            ],
        },
        notes: [`Generated from: ${prompt.substring(0, 64)}`],
    };
    res.json(suggestion);
});
exports.default = router;
