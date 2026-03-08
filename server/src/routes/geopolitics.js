"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GeopoliticalOracleService_js_1 = require("../services/GeopoliticalOracleService.js");
const router = (0, express_1.Router)();
// Helper to handle async routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
router.post('/elite-fracture', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.calculateEliteFractureIndex(country, contextData);
    res.json(result);
}));
router.post('/succession-sim', asyncHandler(async (req, res) => {
    const { capital, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.runSuccessionSim(capital, contextData);
    res.json(result);
}));
router.post('/nuclear-breakout', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.getNuclearBreakoutDate(country, contextData);
    res.json(result);
}));
router.post('/color-revolution', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.detectColorRevolution(country, contextData);
    res.json(result);
}));
router.post('/food-riots', asyncHandler(async (req, res) => {
    const { city, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.predictFoodRiots(city, contextData);
    res.json(result);
}));
router.post('/naval-blockade', asyncHandler(async (req, res) => {
    const { countryA, countryB, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.assessNavalBlockade(countryA, countryB, contextData);
    res.json(result);
}));
router.post('/alliance-spiral', asyncHandler(async (req, res) => {
    const { allianceName, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.detectAllianceDeathSpiral(allianceName, contextData);
    res.json(result);
}));
router.post('/leader-health', asyncHandler(async (req, res) => {
    const { leaderName, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.monitorLeaderHealth(leaderName, contextData);
    res.json(result);
}));
router.post('/water-war', asyncHandler(async (req, res) => {
    const { riverBasin, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.predictWaterWar(riverBasin, contextData);
    res.json(result);
}));
router.post('/diaspora-threat', asyncHandler(async (req, res) => {
    const { diasporaGroup, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.measureDiasporaWeaponization(diasporaGroup, contextData);
    res.json(result);
}));
router.post('/election-theft', asyncHandler(async (req, res) => {
    const { election, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.calculateElectionTheftLimit(election, contextData);
    res.json(result);
}));
router.post('/sanctions-escape', asyncHandler(async (req, res) => {
    const { sanctionedEntity, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.generateSanctionsEscapeRoute(sanctionedEntity, contextData);
    res.json(result);
}));
router.post('/arctic-claim', asyncHandler(async (req, res) => {
    const { contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.validateArcticClaim(contextData);
    res.json(result);
}));
router.post('/dedollarization', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.trackDeDollarization(country, contextData);
    res.json(result);
}));
router.post('/coup-proofness', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.scoreCoupProofness(country, contextData);
    res.json(result);
}));
router.post('/genocide-warning', asyncHandler(async (req, res) => {
    const { region, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.warningGenocide(region, contextData);
    res.json(result);
}));
router.post('/mineral-chokepoint', asyncHandler(async (req, res) => {
    const { mineral, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.identifyMineralChokePoints(mineral, contextData);
    res.json(result);
}));
router.post('/taiwan-invasion', asyncHandler(async (req, res) => {
    const { contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.predictTaiwanInvasionWindow(contextData);
    res.json(result);
}));
router.post('/power-transition', asyncHandler(async (req, res) => {
    const { currentHegemon, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.checkPowerTransitionClock(currentHegemon, contextData);
    res.json(result);
}));
router.post('/false-flag', asyncHandler(async (req, res) => {
    const { target, objective, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.planFalseFlag(target, objective, contextData);
    res.json(result);
}));
router.post('/nuclear-winter', asyncHandler(async (req, res) => {
    const { contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.listNuclearWinterSurvivors(contextData);
    res.json(result);
}));
router.post('/red-button', asyncHandler(async (req, res) => {
    const { country, contextData } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.simulateRedButton(country, contextData);
    res.json(result);
}));
router.post('/final-question', asyncHandler(async (req, res) => {
    const { prompt102Value } = req.body;
    const result = await GeopoliticalOracleService_js_1.geopoliticalOracle.askTheFinalQuestion(prompt102Value);
    res.json(result);
}));
exports.default = router;
