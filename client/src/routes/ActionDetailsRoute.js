"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ActionDetailsRoute;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const withAuthorization_1 = require("../auth/withAuthorization");
const ActionSafetyBanner_1 = __importDefault(require("../components/ActionSafetyBanner"));
const useActionSafetyStatus_1 = require("../hooks/useActionSafetyStatus");
const ActionDetailsContent = ({ actionId, tenantId, }) => {
    const { status, loading, error } = (0, useActionSafetyStatus_1.useActionSafetyStatus)(actionId, tenantId);
    if (error) {
        return (<div className="p-6" role="alert">
        <h1 className="text-lg font-semibold">Failed to load action</h1>
        <pre className="mt-2 text-sm whitespace-pre-wrap">
          {String(error.message)}
        </pre>
      </div>);
    }
    return (<div className="p-6 space-y-4">
      {loading && <div>Loading action…</div>}
      {status && (<ActionSafetyBanner_1.default status={status.status} reason={status.reason} appealUrl={status.appealUrl}/>)}
      <div className="text-sm text-gray-500">
        Tenant scope: {tenantId || 'unscoped'}
      </div>
      <div id="action-details"/>
    </div>);
};
function ActionDetailsRoute() {
    const { actionId } = (0, react_router_dom_1.useParams)();
    const storedTenantId = typeof localStorage !== 'undefined'
        ? localStorage.getItem('tenantId') || undefined
        : undefined;
    if (!actionId) {
        return (<div className="p-6">
        <h1 className="text-lg font-semibold">No action selected</h1>
        <p className="opacity-75">The URL must include /actions/:actionId</p>
      </div>);
    }
    return (<withAuthorization_1.AuthorizationGate action="actions:read" tenantId={storedTenantId} fallback={<div className="p-6" role="alert">
          <h1 className="text-lg font-semibold">Access denied</h1>
          <p className="opacity-75">
            You do not have permission to view this action in the current
            tenant.
          </p>
        </div>}>
      <ActionDetailsContent actionId={actionId} tenantId={storedTenantId}/>
    </withAuthorization_1.AuthorizationGate>);
}
