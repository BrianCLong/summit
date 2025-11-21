import { Router, Request, Response, IRouter } from 'express';
import {
  CreateTalentRequestSchema,
  SearchTalentRequestSchema,
  MatchCriteriaSchema,
} from '../models/types.js';
import { talentRepository } from '../services/TalentRepository.js';
import { matchingEngine } from '../services/MatchingEngine.js';
import { incentiveGenerator } from '../services/IncentiveGenerator.js';
import { onboardingService } from '../services/OnboardingService.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('TalentRoutes');
export const talentRouter: IRouter = Router();

// GET /talents - Search/list talents
talentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const params = SearchTalentRequestSchema.parse({
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

    const result = await talentRepository.findAll(params);
    res.json({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, 'Failed to search talents');
    res.status(400).json({ ok: false, error: 'Invalid search parameters' });
  }
});

// POST /talents - Create talent
talentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = CreateTalentRequestSchema.parse(req.body);
    const talent = await talentRepository.create(data);
    res.status(201).json({ ok: true, talent });
  } catch (error) {
    logger.error({ error }, 'Failed to create talent');
    res.status(400).json({ ok: false, error: 'Invalid talent data' });
  }
});

// GET /talents/:id - Get talent by ID
talentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const talent = await talentRepository.findById(req.params.id);
    if (!talent) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }
    res.json({ ok: true, talent });
  } catch (error) {
    logger.error({ error }, 'Failed to get talent');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// PATCH /talents/:id - Update talent
talentRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const talent = await talentRepository.update(req.params.id, req.body);
    if (!talent) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }
    res.json({ ok: true, talent });
  } catch (error) {
    logger.error({ error }, 'Failed to update talent');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// DELETE /talents/:id - Delete talent
talentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await talentRepository.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }
    res.json({ ok: true, deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete talent');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /talents/:id/signals - Detect and add signals
talentRouter.post('/:id/signals', async (req: Request, res: Response) => {
  try {
    const talent = await talentRepository.findById(req.params.id);
    if (!talent) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }

    const signals = matchingEngine.detectSignals(req.body);
    const updatedSignals = [...talent.signals, ...signals];

    // Recalculate score based on signals
    const avgSignalScore =
      updatedSignals.reduce((sum, s) => sum + s.score * s.confidence, 0) /
      (updatedSignals.length || 1);
    const newScore = Math.round(
      talent.overallScore * 0.6 + avgSignalScore * 0.4,
    );

    const updated = await talentRepository.update(req.params.id, {
      signals: updatedSignals,
      overallScore: newScore,
    });

    res.json({ ok: true, talent: updated, newSignals: signals });
  } catch (error) {
    logger.error({ error }, 'Failed to detect signals');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /talents/match - Match talents against criteria
talentRouter.post('/match', async (req: Request, res: Response) => {
  try {
    const criteria = MatchCriteriaSchema.parse(req.body);
    const { talents } = await talentRepository.findAll({ limit: 100, offset: 0 });
    const results = matchingEngine.rankTalents(talents, criteria);
    res.json({ ok: true, matches: results });
  } catch (error) {
    logger.error({ error }, 'Failed to match talents');
    res.status(400).json({ ok: false, error: 'Invalid match criteria' });
  }
});

// POST /talents/:id/incentive - Generate incentive package
talentRouter.post('/:id/incentive', async (req: Request, res: Response) => {
  try {
    const talent = await talentRepository.findById(req.params.id);
    if (!talent) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }

    const pkg = incentiveGenerator.generatePackage(talent);
    await talentRepository.saveIncentivePackage(pkg);

    res.json({ ok: true, incentivePackage: pkg });
  } catch (error) {
    logger.error({ error }, 'Failed to generate incentive package');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /talents/:id/incentive - Get incentive package
talentRouter.get('/:id/incentive', async (req: Request, res: Response) => {
  try {
    const pkg = await talentRepository.getIncentivePackage(req.params.id);
    if (!pkg) {
      return res
        .status(404)
        .json({ ok: false, error: 'Incentive package not found' });
    }
    res.json({ ok: true, incentivePackage: pkg });
  } catch (error) {
    logger.error({ error }, 'Failed to get incentive package');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// POST /talents/:id/onboarding - Generate onboarding plan
talentRouter.post('/:id/onboarding', async (req: Request, res: Response) => {
  try {
    const talent = await talentRepository.findById(req.params.id);
    if (!talent) {
      return res.status(404).json({ ok: false, error: 'Talent not found' });
    }

    const plan = onboardingService.generatePlan(talent);
    await talentRepository.saveOnboardingPlan(plan);

    // Update status to onboarding
    await talentRepository.updateStatus(req.params.id, 'onboarding');

    res.json({ ok: true, onboardingPlan: plan });
  } catch (error) {
    logger.error({ error }, 'Failed to generate onboarding plan');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /talents/:id/onboarding - Get onboarding plan
talentRouter.get('/:id/onboarding', async (req: Request, res: Response) => {
  try {
    const plan = await talentRepository.getOnboardingPlan(req.params.id);
    if (!plan) {
      return res
        .status(404)
        .json({ ok: false, error: 'Onboarding plan not found' });
    }

    const progress = onboardingService.calculateProgress(plan);
    res.json({ ok: true, onboardingPlan: plan, progress });
  } catch (error) {
    logger.error({ error }, 'Failed to get onboarding plan');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /talents/stats - Get talent statistics
talentRouter.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const stats = await talentRepository.getStats();
    res.json({ ok: true, stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get stats');
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
