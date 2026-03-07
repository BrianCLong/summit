import { useEffect, useState } from "react";
import { useAuthorization } from "../auth/withAuthorization";

export const useActionSafetyStatus = (actionId: string, tenantId?: string) => {
  const [status, setStatus] = useState<{
    status: string;
    reason?: string;
    appealUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const {
    canAccess,
    loading: authorizationLoading,
    tenant: resolvedTenant,
  } = useAuthorization(tenantId);
  const scopedTenant = tenantId || resolvedTenant;

  useEffect(() => {
    if (authorizationLoading) return;

    if (!actionId) {
      setError(new Error("actionId is required"));
      setLoading(false);
      return;
    }

    const authorized = canAccess({
      action: "actions:read",
      tenantId: scopedTenant,
    });

    if (!authorized) {
      setError(
        new Error(
          `Access denied for action "${actionId}"${
            scopedTenant ? ` in tenant ${scopedTenant}` : ""
          }`
        )
      );
      setStatus(null);
      setLoading(false);
      return;
    }

    // Simulate an API call
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      if (actionId === "123") {
        setStatus({
          status: "Safe",
          reason: "No threats detected",
          appealUrl: undefined,
        });
      } else if (actionId === "456") {
        setStatus({
          status: "Unsafe",
          reason: "Malicious activity detected",
          appealUrl: "https://example.com/appeal",
        });
      } else {
        setStatus({
          status: "Safe",
          reason: `No specific threats detected for ${actionId}${
            scopedTenant ? ` in tenant ${scopedTenant}` : ""
          }`,
        });
      }
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [actionId, authorizationLoading, canAccess, scopedTenant]);

  return { status, loading, error, tenant: scopedTenant };
};
