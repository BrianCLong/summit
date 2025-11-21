import { Router, Request, Response } from 'express';
import { citizenService } from '../services/CitizenService.js';
import {
  CitizenProfileSchema,
  ServiceDomainSchema,
  ServiceRecordSchema,
} from '../schemas/citizen.js';
import { z } from 'zod';

const router = Router();

/**
 * POST /citizens
 * Register or update a citizen - ingest data once
 */
router.post('/citizens', async (req: Request, res: Response) => {
  try {
    const data = z.object({
      nationalId: z.string().min(1),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      middleName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
      nationality: z.string().optional(),
      contact: z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
        }).optional(),
      }).optional(),
      source: z.string().default('api'),
    }).parse(req.body);

    const citizen = await citizenService.registerCitizen(data);
    res.status(201).json(citizen);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /citizens/:id
 * Get citizen profile
 */
router.get('/citizens/:id', async (req: Request, res: Response) => {
  try {
    const view = await citizenService.getUnifiedView(req.params.id);
    if (!view.profile) {
      res.status(404).json({ error: 'Citizen not found' });
      return;
    }
    res.json(view);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /citizens/:id/consent
 * Grant consent for data sharing
 */
router.post('/citizens/:id/consent', async (req: Request, res: Response) => {
  try {
    const data = z.object({
      domain: ServiceDomainSchema,
      scope: z.array(z.string()),
      expiryDays: z.number().optional(),
    }).parse(req.body);

    const consent = await citizenService.grantConsent({
      citizenId: req.params.id,
      ...data,
    });
    res.status(201).json(consent);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /citizens/:id/services
 * Request a government service
 */
router.post('/citizens/:id/services', async (req: Request, res: Response) => {
  try {
    const data = z.object({
      domain: ServiceDomainSchema,
      serviceType: z.string(),
      metadata: z.record(z.unknown()).optional(),
    }).parse(req.body);

    const record = await citizenService.requestService({
      citizenId: req.params.id,
      ...data,
    });
    res.status(201).json(record);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Consent required')) {
      res.status(403).json({ error: error.message });
    } else if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /citizens/:id/recommendations
 * Get proactive service recommendations
 */
router.get('/citizens/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const recommendations = await citizenService.getRecommendations(req.params.id);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /citizens/:id/eligibility
 * Compute eligibility for a service
 */
router.post('/citizens/:id/eligibility', async (req: Request, res: Response) => {
  try {
    const data = z.object({
      domain: ServiceDomainSchema,
      serviceType: z.string(),
    }).parse(req.body);

    const eligibility = await citizenService.computeEligibility({
      citizenId: req.params.id,
      ...data,
    });
    res.json(eligibility);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
