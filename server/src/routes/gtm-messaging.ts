import { Router } from 'express';
import { GtmMessagingService } from '../gtm/gtm-messaging-service.js';
import { ClaimInputSchema } from '../gtm/types.js';

export const gtmRouter = Router();
const service = new GtmMessagingService();

function asyncHandler(fn: any) {
  return async (req: any, res: any, next: any) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

gtmRouter.get(
  '/icp',
  asyncHandler(async (_req, res) => {
    res.json(await service.getIcpBrief());
  }),
);

gtmRouter.get(
  '/message-house',
  asyncHandler(async (_req, res) => {
    res.json(await service.getMessageHouse());
  }),
);

gtmRouter.post(
  '/claims',
  asyncHandler(async (req, res) => {
    const parsed = ClaimInputSchema.parse(req.body);
    const result = await service.submitClaim(parsed);
    res.status(201).json(result);
  }),
);

gtmRouter.post(
  '/claims/:claimId/approve',
  asyncHandler(async (req, res) => {
    const { claimId } = req.params;
    const { approver, notes } = req.body as { approver: string; notes?: string };
    if (!approver) {
      return res.status(400).json({ error: 'approver is required' });
    }
    const claim = await service.recordApproval(claimId, approver as any, notes);
    res.json(claim);
  }),
);

gtmRouter.post(
  '/claims/expire',
  asyncHandler(async (_req, res) => {
    const expired = await service.expireClaims();
    res.json({ expired });
  }),
);

gtmRouter.get(
  '/claims/channel/:channel',
  asyncHandler(async (req, res) => {
    res.json(await service.listClaimsForChannel(req.params.channel as any));
  }),
);

gtmRouter.get(
  '/templates',
  asyncHandler(async (_req, res) => {
    res.json({ templates: service.getContentTemplates() });
  }),
);

gtmRouter.get(
  '/website-kpis',
  asyncHandler(async (_req, res) => {
    res.json({ kpis: service.getWebsiteKpis() });
  }),
);

gtmRouter.get(
  '/nurture-tracks',
  asyncHandler(async (_req, res) => {
    res.json({ nurture: service.getNurtureTracks() });
  }),
);

gtmRouter.get(
  '/enablement',
  asyncHandler(async (_req, res) => {
    res.json({ assets: service.getEnablementAssets() });
  }),
);

gtmRouter.get(
  '/channels',
  asyncHandler(async (_req, res) => {
    res.json({ playbooks: service.getChannelPlaybooks() });
  }),
);

gtmRouter.get(
  '/checklist',
  asyncHandler(async (_req, res) => {
    const claims = await service.listClaimsForChannel('web');
    res.json({ checklist: service.buildExecutionChecklist(claims) });
  }),
);

gtmRouter.get(
  '/evidence-graph',
  asyncHandler(async (_req, res) => {
    const claims = await service.listClaimsForChannel('web');
    res.json({ graph: service.buildEvidenceGraph(claims) });
  }),
);

gtmRouter.post(
  '/routing',
  asyncHandler(async (req, res) => {
    const { behavioralScore, firmographic, intentLevel } = req.body as {
      behavioralScore: number;
      firmographic: 'smb' | 'mid-market' | 'enterprise';
      intentLevel: 'low' | 'medium' | 'high';
    };
    if (behavioralScore === undefined || !firmographic || !intentLevel) {
      return res.status(400).json({ error: 'behavioralScore, firmographic, and intentLevel are required' });
    }
    res.json({ route: service.decideAdaptiveRoute({ behavioralScore, firmographic, intentLevel }) });
  }),
);

gtmRouter.post(
  '/qa/scan',
  asyncHandler(async (req, res) => {
    const { content } = req.body as { content: string };
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    res.json(await service.closedLoopQa(content));
  }),
);

export default gtmRouter;
