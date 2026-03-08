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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminPage;
const react_1 = __importStar(require("react"));
const EmptyState_1 = require("@/components/ui/EmptyState");
const Button_1 = require("@/components/ui/Button");
const lucide_react_1 = require("lucide-react");
const metrics_1 = require("@/telemetry/metrics");
const activation_1 = require("@/lib/activation");
const ContextualNudge_1 = require("@/components/activation/ContextualNudge");
const MergeRollbackPanel_1 = __importDefault(require("@/components/admin/MergeRollbackPanel"));
function AdminPage() {
    const [demoTenant, setDemoTenant] = (0, react_1.useState)(null);
    const [demoStatus, setDemoStatus] = (0, react_1.useState)(null);
    const [demoLoading, setDemoLoading] = (0, react_1.useState)(false);
    const [statusLoading, setStatusLoading] = (0, react_1.useState)(false);
    const [demoError, setDemoError] = (0, react_1.useState)(null);
    const handleCreateTenant = () => {
        (0, metrics_1.trackGoldenPathStep)('tenant_created');
        (0, activation_1.markStepComplete)('tenant_created');
        // TODO: Add toast notification when component is implemented
        console.log('Tenant created successfully');
    };
    const fetchEvidenceStatus = async (tenantId) => {
        setStatusLoading(true);
        try {
            const response = await fetch(`/api/evidence/exports/status?tenantId=${tenantId}`);
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to load export status');
            }
            setDemoStatus(payload.data);
        }
        finally {
            setStatusLoading(false);
        }
    };
    const handleCreateDemoTenant = async () => {
        setDemoLoading(true);
        setDemoError(null);
        try {
            const response = await fetch('/api/tenants/demo', { method: 'POST' });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to create demo tenant');
            }
            const data = payload.data;
            setDemoTenant(data);
            await fetchEvidenceStatus(data.tenantId);
        }
        catch (error) {
            setDemoError(error instanceof Error
                ? error.message
                : 'Failed to create demo tenant');
        }
        finally {
            setDemoLoading(false);
        }
    };
    const handleRefreshStatus = async () => {
        if (!demoTenant)
            return;
        await fetchEvidenceStatus(demoTenant.tenantId);
    };
    return (<div className="p-6">
      <ContextualNudge_1.ContextualNudge stepId="tenant_created" title="Setup Organization" description="Create your first tenant organization to get started." actionLabel="Create Tenant" onAction={handleCreateTenant}/>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <Button_1.Button onClick={handleCreateTenant}>
          <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
          Create Tenant
        </Button_1.Button>
      </div>
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Demo Tenant Bootstrap
            </h2>
            <p className="text-sm text-gray-600">
              Spin up a demo tenant with seeded workflows and evidence export
              readiness.
            </p>
          </div>
          <Button_1.Button onClick={handleCreateDemoTenant} disabled={demoLoading}>
            {demoLoading ? 'Creating…' : 'Create Demo Tenant'}
          </Button_1.Button>
        </div>
        {demoError ? (<p className="mt-4 text-sm text-red-600">{demoError}</p>) : null}
        {demoTenant ? (<div className="mt-6 space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">Tenant:</span>{' '}
              {demoTenant.slug} ({demoTenant.tenantId})
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                Seeded workflows:
              </span>{' '}
              {demoTenant.workflows.length}
            </div>
            <div>
              <span className="font-semibold text-gray-900">
                Evidence seed window:
              </span>{' '}
              {new Date(demoTenant.evidenceSeed.windowStart).toLocaleString()} →{' '}
              {new Date(demoTenant.evidenceSeed.windowEnd).toLocaleString()}
            </div>
          </div>) : null}
        <div className="mt-6 rounded-md border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              Evidence Export Status
            </h3>
            <Button_1.Button variant="secondary" onClick={handleRefreshStatus} disabled={!demoTenant || statusLoading}>
              {statusLoading ? 'Refreshing…' : 'Refresh'}
            </Button_1.Button>
          </div>
          {demoStatus ? (<div className="mt-3 grid gap-2 text-sm text-gray-700">
              <div>
                <span className="font-semibold text-gray-900">Ready:</span>{' '}
                {demoStatus.ready ? 'Yes' : 'Not yet'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Policy bundle:
                </span>{' '}
                {demoStatus.policyBundleReady ? 'Loaded' : 'Missing'}
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Event count:
                </span>{' '}
                {demoStatus.eventCount}
              </div>
              <div>
                <span className="font-semibold text-gray-900">
                  Last event:
                </span>{' '}
                {demoStatus.lastEventAt
                ? new Date(demoStatus.lastEventAt).toLocaleString()
                : 'No events yet'}
              </div>
            </div>) : (<p className="mt-3 text-sm text-gray-600">
              Create a demo tenant to view export readiness.
            </p>)}
        </div>
      </div>
      <EmptyState_1.EmptyState title="Admin page under construction" description="This will show administrative controls and user management" icon="plus"/>
      <div className="mt-8">
        <MergeRollbackPanel_1.default />
      </div>
    </div>);
}
