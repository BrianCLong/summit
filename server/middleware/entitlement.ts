import { Request, Response, NextFunction } from 'express';

interface TenantRequest extends Request {
  tenant?: any;
}

// Simple OPA policy evaluation (in production, use @open-policy-agent/opa-wasm)
function evaluateEntitlement(plan: string, feature: string): boolean {
  const entitlements: Record<string, string[]> = {
    'starter': ['api_access', 'basic_search'],
    'pro': ['api_access', 'basic_search', 'advanced_export', 'collaboration'],
    'enterprise': ['api_access', 'basic_search', 'advanced_export', 'collaboration', 'batch_import', 'sso', 'audit_logs', 'custom_integrations']
  };
  
  const planFeatures = entitlements[plan] || entitlements['starter'];
  return planFeatures.includes(feature);
}

export function requireFeature(feature: string) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({ error: 'tenant_required' });
    }
    
    const hasAccess = evaluateEntitlement(req.tenant.plan, feature);
    
    if (!hasAccess) {
      return res.status(402).json({ 
        error: 'feature_not_in_plan',
        feature: feature,
        current_plan: req.tenant.plan,
        message: `Feature '${feature}' is not available in the '${req.tenant.plan}' plan.`
      });
    }
    
    next();
  };
}

// Middleware to check multiple features (OR logic)
export function requireAnyFeature(features: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({ error: 'tenant_required' });
    }
    
    const hasAccess = features.some(feature => 
      evaluateEntitlement(req.tenant.plan, feature)
    );
    
    if (!hasAccess) {
      return res.status(402).json({ 
        error: 'feature_not_in_plan',
        features: features,
        current_plan: req.tenant.plan,
        message: `None of the required features are available in the '${req.tenant.plan}' plan.`
      });
    }
    
    next();
  };
}

// Get all available features for a plan
export function getAvailableFeatures(plan: string): string[] {
  const entitlements: Record<string, string[]> = {
    'starter': ['api_access', 'basic_search'],
    'pro': ['api_access', 'basic_search', 'advanced_export', 'collaboration'],
    'enterprise': ['api_access', 'basic_search', 'advanced_export', 'collaboration', 'batch_import', 'sso', 'audit_logs', 'custom_integrations']
  };
  
  return entitlements[plan] || entitlements['starter'];
}