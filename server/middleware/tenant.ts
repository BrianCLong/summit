import { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/connect.js';

interface TenantRequest extends Request {
  tenant?: any;
  db?: any;
}

export async function loadTenant(req: TenantRequest, res: Response, next: NextFunction) {
  const tenantId = String(req.headers['x-tenant-id'] || '');
  
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_header_required' });
  }
  
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    const result = await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    
    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'tenant_not_found' });
    }
    
    req.tenant = result.rows[0];
    req.db = client;
    
    // Attach cleanup to response end
    res.on('finish', () => {
      if (client) {
        client.release();
      }
    });
    
    next();
  } catch (error) {
    console.error('Failed to load tenant:', error);
    return res.status(500).json({ error: 'tenant_load_failed' });
  }
}

export function requirePlan(requiredPlan: string) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({ error: 'tenant_required' });
    }
    
    const planHierarchy = ['starter', 'pro', 'enterprise'];
    const currentPlanIndex = planHierarchy.indexOf(req.tenant.plan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    
    if (currentPlanIndex < requiredPlanIndex) {
      return res.status(402).json({ 
        error: 'plan_upgrade_required',
        current_plan: req.tenant.plan,
        required_plan: requiredPlan
      });
    }
    
    next();
  };
}