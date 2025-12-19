import logger from '../../config/logger.js';
import { PremiumModelRouter } from '../premium-routing/premium-model-router.js';
import { OrchestrationService } from '../web-orchestration/orchestration-service.js';

type Handler = (req: any, res: any) => any;

class SimpleResponse {
  statusCode = 200;
  body: unknown = null;

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(payload: unknown): this {
    this.body = payload;
    return this;
  }
}

class SimpleRouter {
  routes: Record<string, Handler[]> = {};
  middlewares: Handler[] = [];

  use(handler: Handler): void {
    this.middlewares.push(handler);
  }

  post(path: string, handler: Handler): void {
    this.routes[path] = [...(this.routes[path] ?? []), handler];
  }
}

const router = new SimpleRouter();

// Initialize services
const orchestrationService = new OrchestrationService();
const premiumRouter = new PremiumModelRouter();
let initialized = false;

const ensureInitialized = async () => {
  if (initialized) return;
  await Promise.all([orchestrationService.initialize(), premiumRouter.connect()]);
  initialized = true;
  logger.info('Conductor API initialized (simplified mode)');
};

router.post('/orchestrate', async (req: any, res: any) => {
  const response = res instanceof SimpleResponse ? res : new SimpleResponse();

  try {
    await ensureInitialized();
    const { query, context, constraints } = req?.body ?? {};

    if (!query || !context?.userId || !context?.tenantId) {
      return response.status(400).json({
        success: false,
        error: 'Missing required fields: query, context.userId, context.tenantId',
      });
    }

    const result = await orchestrationService.orchestrate({
      query,
      context: {
        userId: context.userId,
        tenantId: context.tenantId,
        purpose: context.purpose || 'intelligence_analysis',
        urgency: context.urgency || 'medium',
        budgetLimit: context.budgetLimit || 25,
        qualityThreshold: context.qualityThreshold || 0.8,
        expectedOutputLength: context.expectedOutputLength || 2000,
      },
      constraints: constraints || {},
    });

    return response.json({ success: true, data: result });
  } catch (error) {
    logger.error('Conductor orchestration failed', { error: (error as Error).message });
    return response.status(500).json({
      success: false,
      error: 'Internal error while orchestrating request',
    });
  }
});

export { router };
export default router;
