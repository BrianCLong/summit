/**
 * Contextual Help Controller
 * Handles in-product help and Copilot integration endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  contextualHelpService,
  copilotIntegrationService,
} from '../services/index.js';
import {
  ContextualHelpRequestSchema,
  CopilotKBQuerySchema,
  AudienceRole,
} from '../types/index.js';

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  role: z.nativeEnum(AudienceRole).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export class ContextualHelpController {
  /**
   * Get contextual help for a UI route
   * POST /kb/context
   */
  async getContextualHelp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const request = ContextualHelpRequestSchema.parse(req.body);
      const result = await contextualHelpService.getContextualHelp(request);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get help for a specific anchor
   * GET /kb/anchor/:anchorKey
   */
  async getAnchorHelp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { anchorKey } = req.params;
      const uiRoute = req.query.route as string;
      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;

      if (!uiRoute) {
        res.status(400).json({ error: 'Route parameter required' });
        return;
      }

      const articles = await contextualHelpService.getAnchorHelp(
        anchorKey,
        uiRoute,
        userRole
      );

      res.json({ articles });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search KB for help content
   * GET /kb/search
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = SearchQuerySchema.parse(req.query);
      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;

      const articles = await contextualHelpService.searchHelp(
        query.q,
        userRole || query.role,
        query.limit
      );

      res.json({ articles, total: articles.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get help anchors for a route
   * GET /kb/anchors
   */
  async getRouteAnchors(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uiRoute = req.query.route as string;

      if (!uiRoute) {
        res.status(400).json({ error: 'Route parameter required' });
        return;
      }

      const anchors = await contextualHelpService.getRouteAnchors(uiRoute);
      res.json({ anchors });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if help exists for a route
   * GET /kb/has-help
   */
  async hasHelpContent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const uiRoute = req.query.route as string;

      if (!uiRoute) {
        res.status(400).json({ error: 'Route parameter required' });
        return;
      }

      const hasHelp = await contextualHelpService.hasHelpContent(uiRoute);
      res.json({ hasHelp });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get onboarding content
   * GET /kb/onboarding
   */
  async getOnboarding(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;
      const articles = await contextualHelpService.getOnboardingContent(userRole);
      res.json({ articles });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Query KB for Copilot
   * POST /kb/copilot/query
   */
  async copilotQuery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = CopilotKBQuerySchema.parse(req.body);
      const result = await copilotIntegrationService.queryForCopilot(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single document for Copilot
   * GET /kb/copilot/document/:id
   */
  async getCopilotDocument(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;

      const document = await copilotIntegrationService.getDocumentForCopilot(
        id,
        userRole
      );

      if (!document) {
        res.status(404).json({ error: 'Document not found or not published' });
        return;
      }

      res.json(document);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recently updated documents for Copilot sync
   * GET /kb/copilot/updates
   */
  async getCopilotUpdates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const since = req.query.since as string;

      if (!since) {
        res.status(400).json({ error: 'Since parameter required (ISO date)' });
        return;
      }

      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      const userRole = req.headers['x-user-role'] as AudienceRole | undefined;
      const documents = await copilotIntegrationService.getRecentlyUpdated(
        sinceDate,
        userRole
      );

      res.json({ documents, count: documents.length });
    } catch (error) {
      next(error);
    }
  }
}

export const contextualHelpController = new ContextualHelpController();
