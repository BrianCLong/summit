"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.talentRouter = void 0;
const express_1 = require("express");
const types_js_1 = require("../models/types.js");
const TalentRepository_js_1 = require("../services/TalentRepository.js");
const MatchingEngine_js_1 = require("../services/MatchingEngine.js");
const IncentiveGenerator_js_1 = require("../services/IncentiveGenerator.js");
const OnboardingService_js_1 = require("../services/OnboardingService.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createChildLogger)('TalentRoutes');
exports.talentRouter = (0, express_1.Router)();
// GET /talents - Search/list talents
exports.talentRouter.get('/', async (req, res) => {
    try {
        const params = types_js_1.SearchTalentRequestSchema.parse({
            query: req.query.query,
            skills: req.query.skills
                ? String(req.query.skills).split(',')
                : undefined,
            minScore: req.query.minScore
                ? Number(req.query.minScore)
                : undefined,
            status: req.query.status
                ? String(req.query.status).split(',')
                : undefined,
            nationality: req.query.nationality,
            limit: req.query.limit ? Number(req.query.limit) : 20,
            offset: req.query.offset ? Number(req.query.offset) : 0,
        });
        const result = await TalentRepository_js_1.talentRepository.findAll(params);
        res.json({ ok: true, ...result });
    }
    catch (error) {
        logger.error({ error }, 'Failed to search talents');
        res.status(400).json({ ok: false, error: 'Invalid search parameters' });
    }
});
// POST /talents - Create talent
exports.talentRouter.post('/', async (req, res) => {
    try {
        const data = types_js_1.CreateTalentRequestSchema.parse(req.body);
        const talent = await TalentRepository_js_1.talentRepository.create(data);
        res.status(201).json({ ok: true, talent });
    }
    catch (error) {
        logger.error({ error }, 'Failed to create talent');
        res.status(400).json({ ok: false, error: 'Invalid talent data' });
    }
});
// GET /talents/:id - Get talent by ID
exports.talentRouter.get('/:id', async (req, res) => {
    try {
        const talent = await TalentRepository_js_1.talentRepository.findById(req.params.id);
        if (!talent) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        res.json({ ok: true, talent });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get talent');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// PATCH /talents/:id - Update talent
exports.talentRouter.patch('/:id', async (req, res) => {
    try {
        const talent = await TalentRepository_js_1.talentRepository.update(req.params.id, req.body);
        if (!talent) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        res.json({ ok: true, talent });
    }
    catch (error) {
        logger.error({ error }, 'Failed to update talent');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// DELETE /talents/:id - Delete talent
exports.talentRouter.delete('/:id', async (req, res) => {
    try {
        const deleted = await TalentRepository_js_1.talentRepository.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        res.json({ ok: true, deleted: true });
    }
    catch (error) {
        logger.error({ error }, 'Failed to delete talent');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// POST /talents/:id/signals - Detect and add signals
exports.talentRouter.post('/:id/signals', async (req, res) => {
    try {
        const talent = await TalentRepository_js_1.talentRepository.findById(req.params.id);
        if (!talent) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        const signals = MatchingEngine_js_1.matchingEngine.detectSignals(req.body);
        const updatedSignals = [...talent.signals, ...signals];
        // Recalculate score based on signals
        const avgSignalScore = updatedSignals.reduce((sum, s) => sum + s.score * s.confidence, 0) /
            (updatedSignals.length || 1);
        const newScore = Math.round(talent.overallScore * 0.6 + avgSignalScore * 0.4);
        const updated = await TalentRepository_js_1.talentRepository.update(req.params.id, {
            signals: updatedSignals,
            overallScore: newScore,
        });
        res.json({ ok: true, talent: updated, newSignals: signals });
    }
    catch (error) {
        logger.error({ error }, 'Failed to detect signals');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// POST /talents/match - Match talents against criteria
exports.talentRouter.post('/match', async (req, res) => {
    try {
        const criteria = types_js_1.MatchCriteriaSchema.parse(req.body);
        const { talents } = await TalentRepository_js_1.talentRepository.findAll({ limit: 100, offset: 0 });
        const results = MatchingEngine_js_1.matchingEngine.rankTalents(talents, criteria);
        res.json({ ok: true, matches: results });
    }
    catch (error) {
        logger.error({ error }, 'Failed to match talents');
        res.status(400).json({ ok: false, error: 'Invalid match criteria' });
    }
});
// POST /talents/:id/incentive - Generate incentive package
exports.talentRouter.post('/:id/incentive', async (req, res) => {
    try {
        const talent = await TalentRepository_js_1.talentRepository.findById(req.params.id);
        if (!talent) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        const pkg = IncentiveGenerator_js_1.incentiveGenerator.generatePackage(talent);
        await TalentRepository_js_1.talentRepository.saveIncentivePackage(pkg);
        res.json({ ok: true, incentivePackage: pkg });
    }
    catch (error) {
        logger.error({ error }, 'Failed to generate incentive package');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// GET /talents/:id/incentive - Get incentive package
exports.talentRouter.get('/:id/incentive', async (req, res) => {
    try {
        const pkg = await TalentRepository_js_1.talentRepository.getIncentivePackage(req.params.id);
        if (!pkg) {
            return res
                .status(404)
                .json({ ok: false, error: 'Incentive package not found' });
        }
        res.json({ ok: true, incentivePackage: pkg });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get incentive package');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// POST /talents/:id/onboarding - Generate onboarding plan
exports.talentRouter.post('/:id/onboarding', async (req, res) => {
    try {
        const talent = await TalentRepository_js_1.talentRepository.findById(req.params.id);
        if (!talent) {
            return res.status(404).json({ ok: false, error: 'Talent not found' });
        }
        const plan = OnboardingService_js_1.onboardingService.generatePlan(talent);
        await TalentRepository_js_1.talentRepository.saveOnboardingPlan(plan);
        // Update status to onboarding
        await TalentRepository_js_1.talentRepository.updateStatus(req.params.id, 'onboarding');
        res.json({ ok: true, onboardingPlan: plan });
    }
    catch (error) {
        logger.error({ error }, 'Failed to generate onboarding plan');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// GET /talents/:id/onboarding - Get onboarding plan
exports.talentRouter.get('/:id/onboarding', async (req, res) => {
    try {
        const plan = await TalentRepository_js_1.talentRepository.getOnboardingPlan(req.params.id);
        if (!plan) {
            return res
                .status(404)
                .json({ ok: false, error: 'Onboarding plan not found' });
        }
        const progress = OnboardingService_js_1.onboardingService.calculateProgress(plan);
        res.json({ ok: true, onboardingPlan: plan, progress });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get onboarding plan');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
// GET /talents/stats - Get talent statistics
exports.talentRouter.get('/stats/summary', async (_req, res) => {
    try {
        const stats = await TalentRepository_js_1.talentRepository.getStats();
        res.json({ ok: true, stats });
    }
    catch (error) {
        logger.error({ error }, 'Failed to get stats');
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
