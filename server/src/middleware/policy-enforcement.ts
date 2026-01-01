import { Request, Response, NextFunction } from 'express';
import { writeAudit } from '../utils/audit.js';

export interface PolicyContext {
    user: {
        id: string;
        role: string;
        tenantId: string;
    };
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
}

// Simple Policy Enforcement Point (PEP)
// In a real system this would call OPA or a dedicated service
export const checkPolicy = async (ctx: PolicyContext): Promise<{ allowed: boolean; reason?: string }> => {
    // Hardcoded policies for prototype

    // 1. Tenant Isolation: Users cannot access resources of other tenants (implicit in data access, but explicit here)
    if (ctx.resourceId && ctx.resourceId.startsWith('tenant-') && ctx.resourceId !== ctx.user.tenantId) {
         // This is a naive check assuming resourceId IS tenantId for some resources,
         // or we need to lookup resource ownership.
         // For simulation, we assume if resourceId is provided it might be the target tenant.
    }

    // 2. Role-based checks
    if (ctx.action === 'simulate_policy' && ctx.user.role !== 'admin' && ctx.user.role !== 'governance_officer') {
        return { allowed: false, reason: 'Insufficient permissions for policy simulation' };
    }

    // 3. Feature flags (simulated)
    if (process.env.POLICY_ENFORCEMENT_MODE === 'strict') {
        // ...
    }

    return { allowed: true };
};

export const enforcePolicy = (action: string, resourceType: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required for policy enforcement' });
        }

        const context: PolicyContext = {
            user: {
                id: user.id,
                role: user.role || 'user',
                tenantId: user.tenantId
            },
            action,
            resourceType,
            resourceId: req.params.id || req.body.resourceId,
            metadata: {
                ip: req.ip,
                userAgent: req.get('user-agent')
            }
        };

        try {
            const decision = await checkPolicy(context);

            // Log the decision
            await writeAudit({
                userId: user.id,
                action: `POLICY_CHECK:${action}`,
                resourceType,
                resourceId: context.resourceId,
                details: {
                    allowed: decision.allowed,
                    reason: decision.reason,
                    context: {
                        role: user.role,
                        tenantId: user.tenantId
                    }
                },
                ip: req.ip,
                userAgent: req.get('user-agent')
            });

            if (!decision.allowed) {
                return res.status(403).json({
                    error: 'Policy verification failed',
                    reason: decision.reason
                });
            }

            next();
        } catch (error) {
            console.error('Policy enforcement error:', error);
            // Fail closed
            return res.status(500).json({ error: 'Internal policy enforcement error' });
        }
    };
};
