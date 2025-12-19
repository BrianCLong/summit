import React, { ComponentType, PropsWithChildren } from 'react';
import { Alert, LinearProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import { normalizePermission } from '../utils/capabilities';

export interface AuthorizationOptions {
  actions?: string[];
  tenant?: string;
  fallback?: React.ReactNode;
}

interface Claim {
  action: string;
  tenant?: string;
}

function matchClaim(claim: Claim, action: string, tenant?: string) {
  const normalizedAction = normalizePermission(action) || action;
  const normalizedClaim = normalizePermission(claim.action) || claim.action;
  const tenantMatches =
    !claim.tenant || !tenant || claim.tenant === '*' || claim.tenant === tenant;
  const actionMatches =
    normalizedClaim === '*' ||
    normalizedClaim === normalizedAction ||
    claim.action === normalizedAction;

  return tenantMatches && actionMatches;
}

export function useAuthorization() {
  const { user, loading, claims = [], canAccess, tenantId } = useAuth();

  const getTenantForAction = (action?: string, requestedTenant?: string) => {
    if (!action) return requestedTenant || tenantId;
    if (requestedTenant && canAccess?.(action, requestedTenant)) {
      return requestedTenant;
    }
    const claimTenant =
      claims.find((claim: Claim) => matchClaim(claim, action, claim.tenant))
        ?.tenant || tenantId;
    return claimTenant || tenantId;
  };

  return {
    user,
    loading,
    claims,
    canAccess: canAccess || (() => false),
    tenantId,
    getTenantForAction,
  };
}

export function withAuthorization<P extends object>(
  options: AuthorizationOptions,
) {
  return (WrappedComponent: ComponentType<P>) => {
    return function AuthorizedComponent(props: PropsWithChildren<P>) {
      const { loading, canAccess, tenantId, claims } = useAuthorization();
      const scopedTenant = options.tenant || tenantId;
      const isAllowed =
        !options.actions ||
        options.actions.every((action) => canAccess(action, scopedTenant));

      if (loading) {
        return <LinearProgress data-testid="auth-loading" />;
      }

      if (!isAllowed) {
        return (
          options.fallback || (
            <Alert severity="error" data-testid="auth-denied">
              Access denied for this action in the current tenant scope.
              <br />
              {claims?.length
                ? 'Your active claims do not grant the required capability.'
                : 'No active claims were found on your session.'}
            </Alert>
          )
        );
      }

      return <WrappedComponent {...props} />;
    };
  };
}
