/**
 * Authority and License Compiler Hooks
 * Runtime enforcement of license restrictions and authority checks
 *
 * These hooks block unsafe operations based on:
 * - License tier and feature flags
 * - User authority levels
 * - Compliance requirements
 */

import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino();

export interface LicenseConfig {
  tier: 'free' | 'professional' | 'enterprise' | 'federal';
  features: Set<string>;
  maxUsers?: number;
  maxEntities?: number;
  aiEnabled: boolean;
  exportEnabled: boolean;
  complianceMode?: 'standard' | 'hipaa' | 'fedramp' | 'il5';
}

export interface AuthorityLevel {
  user: string;
  level: 'read' | 'write' | 'admin' | 'superadmin';
  clearance?: string;
  organization: string;
}

/**
 * Global license configuration (loaded from license server/file)
 * In production, this would be fetched from a license validation service
 */
let currentLicense: LicenseConfig = {
  tier: 'enterprise',
  features: new Set([
    'ai_analysis',
    'graph_analytics',
    'export',
    'admin',
    'collaboration',
  ]),
  aiEnabled: true,
  exportEnabled: true,
  complianceMode: 'standard',
};

/**
 * Load license configuration (stub - would integrate with license server)
 */
export function loadLicenseConfig(): LicenseConfig {
  // Stub: In production, fetch from license validation service
  const licenseKey = process.env.LICENSE_KEY;

  if (!licenseKey && process.env.NODE_ENV === 'production') {
    logger.warn('No license key found, running in restricted mode');
    return {
      tier: 'free',
      features: new Set(['basic_read']),
      aiEnabled: false,
      exportEnabled: false,
      maxUsers: 5,
      maxEntities: 1000,
    };
  }

  // Stub: Parse license key and return configuration
  return currentLicense;
}

/**
 * Middleware to check if a feature is allowed by license
 */
export function requireFeature(featureName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const license = loadLicenseConfig();

    if (!license.features.has(featureName)) {
      logger.warn({
        msg: 'Feature blocked by license',
        feature: featureName,
        tier: license.tier,
        path: req.path,
      });

      return res.status(403).json({
        error: 'Feature not available',
        code: 'LICENSE_RESTRICTION',
        feature: featureName,
        requiredTier: getRequiredTier(featureName),
        currentTier: license.tier,
      });
    }

    next();
  };
}

/**
 * Block AI operations if not licensed
 */
export function requireAILicense() {
  return (req: Request, res: Response, next: NextFunction) => {
    const license = loadLicenseConfig();

    if (!license.aiEnabled) {
      logger.warn({
        msg: 'AI operation blocked by license',
        tier: license.tier,
        path: req.path,
      });

      return res.status(403).json({
        error: 'AI features not available in your license tier',
        code: 'AI_LICENSE_REQUIRED',
        currentTier: license.tier,
      });
    }

    next();
  };
}

/**
 * Block data export operations if not licensed
 */
export function requireExportLicense() {
  return (req: Request, res: Response, next: NextFunction) => {
    const license = loadLicenseConfig();

    if (!license.exportEnabled) {
      logger.warn({
        msg: 'Export operation blocked by license',
        tier: license.tier,
        path: req.path,
      });

      return res.status(403).json({
        error: 'Export features not available in your license tier',
        code: 'EXPORT_LICENSE_REQUIRED',
        currentTier: license.tier,
      });
    }

    next();
  };
}

/**
 * Check authority level for sensitive operations
 */
export function requireAuthority(
  minimumLevel: 'read' | 'write' | 'admin' | 'superadmin',
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const authority = getUserAuthority(user);
    const levels = ['read', 'write', 'admin', 'superadmin'];
    const userLevelIndex = levels.indexOf(authority.level);
    const requiredLevelIndex = levels.indexOf(minimumLevel);

    if (userLevelIndex < requiredLevelIndex) {
      logger.warn({
        msg: 'Insufficient authority',
        user: user.id,
        required: minimumLevel,
        actual: authority.level,
        path: req.path,
      });

      return res.status(403).json({
        error: 'Insufficient authority',
        code: 'INSUFFICIENT_AUTHORITY',
        required: minimumLevel,
        actual: authority.level,
      });
    }

    next();
  };
}

/**
 * Compliance mode enforcement (HIPAA, FedRAMP, etc.)
 */
export function enforceComplianceMode() {
  return (req: Request, res: Response, next: NextFunction) => {
    const license = loadLicenseConfig();

    if (license.complianceMode === 'fedramp' || license.complianceMode === 'il5') {
      // Federal compliance: require additional audit logging
      logger.info({
        msg: 'Federal compliance operation',
        mode: license.complianceMode,
        user: (req as any).user?.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });

      // Inject compliance headers
      res.setHeader('X-Compliance-Mode', license.complianceMode);
      res.setHeader('X-Audit-Required', 'true');
    }

    next();
  };
}

/**
 * Helper: Get user authority from request
 */
function getUserAuthority(user: any): AuthorityLevel {
  // Stub: In production, fetch from authorization service
  return {
    user: user.id || 'unknown',
    level: user.role || 'read',
    clearance: user.clearance,
    organization: user.organization || 'default',
  };
}

/**
 * Helper: Map feature to required tier
 */
function getRequiredTier(featureName: string): string {
  const tierMap: Record<string, string> = {
    ai_analysis: 'professional',
    graph_analytics: 'professional',
    export: 'professional',
    admin: 'enterprise',
    collaboration: 'enterprise',
    federal_compliance: 'federal',
  };
  return tierMap[featureName] || 'enterprise';
}

/**
 * Initialize license system (called on startup)
 */
export function initializeLicenseSystem() {
  currentLicense = loadLicenseConfig();
  logger.info({
    msg: 'License system initialized',
    tier: currentLicense.tier,
    features: Array.from(currentLicense.features),
    complianceMode: currentLicense.complianceMode,
  });
}
