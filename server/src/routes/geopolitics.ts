import { Router } from 'express';
import { geopoliticalOracle } from '../services/GeopoliticalOracleService';
import { logger } from '../utils/logger';

const router = Router();

// Helper to handle async routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/elite-fracture', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.calculateEliteFractureIndex(country, contextData);
  res.json(result);
}));

router.post('/succession-sim', asyncHandler(async (req: any, res: any) => {
  const { capital, contextData } = req.body;
  const result = await geopoliticalOracle.runSuccessionSim(capital, contextData);
  res.json(result);
}));

router.post('/nuclear-breakout', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.getNuclearBreakoutDate(country, contextData);
  res.json(result);
}));

router.post('/color-revolution', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.detectColorRevolution(country, contextData);
  res.json(result);
}));

router.post('/food-riots', asyncHandler(async (req: any, res: any) => {
  const { city, contextData } = req.body;
  const result = await geopoliticalOracle.predictFoodRiots(city, contextData);
  res.json(result);
}));

router.post('/naval-blockade', asyncHandler(async (req: any, res: any) => {
  const { countryA, countryB, contextData } = req.body;
  const result = await geopoliticalOracle.assessNavalBlockade(countryA, countryB, contextData);
  res.json(result);
}));

router.post('/alliance-spiral', asyncHandler(async (req: any, res: any) => {
  const { allianceName, contextData } = req.body;
  const result = await geopoliticalOracle.detectAllianceDeathSpiral(allianceName, contextData);
  res.json(result);
}));

router.post('/leader-health', asyncHandler(async (req: any, res: any) => {
  const { leaderName, contextData } = req.body;
  const result = await geopoliticalOracle.monitorLeaderHealth(leaderName, contextData);
  res.json(result);
}));

router.post('/water-war', asyncHandler(async (req: any, res: any) => {
  const { riverBasin, contextData } = req.body;
  const result = await geopoliticalOracle.predictWaterWar(riverBasin, contextData);
  res.json(result);
}));

router.post('/diaspora-threat', asyncHandler(async (req: any, res: any) => {
  const { diasporaGroup, contextData } = req.body;
  const result = await geopoliticalOracle.measureDiasporaWeaponization(diasporaGroup, contextData);
  res.json(result);
}));

router.post('/election-theft', asyncHandler(async (req: any, res: any) => {
  const { election, contextData } = req.body;
  const result = await geopoliticalOracle.calculateElectionTheftLimit(election, contextData);
  res.json(result);
}));

router.post('/sanctions-escape', asyncHandler(async (req: any, res: any) => {
  const { sanctionedEntity, contextData } = req.body;
  const result = await geopoliticalOracle.generateSanctionsEscapeRoute(sanctionedEntity, contextData);
  res.json(result);
}));

router.post('/arctic-claim', asyncHandler(async (req: any, res: any) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.validateArcticClaim(contextData);
  res.json(result);
}));

router.post('/dedollarization', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.trackDeDollarization(country, contextData);
  res.json(result);
}));

router.post('/coup-proofness', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.scoreCoupProofness(country, contextData);
  res.json(result);
}));

router.post('/genocide-warning', asyncHandler(async (req: any, res: any) => {
  const { region, contextData } = req.body;
  const result = await geopoliticalOracle.warningGenocide(region, contextData);
  res.json(result);
}));

router.post('/mineral-chokepoint', asyncHandler(async (req: any, res: any) => {
  const { mineral, contextData } = req.body;
  const result = await geopoliticalOracle.identifyMineralChokePoints(mineral, contextData);
  res.json(result);
}));

router.post('/taiwan-invasion', asyncHandler(async (req: any, res: any) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.predictTaiwanInvasionWindow(contextData);
  res.json(result);
}));

router.post('/power-transition', asyncHandler(async (req: any, res: any) => {
  const { currentHegemon, contextData } = req.body;
  const result = await geopoliticalOracle.checkPowerTransitionClock(currentHegemon, contextData);
  res.json(result);
}));

router.post('/false-flag', asyncHandler(async (req: any, res: any) => {
  const { target, objective, contextData } = req.body;
  const result = await geopoliticalOracle.planFalseFlag(target, objective, contextData);
  res.json(result);
}));

router.post('/nuclear-winter', asyncHandler(async (req: any, res: any) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.listNuclearWinterSurvivors(contextData);
  res.json(result);
}));

router.post('/red-button', asyncHandler(async (req: any, res: any) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.simulateRedButton(country, contextData);
  res.json(result);
}));

router.post('/final-question', asyncHandler(async (req: any, res: any) => {
  const { prompt102Value } = req.body;
  const result = await geopoliticalOracle.askTheFinalQuestion(prompt102Value);
  res.json(result);
}));

export default router;
