import { Router, Request, Response } from 'express';
import { SITREPSchema } from '../infowar/schemas.js';
import { auditFirstMiddleware } from '../middleware/audit-first.js';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        roles: string[];
    };
}

const router = Router();

router.get('/sitrep/:id', auditFirstMiddleware, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { id } = authReq.params;

  if (process.env.FEATURE_INFOWAR_API !== 'true') {
    return res.status(403).json({ error: 'INFOWAR_API feature flagged OFF' });
  }

  const user = authReq.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const roles = user.roles || [];
  if (!roles.includes('analyst') && !roles.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions for InfoWar data' });
  }

  console.log(`[AUDIT] INFOWAR_SITREP_VIEWED: ${id} by ${user.id}`);

  const sitrep = {
    id,
    type: 'Monthly SITREP' as const,
    generatedAt: new Date().toISOString(),
    narratives: [],
    claims: [],
    connectivity: [],
    evidenceIndex: {
      version: "1.0",
      item_slug: "INFOWAR" as const,
      entries: []
    }
  };

  try {
    const validated = SITREPSchema.parse(sitrep);
    res.json(validated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Internal schema validation error', details: message });
  }
});

export default router;
