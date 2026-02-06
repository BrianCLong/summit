/**
 * Internationalization API Routes
 *
 * REST API for locale management, translations, and regional compliance.
 *
 * @module routes/i18n
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { i18nService } from '../i18n/index.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { isEnabled } from '../lib/featureFlags.js';
import logger from '../utils/logger.js';

const router = Router();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

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
const LocalizeSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
  targetLocale: z.string(),
  sourceLocale: z.string().optional(),
  namespace: z.string().optional(),
  interpolations: z.record(z.union([z.string(), z.number()])).optional(),
});

const SetPreferencesSchema = z.object({
  preferredLocale: z.string().optional(),
  fallbackLocale: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  currencyDisplay: z.enum(['symbol', 'code', 'name']).optional(),
});

const FormatDateSchema = z.object({
  date: z.string().transform((str: string) => new Date(str)),
  locale: z.string(),
  dateStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
  timeStyle: z.enum(['full', 'long', 'medium', 'short']).optional(),
  timezone: z.string().optional(),
  hour12: z.boolean().optional(),
});

const FormatCurrencySchema = z.object({
  value: z.number(),
  locale: z.string(),
  currency: z.string(),
  display: z.enum(['symbol', 'code', 'name']).optional(),
  minimumFractionDigits: z.number().optional(),
  maximumFractionDigits: z.number().optional(),
});

/**
 * Get supported locales
 * GET /api/v1/i18n/locales
 */
router.get(
  '/locales',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = i18nService.getSupportedLocales();
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get locale configuration
 * GET /api/v1/i18n/locales/:locale
 */
router.get(
  '/locales/:locale',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { locale } = req.params;
      const config = i18nService.getLocaleConfig(locale as any);

      if (!config) {
        res.status(404).json({ error: 'Locale not found' });
        return;
      }

      res.json({ data: config });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Detect locale from request
 * GET /api/v1/i18n/detect
 */
router.get(
  '/detect',
  optionalAuth,
  requireFeatureFlag('i18n.autoDetect'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const headers = req.headers as Record<string, string>;
      const cookies = req.cookies || {};

      // Get user preferences if authenticated
      let userPreferences;
      if (req.user) {
        userPreferences = await i18nService.getUserLocalePreferences(
          req.user.id,
          req.user.tenantId
        );
      }

      const result = i18nService.detectLocale(
        headers,
        cookies,
        userPreferences || undefined,
        undefined
      );

      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Translate a key
 * GET /api/v1/i18n/translate
 */
router.get(
  '/translate',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.query.key as string;
      const locale = (req.query.locale as string) || 'en-US';
      const namespace = (req.query.namespace as string) || 'common';

      if (!key) {
        res.status(400).json({ error: 'Translation key is required' });
        return;
      }

      const result = i18nService.translate(key, locale as any, namespace as any);
      res.json({ data: { key, locale, translation: result } });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Localize content
 * POST /api/v1/i18n/localize
 */
router.post(
  '/localize',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = LocalizeSchema.parse(req.body);

      const result = await i18nService.localize({
        content: data.content,
        targetLocale: data.targetLocale as any,
        sourceLocale: data.sourceLocale as any,
        namespace: data.namespace as any,
        interpolations: data.interpolations,
      });

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Format date
 * POST /api/v1/i18n/format/date
 */
router.post(
  '/format/date',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = FormatDateSchema.parse(req.body);

      const result = i18nService.formatDate(data.date, {
        locale: data.locale as any,
        dateStyle: data.dateStyle,
        timeStyle: data.timeStyle,
        timezone: data.timezone,
        hour12: data.hour12,
      });

      res.json({ data: { formatted: result } });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Format number
 * POST /api/v1/i18n/format/number
 */
router.post(
  '/format/number',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { value, locale } = req.body;

      if (typeof value !== 'number') {
        res.status(400).json({ error: 'Value must be a number' });
        return;
      }

      const result = i18nService.formatNumber(value, (locale || 'en-US') as any);
      res.json({ data: { formatted: result } });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Format currency
 * POST /api/v1/i18n/format/currency
 */
router.post(
  '/format/currency',
  optionalAuth,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = FormatCurrencySchema.parse(req.body);

      const result = i18nService.formatCurrency(data.value, {
        locale: data.locale as any,
        currency: data.currency,
        display: data.display,
        minimumFractionDigits: data.minimumFractionDigits,
        maximumFractionDigits: data.maximumFractionDigits,
      });

      res.json({ data: { formatted: result } });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get regional compliance requirements
 * GET /api/v1/i18n/compliance/:region
 */
router.get(
  '/compliance/:region',
  ensureAuthenticated,
  requireFeatureFlag('i18n.regionalCompliance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const region = singleParam(req.params.region);
      const result = i18nService.getRegionalCompliance(region);

      if (!result.data) {
        res.status(404).json({ error: 'Region not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get compliance for locale
 * GET /api/v1/i18n/locales/:locale/compliance
 */
router.get(
  '/locales/:locale/compliance',
  ensureAuthenticated,
  requireFeatureFlag('i18n.regionalCompliance'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const locale = singleParam(req.params.locale);
      const result = i18nService.getComplianceForLocale(locale as any);

      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get translation status
 * GET /api/v1/i18n/status/:locale
 */
router.get(
  '/status/:locale',
  ensureAuthenticated,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { locale } = req.params;
      const result = await i18nService.getTranslationStatus(locale as any);
      res.json(result);
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Set user locale preferences
 * PUT /api/v1/i18n/preferences
 */
router.put(
  '/preferences',
  ensureAuthenticated,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = SetPreferencesSchema.parse(req.body);
      const { tenantId, id: userId } = req.user!;

      await i18nService.setUserLocalePreferences(userId, tenantId, data);

      res.json({ success: true });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * Get user locale preferences
 * GET /api/v1/i18n/preferences
 */
router.get(
  '/preferences',
  ensureAuthenticated,
  requireFeatureFlag('i18n.enabled'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, id: userId } = req.user!;

      const result = await i18nService.getUserLocalePreferences(userId, tenantId);

      res.json({ data: result });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
