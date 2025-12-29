import { Request, RequestHandler, Response } from 'express';
import { securityLogger } from '../observability/securityLogger.js';
import { resolveTenantId } from './tenant.js';

export type SurfaceCategory = 'public' | 'admin' | 'internal';

export interface SurfaceDescriptor {
  method: string;
  path: string;
  category: SurfaceCategory;
  description?: string;
}

interface SurfaceSnapshot {
  surfaces: SurfaceDescriptor[];
  summary: Record<SurfaceCategory, number>;
  total: number;
}

class SurfaceRegistry {
  private readonly surfaces = new Map<string, SurfaceDescriptor>();

  register(surface: SurfaceDescriptor): void {
    const key = `${surface.method.toUpperCase()}:${surface.path}`;
    this.surfaces.set(key, {
      ...surface,
      method: surface.method.toUpperCase(),
    });
  }

  snapshot(): SurfaceSnapshot {
    const surfaces = Array.from(this.surfaces.values());
    const summary: Record<SurfaceCategory, number> = {
      public: 0,
      admin: 0,
      internal: 0,
    };

    for (const surface of surfaces) {
      summary[surface.category] += 1;
    }

    return {
      surfaces,
      summary,
      total: surfaces.length,
    };
  }

  handler(adminToken?: string): RequestHandler {
    return (req: Request, res: Response) => {
      if (adminToken) {
        const providedToken = req.headers['x-surface-token'];
        if (providedToken !== adminToken) {
          securityLogger.logEvent('surface_inventory_access', {
            level: 'warn',
            tenant: resolveTenantId(req),
            path: req.originalUrl,
            message: 'Denied surface inventory access',
          });
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const snapshot = this.snapshot();
      securityLogger.logEvent('surface_inventory_access', {
        level: 'info',
        tenant: resolveTenantId(req),
        message: 'Surface inventory retrieved',
        total: snapshot.total,
      });
      return res.json(snapshot);
    };
  }
}

export const surfaceRegistry = new SurfaceRegistry();

