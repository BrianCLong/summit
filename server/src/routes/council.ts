import { Router, Request, Response } from 'express';
import { CouncilService } from '../services/CouncilService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();
const councilService = CouncilService.getInstance();

router.use(ensureAuthenticated);

// Create a new architectural proposal
router.post('/proposals', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { title, description, metadata, evidenceBundleUri } = req.body;
    const tenantId = (req.headers['x-tenant-id'] as string) || user.tenantId || 'global';

    const proposal = await councilService.createProposal({
      title,
      description,
      proposerId: user.id,
      tenantId,
      metadata,
      evidenceBundleUri,
    });

    res.status(201).json(proposal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific proposal
router.get('/proposals/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = (req.headers['x-tenant-id'] as string) || user.tenantId || 'global';
    const proposal = await councilService.getProposal(req.params.id, tenantId);

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    res.json(proposal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cast a vote on a proposal
router.post('/proposals/:id/vote', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { vote, reason, evidenceHash } = req.body;
    const tenantId = (req.headers['x-tenant-id'] as string) || user.tenantId || 'global';

    const result = await councilService.castVote({
      proposalId: req.params.id,
      voterId: user.id,
      tenantId,
      vote,
      reason,
      evidenceHash,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Register a council member (Admin only)
router.post('/members', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    const { userId, role } = req.body;
    const tenantId = (req.headers['x-tenant-id'] as string) || user.tenantId || 'global';

    await councilService.registerCouncilMember(userId, tenantId, role);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
