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
exports.useTenant = useTenant;
exports.TenantProvider = TenantProvider;
// =============================================
// Tenant Context for Multi-Tenant Support
// =============================================
const react_1 = __importStar(require("react"));
const TenantContext = (0, react_1.createContext)(undefined);
function useTenant() {
    const context = (0, react_1.useContext)(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within TenantProvider');
    }
    return context;
}
function TenantProvider({ children }) {
    const [currentTenant, setCurrentTenant] = (0, react_1.useState)(null);
    const [environment, setEnvironment] = (0, react_1.useState)('dev');
    const [availableTenants] = (0, react_1.useState)([
        {
            id: 'default',
            name: 'Default',
            environment: 'dev',
            permissions: [
                'runs.view',
                'runs.create',
                'runbooks.view',
                'runbooks.edit',
                'budgets.view',
            ],
            budgetCap: 1000,
            region: 'us-west-2',
        },
        {
            id: 'production',
            name: 'Production',
            environment: 'prod',
            permissions: ['runs.view', 'runs.create', 'runbooks.view', 'admin.all'],
            budgetCap: 10000,
            region: 'us-east-1',
        },
        {
            id: 'staging',
            name: 'Staging',
            environment: 'staging',
            permissions: [
                'runs.view',
                'runs.create',
                'runbooks.view',
                'runbooks.edit',
            ],
            budgetCap: 2000,
            region: 'us-west-2',
        },
    ]);
    // Initialize with default tenant
    (0, react_1.useEffect)(() => {
        if (!currentTenant && availableTenants.length > 0) {
            setCurrentTenant(availableTenants[0]);
        }
    }, [availableTenants, currentTenant]);
    const switchTenant = (tenantId) => {
        const tenant = availableTenants.find(t => t.id === tenantId);
        if (tenant) {
            setCurrentTenant(tenant);
            setEnvironment(tenant.environment);
        }
    };
    const hasPermission = (permission) => {
        if (!currentTenant) {
            return false;
        }
        return (currentTenant.permissions.includes(permission) ||
            currentTenant.permissions.includes('admin.all'));
    };
    return (<TenantContext.Provider value={{
            currentTenant,
            availableTenants,
            switchTenant,
            hasPermission,
            environment,
            setEnvironment,
        }}>
      {children}
    </TenantContext.Provider>);
}
