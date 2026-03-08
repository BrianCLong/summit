"use strict";
/**
 * Internationalization API Routes
 *
 * REST API for locale management, translations, and regional compliance.
 *
 * @module routes/i18n
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const index_js_1 = require("../i18n/index.js");
const auth_js_1 = require("../middleware/auth.js");
const featureFlags_js_1 = require("../lib/featureFlags.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
// Feature flag check middleware
const requireFeatureFlag = (flagName) => {
    return (req, res, next) => {
        const context = { userId: req.user?.id, tenantId: req.user?.tenantId };
        if (!(0, featureFlags_js_1.isEnabled)(flagName, context)) {
            res.status(403).json({ error: `Feature '${flagName}' is not enabled` });
            return;
        }
        next();
    };
};
// Optional auth middleware - allows unauthenticated access
const optionalAuth = async (req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
        ? auth.slice('Bearer '.length)
        : req.headers['x-access-token'] || null;
    if (!token) {
        // Allow unauthenticated access
        next();
        return;
    }
    // If token is provided, validate it
    try {
        const AuthService = (await Promise.resolve().then(() => __importStar(require('../services/AuthService.js')))).default;
        const authService = new AuthService();
        const user = await authService.verifyToken(token);
        if (user) {
            // Map User to Express request user shape
            req.user = {
                id: user.id,
                tenantId: user.defaultTenantId || 'default',
                role: user.role,
                email: user.email,
            };
        }
    }
    catch {
        // Invalid token - continue without auth
    }
    next();
};
// Validation schemas
const LocalizeSchema = zod_1.z.object({
    content: zod_1.z.union([zod_1.z.string(), zod_1.z.record(zod_1.z.unknown())]),
    targetLocale: zod_1.z.string(),
    sourceLocale: zod_1.z.string().optional(),
    namespace: zod_1.z.string().optional(),
    interpolations: zod_1.z.record(zod_1.z.union([zod_1.z.string(), zod_1.z.number()])).optional(),
});
const SetPreferencesSchema = zod_1.z.object({
    preferredLocale: zod_1.z.string().optional(),
    fallbackLocale: zod_1.z.string().optional(),
    timezone: zod_1.z.string().optional(),
    dateFormat: zod_1.z.string().optional(),
    timeFormat: zod_1.z.string().optional(),
    currencyDisplay: zod_1.z.enum(['symbol', 'code', 'name']).optional(),
});
const FormatDateSchema = zod_1.z.object({
    date: zod_1.z.string().transform((str) => new Date(str)),
    locale: zod_1.z.string(),
    dateStyle: zod_1.z.enum(['full', 'long', 'medium', 'short']).optional(),
    timeStyle: zod_1.z.enum(['full', 'long', 'medium', 'short']).optional(),
    timezone: zod_1.z.string().optional(),
    hour12: zod_1.z.boolean().optional(),
});
const FormatCurrencySchema = zod_1.z.object({
    value: zod_1.z.number(),
    locale: zod_1.z.string(),
    currency: zod_1.z.string(),
    display: zod_1.z.enum(['symbol', 'code', 'name']).optional(),
    minimumFractionDigits: zod_1.z.number().optional(),
    maximumFractionDigits: zod_1.z.number().optional(),
});
/**
 * Get supported locales
 * GET /api/v1/i18n/locales
 */
router.get('/locales', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const result = index_js_1.i18nService.getSupportedLocales();
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get locale configuration
 * GET /api/v1/i18n/locales/:locale
 */
router.get('/locales/:locale', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const { locale } = req.params;
        const config = index_js_1.i18nService.getLocaleConfig(locale);
        if (!config) {
            res.status(404).json({ error: 'Locale not found' });
            return;
        }
        res.json({ data: config });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Detect locale from request
 * GET /api/v1/i18n/detect
 */
router.get('/detect', optionalAuth, requireFeatureFlag('i18n.autoDetect'), async (req, res, next) => {
    try {
        const headers = req.headers;
        const cookies = req.cookies || {};
        // Get user preferences if authenticated
        let userPreferences;
        if (req.user) {
            userPreferences = await index_js_1.i18nService.getUserLocalePreferences(req.user.id, req.user.tenantId);
        }
        const result = index_js_1.i18nService.detectLocale(headers, cookies, userPreferences || undefined, undefined);
        res.json({ data: result });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Translate a key
 * GET /api/v1/i18n/translate
 */
router.get('/translate', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const key = req.query.key;
        const locale = req.query.locale || 'en-US';
        const namespace = req.query.namespace || 'common';
        if (!key) {
            res.status(400).json({ error: 'Translation key is required' });
            return;
        }
        const result = index_js_1.i18nService.translate(key, locale, namespace);
        res.json({ data: { key, locale, translation: result } });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Localize content
 * POST /api/v1/i18n/localize
 */
router.post('/localize', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const data = LocalizeSchema.parse(req.body);
        const result = await index_js_1.i18nService.localize({
            content: data.content,
            targetLocale: data.targetLocale,
            sourceLocale: data.sourceLocale,
            namespace: data.namespace,
            interpolations: data.interpolations,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Format date
 * POST /api/v1/i18n/format/date
 */
router.post('/format/date', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const data = FormatDateSchema.parse(req.body);
        const result = index_js_1.i18nService.formatDate(data.date, {
            locale: data.locale,
            dateStyle: data.dateStyle,
            timeStyle: data.timeStyle,
            timezone: data.timezone,
            hour12: data.hour12,
        });
        res.json({ data: { formatted: result } });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Format number
 * POST /api/v1/i18n/format/number
 */
router.post('/format/number', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const { value, locale } = req.body;
        if (typeof value !== 'number') {
            res.status(400).json({ error: 'Value must be a number' });
            return;
        }
        const result = index_js_1.i18nService.formatNumber(value, (locale || 'en-US'));
        res.json({ data: { formatted: result } });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Format currency
 * POST /api/v1/i18n/format/currency
 */
router.post('/format/currency', optionalAuth, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const data = FormatCurrencySchema.parse(req.body);
        const result = index_js_1.i18nService.formatCurrency(data.value, {
            locale: data.locale,
            currency: data.currency,
            display: data.display,
            minimumFractionDigits: data.minimumFractionDigits,
            maximumFractionDigits: data.maximumFractionDigits,
        });
        res.json({ data: { formatted: result } });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get regional compliance requirements
 * GET /api/v1/i18n/compliance/:region
 */
router.get('/compliance/:region', auth_js_1.ensureAuthenticated, requireFeatureFlag('i18n.regionalCompliance'), async (req, res, next) => {
    try {
        const region = (0, http_param_js_1.firstStringOr)(req.params.region, '');
        const result = index_js_1.i18nService.getRegionalCompliance(region);
        if (!result.data) {
            res.status(404).json({ error: 'Region not found' });
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get compliance for locale
 * GET /api/v1/i18n/locales/:locale/compliance
 */
router.get('/locales/:locale/compliance', auth_js_1.ensureAuthenticated, requireFeatureFlag('i18n.regionalCompliance'), async (req, res, next) => {
    try {
        const { locale } = req.params;
        const result = index_js_1.i18nService.getComplianceForLocale(locale);
        res.json({ data: result });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get translation status
 * GET /api/v1/i18n/status/:locale
 */
router.get('/status/:locale', auth_js_1.ensureAuthenticated, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const { locale } = req.params;
        const result = await index_js_1.i18nService.getTranslationStatus(locale);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * Set user locale preferences
 * PUT /api/v1/i18n/preferences
 */
router.put('/preferences', auth_js_1.ensureAuthenticated, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const data = SetPreferencesSchema.parse(req.body);
        const { tenantId, id: userId } = req.user;
        await index_js_1.i18nService.setUserLocalePreferences(userId, tenantId, data);
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
/**
 * Get user locale preferences
 * GET /api/v1/i18n/preferences
 */
router.get('/preferences', auth_js_1.ensureAuthenticated, requireFeatureFlag('i18n.enabled'), async (req, res, next) => {
    try {
        const { tenantId, id: userId } = req.user;
        const result = await index_js_1.i18nService.getUserLocalePreferences(userId, tenantId);
        res.json({ data: result });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
