/**
 * Feature Flag Middleware
 *
 * Express middleware for feature flag integration
 */

import { Request, Response, NextFunction } from 'express';
import type { FeatureFlagService } from '../FeatureFlagService.js';
import type { FlagContext, FlagVariation } from '../types.js';

/**
 * Extend Express Request to include feature flags
 */
declare global {
  namespace Express {
    interface Request {
      featureFlags?: FeatureFlagMiddlewareContext;
    }
  }
}

/**
 * Feature flag middleware context
 */
export interface FeatureFlagMiddlewareContext {
  /** Check if a boolean flag is enabled */
  isEnabled(key: string, defaultValue?: boolean): Promise<boolean>;

  /** Get a string flag value */
  getString(key: string, defaultValue: string): Promise<string>;

  /** Get a number flag value */
  getNumber(key: string, defaultValue: number): Promise<number>;

  /** Get a JSON flag value */
  getJSON<T = any>(key: string, defaultValue: T): Promise<T>;

  /** Get all flags */
  getAll(): Promise<Record<string, FlagVariation>>;

  /** Track an event */
  track(eventName: string, data?: Record<string, any>): Promise<void>;

  /** Get flag context */
  getContext(): FlagContext;
}

/**
 * Middleware options
 */
export interface FeatureFlagMiddlewareOptions {
  /** Feature flag service instance */
  service: FeatureFlagService;

  /** Function to extract context from request */
  contextBuilder?: (req: Request) => Partial<FlagContext>;

  /** Skip middleware for certain routes */
  skipRoutes?: string[];

  /** Skip middleware for certain methods */
  skipMethods?: string[];
}

/**
 * Create feature flag middleware
 */
export function createFeatureFlagMiddleware(
  options: FeatureFlagMiddlewareOptions,
): (req: Request, res: Response, next: NextFunction) => void {
  const { service, contextBuilder, skipRoutes = [], skipMethods = [] } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Skip if route or method is in skip list
      if (skipRoutes.some((route) => req.path.startsWith(route))) {
        return next();
      }

      if (skipMethods.includes(req.method)) {
        return next();
      }

      // Build flag context from request
      const context = buildContext(req, contextBuilder);

      // Create feature flag middleware context
      req.featureFlags = {
        isEnabled: async (key: string, defaultValue: boolean = false) => {
          return service.getBooleanFlag(key, defaultValue, context);
        },

        getString: async (key: string, defaultValue: string) => {
          return service.getStringFlag(key, defaultValue, context);
        },

        getNumber: async (key: string, defaultValue: number) => {
          return service.getNumberFlag(key, defaultValue, context);
        },

        getJSON: async <T = any>(key: string, defaultValue: T) => {
          return service.getJSONFlag<T>(key, defaultValue, context);
        },

        getAll: async () => {
          return service.getAllFlags(context);
        },

        track: async (eventName: string, data?: Record<string, any>) => {
          return service.track(eventName, context, data);
        },

        getContext: () => context,
      };

      next();
    } catch (error) {
      // Feature flags should not break request handling
      console.error('Feature flag middleware error:', error);
      next();
    }
  };
}

/**
 * Build flag context from request
 */
function buildContext(
  req: Request,
  contextBuilder?: (req: Request) => Partial<FlagContext>,
): FlagContext {
  // Start with default context from request
  const defaultContext: Partial<FlagContext> = {
    userId: (req as any).user?.id || (req as any).user?.userId,
    userEmail: (req as any).user?.email,
    userRole: (req as any).user?.role || (req as any).user?.roles,
    tenantId: (req as any).user?.tenantId || (req as any).tenant?.id,
    sessionId: (req as any).sessionId || req.sessionID,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.get('User-Agent'),
  };

  // Merge with custom context if provided
  if (contextBuilder) {
    const customContext = contextBuilder(req);
    return { ...defaultContext, ...customContext } as FlagContext;
  }

  return defaultContext as FlagContext;
}

/**
 * Create a guard middleware to check if a flag is enabled
 */
export function createFlagGuard(
  flagKey: string,
  options: {
    /** Service instance */
    service: FeatureFlagService;
    /** Redirect URL if flag is disabled */
    redirectUrl?: string;
    /** Custom error message */
    errorMessage?: string;
    /** Status code to return if flag is disabled */
    statusCode?: number;
    /** Context builder */
    contextBuilder?: (req: Request) => Partial<FlagContext>;
  },
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    service,
    redirectUrl,
    errorMessage = 'Feature not available',
    statusCode = 403,
    contextBuilder,
  } = options;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const context = buildContext(req, contextBuilder);
      const isEnabled = await service.getBooleanFlag(flagKey, false, context);

      if (isEnabled) {
        next();
      } else {
        if (redirectUrl) {
          res.redirect(redirectUrl);
        } else {
          res.status(statusCode).json({
            error: errorMessage,
            flagKey,
          });
        }
      }
    } catch (error) {
      console.error(`Flag guard error for ${flagKey}:`, error);
      // On error, deny access by default
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Create a GraphQL directive for feature flag protection
 */
export function createFlagDirective(service: FeatureFlagService) {
  return {
    name: 'featureFlag',
    description: 'Protects a field or type with a feature flag',
    locations: ['FIELD_DEFINITION', 'OBJECT'],
    args: {
      key: 'String!',
      defaultValue: 'Boolean',
    },
    resolve: async (
      next: any,
      source: any,
      args: any,
      context: any,
      info: any,
    ) => {
      const flagKey = args.key;
      const defaultValue = args.defaultValue ?? false;

      // Build flag context from GraphQL context
      const flagContext: Partial<FlagContext> = {
        userId: context.user?.id,
        userEmail: context.user?.email,
        userRole: context.user?.role,
        tenantId: context.tenantId,
      };

      const isEnabled = await service.getBooleanFlag(
        flagKey,
        defaultValue,
        flagContext,
      );

      if (!isEnabled) {
        throw new Error(`Feature '${flagKey}' is not available`);
      }

      return next(source, args, context, info);
    },
  };
}

/**
 * Middleware to expose feature flags to client
 */
export function exposeFeatureFlagsMiddleware(
  service: FeatureFlagService,
  options: {
    /** Endpoint path */
    path?: string;
    /** Context builder */
    contextBuilder?: (req: Request) => Partial<FlagContext>;
  } = {},
): (req: Request, res: Response) => Promise<void> {
  const { path = '/api/feature-flags', contextBuilder } = options;

  return async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.path !== path) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const context = buildContext(req, contextBuilder);
      const flags = await service.getAllFlags(context);

      res.json({
        flags,
        context: {
          userId: context.userId,
          tenantId: context.tenantId,
          environment: context.environment,
        },
      });
    } catch (error) {
      console.error('Error exposing feature flags:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
