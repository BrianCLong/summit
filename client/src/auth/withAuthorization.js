"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthorization = useAuthorization;
exports.AuthorizationGate = AuthorizationGate;
exports.withAuthorization = withAuthorization;
const react_1 = __importStar(require("react"));
const AuthContext_jsx_1 = require("../context/AuthContext.jsx");
const capabilities_1 = require("../utils/capabilities");
const normalizeAction = (action) => {
    if (!action)
        return null;
    const normalized = (0, capabilities_1.normalizePermission)(action);
    if (normalized)
        return normalized;
    return action.toLowerCase();
};
const unique = (values) => Array.from(new Set(values.filter(Boolean)));
const resolveTenantScopes = (user, preferredTenant) => {
    const explicitScopes = unique([
        ...(user?.tenants || []),
        ...(user?.attributes?.tenants || []),
        user?.tenantId,
    ]);
    if (explicitScopes.length > 0) {
        return explicitScopes;
    }
    const storedTenant = typeof localStorage !== 'undefined'
        ? localStorage.getItem('tenantId') || undefined
        : undefined;
    if (preferredTenant)
        return [preferredTenant];
    if (storedTenant)
        return [storedTenant];
    return ['*'];
};
const resolveAllowedActions = (user) => {
    if (!user)
        return [];
    if (user.role?.toUpperCase() === 'ADMIN')
        return ['*'];
    const fromUser = (user.actionGrants || user.permissions || [])
        .map((action) => normalizeAction(action))
        .filter(Boolean);
    const fromRole = (0, capabilities_1.permissionsForRole)(user.role).map((action) => normalizeAction(action));
    return unique([...fromUser, ...fromRole]);
};
// eslint-disable-next-line react-refresh/only-export-components
function useAuthorization(preferredTenant) {
    const { user, loading } = (0, AuthContext_jsx_1.useAuth)();
    const tenantScopes = (0, react_1.useMemo)(() => resolveTenantScopes(user, preferredTenant), [user, preferredTenant]);
    const allowedActions = (0, react_1.useMemo)(() => resolveAllowedActions(user), [user]);
    const canAccess = (0, react_1.useCallback)(({ action, tenantId }) => {
        if (!user || !action)
            return false;
        const normalizedAction = normalizeAction(action);
        if (!normalizedAction)
            return false;
        const actionAllowed = allowedActions.includes('*') || allowedActions.includes(normalizedAction);
        if (!actionAllowed)
            return false;
        if (!tenantId || tenantScopes.includes('*'))
            return true;
        return tenantScopes.some((tenant) => tenant.toLowerCase() === tenantId.toLowerCase());
    }, [allowedActions, tenantScopes, user]);
    const filterByAccess = (0, react_1.useCallback)((items, builder) => items.filter((item) => canAccess(builder(item))), [canAccess]);
    const resolvedTenant = preferredTenant || tenantScopes.find((scope) => scope !== '*');
    return {
        allowedActions,
        canAccess,
        filterByAccess,
        loading,
        tenant: resolvedTenant,
        tenantScopes,
    };
}
const DefaultAccessDenied = ({ action, tenantId, }) => (<div role="alert" aria-label="access-denied">
    Access denied for <strong>{action}</strong>
    {tenantId ? ` in tenant ${tenantId}` : ''}.
  </div>);
function AuthorizationGate({ action, tenantId, fallback, loadingFallback, children, }) {
    const { canAccess, loading, tenant } = useAuthorization(tenantId);
    const scopedTenant = tenantId || tenant;
    if (loading) {
        return (<>{loadingFallback || <div role="status">Checking permissions…</div>}</>);
    }
    if (!canAccess({ action, tenantId: scopedTenant })) {
        return (<>
        {fallback || (<DefaultAccessDenied action={action} tenantId={scopedTenant}/>)}
      </>);
    }
    return <>{children}</>;
}
// eslint-disable-next-line react-refresh/only-export-components
function withAuthorization(options) {
    return (Component) => 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function GuardedComponent(props) {
        const resolvedTenant = typeof options.tenantId === 'function'
            ? options.tenantId(props)
            : options.tenantId;
        return (<AuthorizationGate action={options.action} tenantId={resolvedTenant} fallback={options.fallback} loadingFallback={options.loadingFallback}>
          <Component {...props}/>
        </AuthorizationGate>);
    };
}
