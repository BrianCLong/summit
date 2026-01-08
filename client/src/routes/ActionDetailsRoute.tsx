import React from "react";
import { useParams } from "react-router-dom";
import { AuthorizationGate } from "../auth/withAuthorization";
import ActionSafetyBanner from "../components/ActionSafetyBanner";
import { useActionSafetyStatus } from "../hooks/useActionSafetyStatus";

const ActionDetailsContent = ({ actionId, tenantId }: { actionId: string; tenantId?: string }) => {
  const { status, loading, error } = useActionSafetyStatus(actionId, tenantId);

  if (error) {
    return (
      <div className="p-6" role="alert">
        <h1 className="text-lg font-semibold">Failed to load action</h1>
        <pre className="mt-2 text-sm whitespace-pre-wrap">{String(error.message)}</pre>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {loading && <div>Loading action…</div>}
      {status && (
        <ActionSafetyBanner
          status={status.status}
          reason={status.reason}
          appealUrl={status.appealUrl}
        />
      )}
      <div className="text-sm text-gray-500">Tenant scope: {tenantId || "unscoped"}</div>
      <div id="action-details" />
    </div>
  );
};

export default function ActionDetailsRoute() {
  const { actionId } = useParams<{ actionId: string }>();
  const storedTenantId =
    typeof localStorage !== "undefined" ? localStorage.getItem("tenantId") || undefined : undefined;

  if (!actionId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">No action selected</h1>
        <p className="opacity-75">The URL must include /actions/:actionId</p>
      </div>
    );
  }

  return (
    <AuthorizationGate
      action="actions:read"
      tenantId={storedTenantId}
      fallback={
        <div className="p-6" role="alert">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="opacity-75">
            You do not have permission to view this action in the current tenant.
          </p>
        </div>
      }
    >
      <ActionDetailsContent actionId={actionId} tenantId={storedTenantId} />
    </AuthorizationGate>
  );
}
