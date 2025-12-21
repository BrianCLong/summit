import { Router } from 'express';
import { PartnerService } from './PartnerService.js';

const router = Router();
const service = PartnerService.getInstance();

/**
 * GET /partners/strategy
 * Get the configured strategy (Archetypes, Motions, Tiers, Governance).
 */
router.get('/strategy', (req, res) => {
  res.json(service.getStrategy());
});

/**
 * GET /partners
 * List all partners.
 */
router.get('/', async (req, res) => {
  const partners = await service.getAllPartners();
  res.json(partners);
});

/**
 * GET /partners/:id
 * Get a specific partner.
 */
router.get('/:id', async (req, res) => {
  const partner = await service.getPartner(req.params.id);
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found' });
  }
  res.json(partner);
});

/**
 * POST /partners
 * Create a new partner.
 */
router.post('/', async (req, res) => {
  try {
    // Extract user role from request (set by auth middleware)
    // Assuming req.user exists and has a role property
    const userRole = (req as any).user?.role;
    const partner = await service.createPartner(req.body, userRole);
    res.status(201).json(partner);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /partners/:id
 * Update a partner.
 */
router.put('/:id', async (req, res) => {
  try {
    const partner = await service.updatePartner(req.params.id, req.body);
    res.json(partner);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * DELETE /partners/:id
 * Delete a partner.
 */
router.delete('/:id', async (req, res) => {
  await service.deletePartner(req.params.id);
  res.status(204).send();
});

/**
 * POST /partners/:id/targets
 * Set targets for a partner.
 */
router.post('/:id/targets', async (req, res) => {
  try {
    const partner = await service.setPartnerTargets(req.params.id, req.body.targets);
    res.json(partner);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
