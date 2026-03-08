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
exports.default = HelpPage;
const react_1 = __importStar(require("react"));
const EmptyState_1 = require("@/components/ui/EmptyState");
const Button_1 = require("@/components/ui/Button");
const Card_1 = require("@/components/ui/Card");
const TenantContext_1 = require("@/contexts/TenantContext");
function HelpPage() {
    const { currentTenant } = (0, TenantContext_1.useTenant)();
    const [exportStatus, setExportStatus] = (0, react_1.useState)('idle');
    const [exportMessage, setExportMessage] = (0, react_1.useState)('');
    const [copyMessage, setCopyMessage] = (0, react_1.useState)('');
    const tenantId = currentTenant?.id || 'tenant-id';
    const impersonationCurl = (0, react_1.useMemo)(() => `curl -X POST /api/v1/support/impersonation/start \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"targetUserId\":\"user-id\",\"targetTenantId\":\"${tenantId}\",\"reason\":\"Support investigation\"}'`, [tenantId]);
    const handleExportBundle = async () => {
        if (!currentTenant) {
            setExportStatus('error');
            setExportMessage('Select a tenant to export a health bundle.');
            return;
        }
        setExportStatus('loading');
        setExportMessage('Generating tenant health bundle...');
        try {
            const response = await fetch('/api/v1/support/tenant-health-bundle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: currentTenant.id,
                    reason: 'Support panel health bundle export',
                }),
            });
            if (!response.ok) {
                throw new Error(`Export failed (${response.status})`);
            }
            const payload = await response.json();
            const blob = new Blob([JSON.stringify(payload, null, 2)], {
                type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `tenant-health-bundle-${currentTenant.id}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
            setExportStatus('success');
            setExportMessage('Tenant health bundle downloaded.');
        }
        catch (error) {
            setExportStatus('error');
            setExportMessage('Health bundle export failed. Verify feature flags and policy access.');
        }
    };
    const handleCopyCurl = async () => {
        try {
            await navigator.clipboard.writeText(impersonationCurl);
            setCopyMessage('Impersonation cURL copied to clipboard.');
        }
        catch (error) {
            setCopyMessage('Copy failed. Use the command displayed below.');
        }
    };
    return (<div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Help & Documentation</h1>
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Tenant health bundle export</Card_1.CardTitle>
            <Card_1.CardDescription>
              Export a redacted tenant health bundle for support and compliance
              review.
            </Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-sm text-muted-foreground">
              Tenant: <span className="font-medium">{tenantId}</span>
            </p>
            {exportMessage && (<p className="mt-2 text-sm text-muted-foreground">
                {exportMessage}
              </p>)}
          </Card_1.CardContent>
          <Card_1.CardFooter>
            <Button_1.Button onClick={handleExportBundle} disabled={exportStatus === 'loading'}>
              {exportStatus === 'loading' ? 'Preparing...' : 'Download bundle'}
            </Button_1.Button>
          </Card_1.CardFooter>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Support impersonation flow</Card_1.CardTitle>
            <Card_1.CardDescription>
              Start or stop policy-gated impersonation sessions for approved
              support operators.
            </Card_1.CardDescription>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <pre className="text-xs whitespace-pre-wrap rounded-md bg-slate-900 text-slate-100 p-3">
              {impersonationCurl}
            </pre>
            {copyMessage && (<p className="mt-2 text-sm text-muted-foreground">
                {copyMessage}
              </p>)}
          </Card_1.CardContent>
          <Card_1.CardFooter>
            <Button_1.Button variant="outline" onClick={handleCopyCurl}>
              Copy cURL
            </Button_1.Button>
          </Card_1.CardFooter>
        </Card_1.Card>
      </div>
      <EmptyState_1.EmptyState title="Help page under construction" description="This will show documentation and support resources" icon="plus"/>
    </div>);
}
