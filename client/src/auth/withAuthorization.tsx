import React, { ComponentType, PropsWithChildren, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { normalizePermission, permissionsForRole } from "../utils/capabilities";

interface AuthUser {
  role?: string;
  tenants?: string[];
  tenantId?: string;
  actionGrants?: string[];
  permissions?: string[];
  attributes?: {
    tenants?: string[];
  };
}

type AccessRequest = {
  action: string;
  tenantId?: string;
};

type WithAuthorizationOptions<P> = {
  action: string;
  tenantId?: string | ((props: P) => string | undefined);
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
};

const normalizeAction = (action?: string | null): string | null => {
  if (!action) return null;
  const normalized = normalizePermission(action);
  if (normalized) return normalized;
  return action.toLowerCase();
};

const unique = (values: Array<string | undefined | null>) =>
  Array.from(new Set(values.filter(Boolean) as string[]));

const resolveTenantScopes = (
  user: AuthUser | null | undefined,
  preferredTenant?: string
): string[] => {
  const explicitScopes = unique([
    ...(user?.tenants || []),
    ...(user?.attributes?.tenants || []),
    user?.tenantId,
  ]);

  if (explicitScopes.length > 0) {
    return explicitScopes;
  }

  const storedTenant =
    typeof localStorage !== "undefined" ? localStorage.getItem("tenantId") || undefined : undefined;

  if (preferredTenant) return [preferredTenant];
  if (storedTenant) return [storedTenant];

  return ["*"];
};

const resolveAllowedActions = (user: AuthUser | null | undefined): string[] => {
  if (!user) return [];
  if (user.role?.toUpperCase() === "ADMIN") return ["*"];

  const fromUser = (user.actionGrants || user.permissions || [])
    .map((action: string) => normalizeAction(action))
    .filter(Boolean) as string[];
  const fromRole = permissionsForRole(user.role).map((action) => normalizeAction(action));

  return unique([...fromUser, ...fromRole]);
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthorization(preferredTenant?: string) {
  const { user, loading } = useAuth();

  const tenantScopes = useMemo(
    () => resolveTenantScopes(user, preferredTenant),
    [user, preferredTenant]
  );

  const allowedActions = useMemo(() => resolveAllowedActions(user), [user]);

  const canAccess = useCallback(
    ({ action, tenantId }: AccessRequest) => {
      if (!user || !action) return false;

      const normalizedAction = normalizeAction(action);
      if (!normalizedAction) return false;

      const actionAllowed =
        allowedActions.includes("*") || allowedActions.includes(normalizedAction);

      if (!actionAllowed) return false;

      if (!tenantId || tenantScopes.includes("*")) return true;

      return tenantScopes.some((tenant) => tenant.toLowerCase() === tenantId.toLowerCase());
    },
    [allowedActions, tenantScopes, user]
  );

  const filterByAccess = useCallback(
    <T,>(items: T[], builder: (item: T) => AccessRequest): T[] =>
      items.filter((item) => canAccess(builder(item))),
    [canAccess]
  );

  const resolvedTenant = preferredTenant || tenantScopes.find((scope) => scope !== "*");

  return {
    allowedActions,
    canAccess,
    filterByAccess,
    loading,
    tenant: resolvedTenant,
    tenantScopes,
  };
}

const DefaultAccessDenied: React.FC<{ action: string; tenantId?: string }> = ({
  action,
  tenantId,
}) => (
  <div role="alert" aria-label="access-denied">
    Access denied for <strong>{action}</strong>
    {tenantId ? ` in tenant ${tenantId}` : ""}.
  </div>
);

export function AuthorizationGate({
  action,
  tenantId,
  fallback,
  loadingFallback,
  children,
}: PropsWithChildren<{
  action: string;
  tenantId?: string;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}>) {
  const { canAccess, loading, tenant } = useAuthorization(tenantId);
  const scopedTenant = tenantId || tenant;

  if (loading) {
    return <>{loadingFallback || <div role="status">Checking permissions…</div>}</>;
  }

  if (!canAccess({ action, tenantId: scopedTenant })) {
    return <>{fallback || <DefaultAccessDenied action={action} tenantId={scopedTenant} />}</>;
  }

  return <>{children}</>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function withAuthorization<P>(
  options: WithAuthorizationOptions<P>
): (component: ComponentType<P>) => ComponentType<P> {
  return (Component: ComponentType<P>) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function GuardedComponent(props: any) {
      const resolvedTenant =
        typeof options.tenantId === "function" ? options.tenantId(props) : options.tenantId;

      return (
        <AuthorizationGate
          action={options.action}
          tenantId={resolvedTenant}
          fallback={options.fallback}
          loadingFallback={options.loadingFallback}
        >
          <Component {...props} />
        </AuthorizationGate>
      );
    };
}
