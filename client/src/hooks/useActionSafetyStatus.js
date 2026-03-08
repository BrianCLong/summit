"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useActionSafetyStatus = void 0;
const react_1 = require("react");
const withAuthorization_1 = require("../auth/withAuthorization");
const useActionSafetyStatus = (actionId, tenantId) => {
    const [status, setStatus] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const { canAccess, loading: authorizationLoading, tenant: resolvedTenant, } = (0, withAuthorization_1.useAuthorization)(tenantId);
    const scopedTenant = tenantId || resolvedTenant;
    (0, react_1.useEffect)(() => {
        if (authorizationLoading)
            return;
        if (!actionId) {
            setError(new Error('actionId is required'));
            setLoading(false);
            return;
        }
        const authorized = canAccess({
            action: 'actions:read',
            tenantId: scopedTenant,
        });
        if (!authorized) {
            setError(new Error(`Access denied for action "${actionId}"${scopedTenant ? ` in tenant ${scopedTenant}` : ''}`));
            setStatus(null);
            setLoading(false);
            return;
        }
        // Simulate an API call
        setLoading(true);
        setError(null);
        const timer = setTimeout(() => {
            if (actionId === '123') {
                setStatus({
                    status: 'Safe',
                    reason: 'No threats detected',
                    appealUrl: undefined,
                });
            }
            else if (actionId === '456') {
                setStatus({
                    status: 'Unsafe',
                    reason: 'Malicious activity detected',
                    appealUrl: 'https://example.com/appeal',
                });
            }
            else {
                setStatus({
                    status: 'Safe',
                    reason: `No specific threats detected for ${actionId}${scopedTenant ? ` in tenant ${scopedTenant}` : ''}`,
                });
            }
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [actionId, authorizationLoading, canAccess, scopedTenant]);
    return { status, loading, error, tenant: scopedTenant };
};
exports.useActionSafetyStatus = useActionSafetyStatus;
