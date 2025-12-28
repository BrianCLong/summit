import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { geopoliticalOracle } from '../services/GeopoliticalOracleService';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Helper to handle async routes
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Common schema for the optional contextData object
const contextDataSchema = z.object({
  contextData: z.record(z.any()).optional(),
});

// Helper function to create a schema for a single string field + contextData
const createGeoSchema = (field: string) => z.object({
  body: z.object({
    [field]: z.string().min(1, `${field} is required`),
  }).merge(contextDataSchema)
});

// Schemas for each route
const eliteFractureSchema = createGeoSchema('country');
const successionSimSchema = createGeoSchema('capital');
const nuclearBreakoutSchema = createGeoSchema('country');
const colorRevolutionSchema = createGeoSchema('country');
const foodRiotsSchema = createGeoSchema('city');
const navalBlockadeSchema = z.object({
    body: z.object({
        countryA: z.string().min(1, 'countryA is required'),
        countryB: z.string().min(1, 'countryB is required'),
    }).merge(contextDataSchema),
});
const allianceSpiralSchema = createGeoSchema('allianceName');
const leaderHealthSchema = createGeoSchema('leaderName');
const waterWarSchema = createGeoSchema('riverBasin');
const diasporaThreatSchema = createGeoSchema('diasporaGroup');
const electionTheftSchema = createGeoSchema('election');
const sanctionsEscapeSchema = createGeoSchema('sanctionedEntity');
const arcticClaimSchema = z.object({ body: contextDataSchema });
const dedollarizationSchema = createGeoSchema('country');
const coupProofnessSchema = createGeoSchema('country');
const genocideWarningSchema = createGeoSchema('region');
const mineralChokepointSchema = createGeoSchema('mineral');
const taiwanInvasionSchema = z.object({ body: contextDataSchema });
const powerTransitionSchema = createGeoSchema('currentHegemon');
const falseFlagSchema = z.object({
    body: z.object({
        target: z.string().min(1, 'target is required'),
        objective: z.string().min(1, 'objective is required'),
    }).merge(contextDataSchema),
});
const nuclearWinterSchema = z.object({ body: contextDataSchema });
const redButtonSchema = createGeoSchema('country');
const finalQuestionSchema = z.object({
    body: z.object({
        prompt102Value: z.string().min(1, 'prompt102Value is required'),
    }),
});


router.post('/elite-fracture', validateRequest(eliteFractureSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.calculateEliteFractureIndex(country, contextData);
  res.json(result);
}));

router.post('/succession-sim', validateRequest(successionSimSchema), asyncHandler(async (req, res) => {
  const { capital, contextData } = req.body;
  const result = await geopoliticalOracle.runSuccessionSim(capital, contextData);
  res.json(result);
}));

router.post('/nuclear-breakout', validateRequest(nuclearBreakoutSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.getNuclearBreakoutDate(country, contextData);
  res.json(result);
}));

router.post('/color-revolution', validateRequest(colorRevolutionSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.detectColorRevolution(country, contextData);
  res.json(result);
}));

router.post('/food-riots', validateRequest(foodRiotsSchema), asyncHandler(async (req, res) => {
  const { city, contextData } = req.body;
  const result = await geopoliticalOracle.predictFoodRiots(city, contextData);
  res.json(result);
}));

router.post('/naval-blockade', validateRequest(navalBlockadeSchema), asyncHandler(async (req, res) => {
  const { countryA, countryB, contextData } = req.body;
  const result = await geopoliticalOracle.assessNavalBlockade(countryA, countryB, contextData);
  res.json(result);
}));

router.post('/alliance-spiral', validateRequest(allianceSpiralSchema), asyncHandler(async (req, res) => {
  const { allianceName, contextData } = req.body;
  const result = await geopoliticalOracle.detectAllianceDeathSpiral(allianceName, contextData);
  res.json(result);
}));

router.post('/leader-health', validateRequest(leaderHealthSchema), asyncHandler(async (req, res) => {
  const { leaderName, contextData } = req.body;
  const result = await geopoliticalOracle.monitorLeaderHealth(leaderName, contextData);
  res.json(result);
}));

router.post('/water-war', validateRequest(waterWarSchema), asyncHandler(async (req, res) => {
  const { riverBasin, contextData } = req.body;
  const result = await geopoliticalOracle.predictWaterWar(riverBasin, contextData);
  res.json(result);
}));

router.post('/diaspora-threat', validateRequest(diasporaThreatSchema), asyncHandler(async (req, res) => {
  const { diasporaGroup, contextData } = req.body;
  const result = await geopoliticalOracle.measureDiasporaWeaponization(diasporaGroup, contextData);
  res.json(result);
}));

router.post('/election-theft', validateRequest(electionTheftSchema), asyncHandler(async (req, res) => {
  const { election, contextData } = req.body;
  const result = await geopoliticalOracle.calculateElectionTheftLimit(election, contextData);
  res.json(result);
}));

router.post('/sanctions-escape', validateRequest(sanctionsEscapeSchema), asyncHandler(async (req, res) => {
  const { sanctionedEntity, contextData } = req.body;
  const result = await geopoliticalOracle.generateSanctionsEscapeRoute(sanctionedEntity, contextData);
  res.json(result);
}));

router.post('/arctic-claim', validateRequest(arcticClaimSchema), asyncHandler(async (req, res) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.validateArcticClaim(contextData);
  res.json(result);
}));

router.post('/dedollarization', validateRequest(dedollarizationSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.trackDeDollarization(country, contextData);
  res.json(result);
}));

router.post('/coup-proofness', validateRequest(coupProofnessSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.scoreCoupProofness(country, contextData);
  res.json(result);
}));

router.post('/genocide-warning', validateRequest(genocideWarningSchema), asyncHandler(async (req, res) => {
  const { region, contextData } = req.body;
  const result = await geopoliticalOracle.warningGenocide(region, contextData);
  res.json(result);
}));

router.post('/mineral-chokepoint', validateRequest(mineralChokepointSchema), asyncHandler(async (req, res) => {
  const { mineral, contextData } = req.body;
  const result = await geopoliticalOracle.identifyMineralChokePoints(mineral, contextData);
  res.json(result);
}));

router.post('/taiwan-invasion', validateRequest(taiwanInvasionSchema), asyncHandler(async (req, res) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.predictTaiwanInvasionWindow(contextData);
  res.json(result);
}));

router.post('/power-transition', validateRequest(powerTransitionSchema), asyncHandler(async (req, res) => {
  const { currentHegemon, contextData } = req.body;
  const result = await geopoliticalOracle.checkPowerTransitionClock(currentHegemon, contextData);
  res.json(result);
}));

router.post('/false-flag', validateRequest(falseFlagSchema), asyncHandler(async (req, res) => {
  const { target, objective, contextData } = req.body;
  const result = await geopoliticalOracle.planFalseFlag(target, objective, contextData);
  res.json(result);
}));

router.post('/nuclear-winter', validateRequest(nuclearWinterSchema), asyncHandler(async (req, res) => {
  const { contextData } = req.body;
  const result = await geopoliticalOracle.listNuclearWinterSurvivors(contextData);
  res.json(result);
}));

router.post('/red-button', validateRequest(redButtonSchema), asyncHandler(async (req, res) => {
  const { country, contextData } = req.body;
  const result = await geopoliticalOracle.simulateRedButton(country, contextData);
  res.json(result);
}));

router.post('/final-question', validateRequest(finalQuestionSchema), asyncHandler(async (req, res) => {
  const { prompt102Value } = req.body;
  const result = await geopoliticalOracle.askTheFinalQuestion(prompt102Value);
  res.json(result);
}));

export default router;
