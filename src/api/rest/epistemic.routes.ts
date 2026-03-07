import { EpistemicService } from '../../agents/maestro/epistemic/service';
import { TRUST_CP_ENABLED } from '../../agents/maestro/epistemic/api';

export function setupRoutes(app: any) {
  if (!TRUST_CP_ENABLED) return;

  const service = new EpistemicService();
  app.post('/api/epistemic/evaluate', async (req: any, res: any) => {
    const decision = await service.handleEvaluate(req.body);
    res.json({ decision });
  });
}
