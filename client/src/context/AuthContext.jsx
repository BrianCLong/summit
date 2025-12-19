import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { CURRENT_USER } from '../graphql/user.gql.js';
import {
  hasCapability,
  normalizePermission,
  permissionsForRole,
} from '../utils/capabilities';

const AuthContext = createContext();

function normalizeClaimAction(action) {
  return normalizePermission(action) || action;
}

function deriveClaims(user) {
  const tenant = user?.tenantId || user?.defaultTenantId || user?.tenant || 'default';
  const claimsFromUser = Array.isArray(user?.claims) ? user.claims : [];
  const mappedClaims = claimsFromUser
    .map((claim) => {
      const action = normalizeClaimAction(
        claim?.action || claim?.permission || claim?.capability,
      );
      if (!action) return null;
      return {
        action,
        tenant: claim?.tenant || claim?.tenantId || tenant,
      };
    })
    .filter(Boolean);

  const permissionBackfill =
    user?.permissions && user.permissions.length > 0
      ? user.permissions
      : permissionsForRole(user?.role);

  const mappedPermissions = permissionBackfill
    .map((permission) => {
      const action = normalizeClaimAction(permission);
      if (!action) return null;
      return { action, tenant };
    })
    .filter(Boolean);

  return [...mappedClaims, ...mappedPermissions];
}

function matchesClaim(claim, action, tenant) {
  const normalizedAction = normalizeClaimAction(action);
  if (!normalizedAction) return false;

  const tenantMatches =
    !claim.tenant || !tenant || claim.tenant === '*' || claim.tenant === tenant;
  const actionMatches =
    claim.action === '*' ||
    claim.action === normalizedAction ||
    normalizeClaimAction(claim.action) === normalizedAction;

  return tenantMatches && actionMatches;
}

export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER, {
    fetchPolicy: 'cache-first',
  });
  const user = data?.me;

  const hasRole = useCallback((role) => user?.role === role, [user]);

  const hasPermission = useCallback(
    (perm) => hasCapability(user, perm),
    [user]
  );

  const claims = useMemo(() => deriveClaims(user), [user]);

  const canAccess = useCallback(
    (action, tenant) => {
      if (!user) return false;
      if (user.role?.toUpperCase() === 'ADMIN') return true;
      if (!action) return true;
      if (hasCapability(user, action)) return true;
      return claims.some((claim) => matchesClaim(claim, action, tenant || user?.tenantId));
    },
    [claims, user],
  );

  const tenantId = useMemo(
    () => user?.tenantId || user?.defaultTenantId || user?.tenant || 'default',
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      hasRole,
      hasPermission,
      claims,
      canAccess,
      tenantId,
    }),
    [user, loading, hasRole, hasPermission, claims, canAccess, tenantId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
