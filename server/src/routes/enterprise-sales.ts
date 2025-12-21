import { Router } from 'express';
import { z } from 'zod/v4';
import { ensureAuthenticated } from '../middleware/auth.js';
import { EnterpriseSalesService } from '../services/EnterpriseSalesService.js';
import {
  EnterpriseSalesActivity,
  EnterpriseSalesAccount,
} from '../services/enterpriseSalesRepository.js';

const router = Router();
const service = new EnterpriseSalesService();

const milestoneSchema = z.object({
  name: z.string().min(2),
  dueDate: z.string(),
  owner: z.string().optional(),
  status: z.enum(['planned', 'in-progress', 'done', 'blocked']).default('planned'),
  risk: z.string().optional(),
});

const dossierSchema = z.object({
  orgChart: z.array(z.string()).nonempty(),
  initiatives: z.array(z.string()).nonempty(),
  stack: z.array(z.string()).nonempty(),
  pains: z.array(z.string()).nonempty(),
  budgets: z
    .array(z.object({ amount: z.number().positive(), approved: z.boolean(), window: z.string() }))
    .nonempty(),
  timing: z.string(),
});

const procurementSchema = z.object({
  fastLane: z.boolean(),
  slaHours: z.number().positive(),
  redlineGuardrails: z.array(z.string()).nonempty(),
  controlEvidence: z.array(z.string()).nonempty(),
  pricingGuardrails: z.string(),
  slaBreaches: z.number().min(0).default(0),
  avgCycleTimeDays: z.number().positive(),
});

const pocSchema = z.object({
  status: z.enum(['pending', 'active', 'healthy', 'at-risk', 'complete']),
  targetDays: z.number().positive(),
  timeToFirstValueDays: z.number().positive().optional(),
  observability: z.array(z.string()).nonempty(),
  benchmarks: z.array(z.string()).nonempty(),
});

const renewalSchema = z.object({
  renewalDate: z.string(),
  qbrCadence: z.enum(['monthly', 'quarterly']),
  riskFlags: z.array(z.string()).default([]),
  execSponsor: z.string(),
});

const expansionSchema = z.object({
  triggers: z.array(z.string()).nonempty(),
  playbooks: z.array(z.string()).nonempty(),
  stickinessFeatures: z.array(z.string()).nonempty(),
});

const accountSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  icpFit: z.number().min(1).max(5),
  arrPotential: z.number().positive(),
  strategicValue: z.number().min(1).max(5),
  accountGeneral: z.string().min(1),
  stopLossRule: z.string().min(1),
  exitCriteria: z.string().min(1),
  map: z.object({
    owner: z.string(),
    nextStep: z.string(),
    milestones: z.array(milestoneSchema).nonempty(),
    risks: z.array(z.string()).optional(),
  }),
  dossier: dossierSchema,
  winThemes: z.array(z.string()).nonempty(),
  procurement: procurementSchema,
  poc: pocSchema,
  deployment: z.object({
    sso: z.boolean(),
    scim: z.boolean(),
    rbacTemplates: z.boolean(),
    auditLogs: z.boolean(),
    drRpoHours: z.number().positive(),
    drRtoHours: z.number().positive(),
    siem: z.boolean(),
  }),
  renewal: renewalSchema,
  expansion: expansionSchema,
  riskRegister: z
    .array(
      z.object({
        category: z.string(),
        description: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        detectedAt: z.string(),
      }),
    )
    .default([]),
  metrics: z.object({
    execTouches: z.number().min(0).default(0),
    mapSigned: z.boolean().default(false),
    championStrength: z.number().min(0).max(5),
    championEngagements: z.number().min(0).default(0),
    pocCycleDays: z.number().positive().optional(),
    procurementCycleDays: z.number().positive().optional(),
    renewalRisk: z.string().optional(),
  }),
});

const activitySchema = z.object({
  type: z.enum(['EXEC_TOUCH', 'MAP_MILESTONE', 'PROCUREMENT_SLA', 'POC_HEALTH', 'RISK', 'CHAMPION_SESSION']),
  payload: z.record(z.any()),
});

router.post('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const body = accountSchema.parse(req.body);
    const account = (await service.upsertAccount(body as unknown as EnterpriseSalesAccount));
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

router.get('/', ensureAuthenticated, async (_req, res, next) => {
  try {
    const accounts = await service.listTopTargets();
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

router.get('/dashboards/coverage', ensureAuthenticated, async (_req, res, next) => {
  try {
    const snapshot = await service.dashboard();
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', ensureAuthenticated, async (req, res, next) => {
  try {
    const account = await service.getAccount(req.params.id);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const simulation = service.simulateTimeline(account);
    res.json({ account, simulation });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/activity', ensureAuthenticated, async (req, res, next) => {
  try {
    const body = activitySchema.parse(req.body);
    const activity: EnterpriseSalesActivity = {
      accountId: req.params.id,
      type: body.type,
      payload: body.payload,
    };
    const account = await service.recordActivity(activity);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.status(200).json(account);
  } catch (error) {
    next(error);
  }
});

export default router;
