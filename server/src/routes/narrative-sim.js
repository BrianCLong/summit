"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const node_crypto_1 = require("node:crypto");
const auth_js_1 = require("../middleware/auth.js");
const manager_js_1 = require("../narrative/manager.js");
const scenario_js_1 = require("../narrative/scenario.js");
const featureFlags_js_1 = require("../config/featureFlags.js");
const router = express_1.default.Router();
const scenarioSimulator = new scenario_js_1.ScenarioSimulator();
// Apply permission check for all simulation routes
router.use((0, auth_js_1.requirePermission)('simulation:run'));
// Feature Flag Gate
router.use((_req, res, next) => {
    if (!featureFlags_js_1.FeatureFlags.isEnabled('narrative.simulation')) {
        res.status(403).json({
            error: 'feature-disabled',
            message: 'Narrative Simulation Engine is not enabled for this environment.',
        });
        return;
    }
    next();
});
const relationshipSchema = zod_1.z.object({
    targetId: zod_1.z.string(),
    strength: zod_1.z.number().min(0).max(1),
});
const entitySchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['actor', 'group']),
    alignment: zod_1.z.enum(['ally', 'neutral', 'opposition']),
    influence: zod_1.z.number().min(0).max(1.5),
    sentiment: zod_1.z.number().min(-1).max(1),
    volatility: zod_1.z.number().min(0).max(1),
    resilience: zod_1.z.number().min(0).max(1),
    themes: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    relationships: zod_1.z.array(relationshipSchema).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
const parameterSchema = zod_1.z.object({
    name: zod_1.z.string(),
    value: zod_1.z.number(),
});
const llmSchema = zod_1.z
    .object({
    adapter: zod_1.z.enum(['echo']).default('echo'),
    promptTemplate: zod_1.z.string().optional(),
})
    .optional();
const agentSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    type: zod_1.z.enum(['rule-based', 'llm']),
    role: zod_1.z.string(),
    goal: zod_1.z.string(),
    llmConfig: zod_1.z
        .object({
        model: zod_1.z.string(),
        temperature: zod_1.z.number(),
        promptTemplate: zod_1.z.string().optional(),
    })
        .optional(),
});
const createSimulationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    themes: zod_1.z.array(zod_1.z.string()).min(1),
    tickIntervalMinutes: zod_1.z.number().positive().optional(),
    generatorMode: zod_1.z.enum(['rule-based', 'llm']).optional(),
    initialEntities: zod_1.z.array(entitySchema).min(1),
    initialParameters: zod_1.z.array(parameterSchema).optional(),
    agents: zod_1.z.array(agentSchema).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    llm: llmSchema,
});
const eventSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.enum([
        'social',
        'political',
        'information',
        'intervention',
        'system',
        'shock',
    ]),
    actorId: zod_1.z.string().optional(),
    targetIds: zod_1.z.array(zod_1.z.string()).optional(),
    theme: zod_1.z.string(),
    intensity: zod_1.z.number().min(0).max(2).default(1),
    sentimentShift: zod_1.z.number().optional(),
    influenceShift: zod_1.z.number().optional(),
    parameterAdjustments: zod_1.z
        .array(zod_1.z.object({ name: zod_1.z.string(), delta: zod_1.z.number() }))
        .optional(),
    description: zod_1.z.string().min(1),
    scheduledTick: zod_1.z.number().int().nonnegative().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
const shockSchema = zod_1.z.object({
    type: zod_1.z.string(),
    targetTag: zod_1.z.string().optional(),
    targetIds: zod_1.z.array(zod_1.z.string()).optional(),
    intensity: zod_1.z.number().min(0).max(2),
    description: zod_1.z.string(),
});
const batchSimulationSchema = zod_1.z.object({
    config: createSimulationSchema,
    iterations: zod_1.z.number().int().min(1).max(100).default(10),
    ticks: zod_1.z.number().int().min(1).max(100).default(20),
    shock: shockSchema.optional(),
});
const tickSchema = zod_1.z.object({
    steps: zod_1.z.number().int().positive().default(1),
});
class EchoLLMClient {
    template;
    constructor(template = 'Tick {tick}: {arcs}. Recent: {events}.') {
        this.template = template;
    }
    async generateNarrative(request) {
        const arcSummary = request.state.arcs
            .map((arc) => `${arc.theme} ${(arc.momentum * 100).toFixed(0)}% ${arc.outlook} (confidence ${(arc.confidence * 100).toFixed(0)}%)`)
            .join('; ');
        const events = request.recentEvents
            .slice(-5)
            .map((event) => `${event.type}: ${event.description}`)
            .join('; ') || 'no recent drivers';
        return this.template
            .replace('{tick}', request.state.tick.toString())
            .replace('{arcs}', arcSummary)
            .replace('{events}', events)
            .replace('{themes}', request.state.themes.join(', '));
    }
}
router.get('/simulations', (_req, res) => {
    res.json(manager_js_1.narrativeSimulationManager.list());
});
router.post('/simulations', (req, res) => {
    try {
        const payload = createSimulationSchema.parse(req.body ?? {});
        const entities = payload.initialEntities.map((entity) => ({
            ...entity,
            id: entity.id ?? (0, node_crypto_1.randomUUID)(),
        }));
        const llmClient = payload.generatorMode === 'llm'
            ? new EchoLLMClient(payload.llm?.promptTemplate)
            : undefined;
        const state = manager_js_1.narrativeSimulationManager.createSimulation({
            name: payload.name,
            themes: payload.themes,
            tickIntervalMinutes: payload.tickIntervalMinutes,
            generatorMode: payload.generatorMode,
            initialEntities: entities,
            initialParameters: payload.initialParameters,
            agents: payload.agents,
            llmClient,
            metadata: payload.metadata,
        });
        res.status(201).json(state);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res
            .status(500)
            .json({ error: 'failed-to-create', details: error.message });
    }
});
router.post('/simulations/batch', async (req, res) => {
    try {
        const payload = batchSimulationSchema.parse(req.body ?? {});
        // Convert payload config to proper SimulationConfig
        // Note: The schema is 'createSimulationSchema', we need to adapt it
        const entities = payload.config.initialEntities.map((entity) => ({
            ...entity,
            id: entity.id ?? (0, node_crypto_1.randomUUID)(),
        }));
        const config = {
            id: (0, node_crypto_1.randomUUID)(),
            name: payload.config.name,
            themes: payload.config.themes,
            tickIntervalMinutes: payload.config.tickIntervalMinutes ?? 60,
            initialEntities: entities,
            initialParameters: payload.config.initialParameters,
            generatorMode: payload.config.generatorMode,
            metadata: payload.config.metadata,
            // LLM client not supported in batch for now (too heavy)
        };
        const result = await scenarioSimulator.runBatch(config, payload.iterations, payload.ticks, payload.shock);
        res.json(result);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res.status(500).json({ error: error.message });
    }
});
router.get('/simulations/:id', (req, res) => {
    const state = manager_js_1.narrativeSimulationManager.getState(req.params.id);
    if (!state) {
        res.status(404).json({ error: 'not-found' });
        return;
    }
    res.json(state);
});
router.post('/simulations/:id/tick', async (req, res) => {
    try {
        const { steps } = tickSchema.parse(req.body ?? {});
        const state = await manager_js_1.narrativeSimulationManager.tick(req.params.id, steps);
        res.json(state);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res.status(404).json({ error: error.message });
    }
});
router.post('/simulations/:id/events', (req, res) => {
    try {
        const payload = eventSchema.parse(req.body ?? {});
        const event = {
            ...payload,
            id: payload.id ?? (0, node_crypto_1.randomUUID)(),
        };
        manager_js_1.narrativeSimulationManager.queueEvent(req.params.id, event);
        res.status(202).json({ status: 'accepted', event });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res.status(404).json({ error: error.message });
    }
});
router.post('/simulations/:id/shock', (req, res) => {
    try {
        const payload = shockSchema.parse(req.body ?? {});
        const engine = manager_js_1.narrativeSimulationManager.getEngine(req.params.id);
        if (!engine) {
            res.status(404).json({ error: 'not-found' });
            return;
        }
        engine.injectShock(payload);
        res.status(202).json({ status: 'accepted', type: 'shock' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res.status(404).json({ error: error.message });
    }
});
router.post('/simulations/:id/actions', (req, res) => {
    try {
        const payload = eventSchema
            .omit({ type: true })
            .extend({ actorId: zod_1.z.string(), description: zod_1.z.string() })
            .parse(req.body ?? {});
        manager_js_1.narrativeSimulationManager.injectActorAction(req.params.id, payload.actorId, payload.description, {
            targetIds: payload.targetIds,
            theme: payload.theme,
            intensity: payload.intensity,
            sentimentShift: payload.sentimentShift,
            influenceShift: payload.influenceShift,
            parameterAdjustments: payload.parameterAdjustments,
            metadata: payload.metadata,
            scheduledTick: payload.scheduledTick,
        });
        res.status(202).json({ status: 'accepted' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            res
                .status(400)
                .json({ error: 'invalid-request', details: error.flatten() });
            return;
        }
        res.status(404).json({ error: error.message });
    }
});
router.delete('/simulations/:id', (req, res) => {
    const removed = manager_js_1.narrativeSimulationManager.remove(req.params.id);
    if (!removed) {
        res.status(404).json({ error: 'not-found' });
        return;
    }
    res.status(204).send();
});
exports.default = router;
