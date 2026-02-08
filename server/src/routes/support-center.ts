/**
 * Support Center API Routes
 *
 * REST API for knowledge base, FAQs, and support tickets.
 *
 * @module routes/support-center
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supportCenterService } from '../support/index.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { isEnabled } from '../lib/featureFlags.js';
import logger from '../utils/logger.js';
import {
  supportImpersonationService,
  tenantHealthBundleService,
} from '../services/support/index.js';

const router = Router();

// Feature flag check middleware
const requireFeatureFlag = (flagName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = { userId: req.user?.id, tenantId: req.user?.tenantId };
    if (!isEnabled(flagName, context)) {
      res.status(403).json({ error: `Feature '${flagName}' is not enabled` });
      return;
    }
    next();
  };
};

// Optional auth middleware - allows unauthenticated access
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ')
    ? auth.slice('Bearer '.length)
    : (req.headers['x-access-token'] as string) || null;

  if (!token) {
    // Allow unauthenticated access
    next();
    return;
  }

  // If token is provided, validate it
  try {
    const AuthService = (await import('../services/AuthService.js')).default;
    const authService = new AuthService();
    const user = await authService.verifyToken(token);
    if (user) {
      // Map User to Express request user shape
      req.user = {
        id: user.id,
        tenantId: user.defaultTenantId || 'default',
        role: user.role,
        email: user.email,
      } as any;
    }
  } catch {
    // Invalid token - continue without auth
  }

  next();
};

// Validation schemas
const SearchSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.string().optional(),
  locale: z.string().optional(),
  limit: z.number().min(1).max(50).optional(),
});

const CreateTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(10).max(10000),
  type: z.enum(['question', 'bug', 'feature_request', 'incident', 'compliance', 'security']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
});

const AddMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().optional(),
});

const VoteSchema = z.object({
  helpful: z.boolean(),
});

const ImpersonationStartSchema = z.object({
  targetUserId: z.string().min(1),
  targetTenantId: z.string().min(1),
  reason: z.string().min(5).max(2000),
  ticketId: z.string().optional(),
});

const ImpersonationStopSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(5).max(2000),
});

const TenantHealthBundleSchema = z.object({
  tenantId: z.string().min(1),
  reason: z.string().min(5).max(2000),
});


/**
 * Search knowledge base and FAQs
 * GET /api/v1/support/search
 */
router.get(
  '/search',
  optionalAuth,
  requireFeatureFlag('support.knowledgeBase'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query.q as string;
      const category = req.query.category as string | undefined;
      const locale = req.query.locale as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const result = await supportCenterService.search(query, {
        category: category as any,
        locale,
        limit,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get knowledge base articles
 * GET /api/v1/support/articles
 */
router.get(
  '/articles',
  optionalAuth,
  requireFeatureFlag('support.knowledgeBase'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const locale = req.query.locale as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

      const result = await supportCenterService.getArticles({
        category: category as any,
        locale,
        limit,
        offset,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get article by slug
 * GET /api/v1/support/articles/:slug
 */
router.get(
  '/articles/:slug',
  optionalAuth,
  requireFeatureFlag('support.knowledgeBase'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      const result = await supportCenterService.getArticleBySlug(slug, true);

      if (!result.data) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Vote on article helpfulness
 * POST /api/v1/support/articles/:id/vote
 */
router.post(
  '/articles/:id/vote',
  optionalAuth,
  requireFeatureFlag('support.knowledgeBase'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { helpful } = VoteSchema.parse(req.body);

      await supportCenterService.voteArticle(id, helpful);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get FAQs
 * GET /api/v1/support/faqs
 */
router.get(
  '/faqs',
  optionalAuth,
  requireFeatureFlag('support.faq'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = req.query.category as string | undefined;
      const locale = req.query.locale as string | undefined;

      const result = await supportCenterService.getFAQs({
        category: category as any,
        locale,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Start support impersonation
 * POST /api/v1/support/impersonation/start
 */
router.post(
  '/impersonation/start',
  ensureAuthenticated,
  requireFeatureFlag('support.impersonation'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = ImpersonationStartSchema.parse(req.body);
      const user = req.user as any;
      const actor = {
        id: user?.id as string,
        role: user?.role as string,
        tenantId: (user?.tenantId || user?.defaultTenantId) as string,
        email: user?.email as string | undefined,
      };

      const result = await supportImpersonationService.startImpersonation({
        actor,
        targetUserId: payload.targetUserId,
        targetTenantId: payload.targetTenantId,
        reason: payload.reason,
        ticketId: payload.ticketId,
      });

      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Stop support impersonation
 * POST /api/v1/support/impersonation/stop
 */
router.post(
  '/impersonation/stop',
  ensureAuthenticated,
  requireFeatureFlag('support.impersonation'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = ImpersonationStopSchema.parse(req.body);
      const user = req.user as any;
      const actor = {
        id: user?.id as string,
        role: user?.role as string,
        tenantId: (user?.tenantId || user?.defaultTenantId) as string,
        email: user?.email as string | undefined,
      };

      const result = await supportImpersonationService.stopImpersonation({
        actor,
        sessionId: payload.sessionId,
        reason: payload.reason,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Export tenant health bundle
 * POST /api/v1/support/tenant-health-bundle
 */
router.post(
  '/tenant-health-bundle',
  ensureAuthenticated,
  requireFeatureFlag('support.healthBundle'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = TenantHealthBundleSchema.parse(req.body);
      const user = req.user as any;
      const actor = {
        id: user?.id as string,
        role: user?.role as string,
        tenantId: (user?.tenantId || user?.defaultTenantId) as string,
        email: user?.email as string | undefined,
      };

      const result = await tenantHealthBundleService.exportBundle({
        actor,
        tenantId: payload.tenantId,
        reason: payload.reason,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);


/**
 * Create support ticket
 * POST /api/v1/support/tickets
 */
router.post(
  '/tickets',
  ensureAuthenticated,
  requireFeatureFlag('support.tickets'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateTicketSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      const result = await supportCenterService.createTicket(tenantId, userId, {
        subject: data.subject,
        description: data.description,
        type: data.type,
        priority: data.priority,
        category: data.category as any,
      });

      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Add message to ticket
 * POST /api/v1/support/tickets/:ticketId/messages
 */
router.post(
  '/tickets/:ticketId/messages',
  ensureAuthenticated,
  requireFeatureFlag('support.tickets'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ticketId } = req.params;
      const { content, isInternal } = AddMessageSchema.parse(req.body);
      const { id: userId } = req.user!;

      const result = await supportCenterService.addMessage(
        ticketId,
        userId,
        'customer',
        content,
        isInternal || false
      );

      res.status(201).json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Escalate ticket
 * POST /api/v1/support/tickets/:ticketId/escalate
 */
router.post(
  '/tickets/:ticketId/escalate',
  ensureAuthenticated,
  requireFeatureFlag('support.escalation'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ticketId } = req.params;
      const { reason } = req.body;

      const result = await supportCenterService.escalateTicket(ticketId, reason || 'User requested escalation');

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get support center configuration
 * GET /api/v1/support/config
 */
router.get(
  '/config',
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = supportCenterService.getConfig();

      // Filter out sensitive configuration for non-admin users
      const publicConfig = {
        enabled: result.data.enabled,
        knowledgeBaseEnabled: result.data.knowledgeBaseEnabled,
        faqEnabled: result.data.faqEnabled,
        ticketsEnabled: result.data.ticketsEnabled,
        liveChatEnabled: result.data.liveChatEnabled,
        supportedLocales: result.data.supportedLocales,
      };

      res.json({
        ...result,
        data: publicConfig,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
