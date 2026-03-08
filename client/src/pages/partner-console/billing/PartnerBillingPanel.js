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
exports.PartnerBillingPanel = PartnerBillingPanel;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
function PartnerBillingPanel({ tenantId }) {
    const defaultStart = (0, react_1.useMemo)(() => {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
            .toISOString()
            .slice(0, 10);
    }, []);
    const [start, setStart] = (0, react_1.useState)(defaultStart);
    const [end, setEnd] = (0, react_1.useState)('');
    const [message, setMessage] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const downloadReport = async (format) => {
        setMessage('');
        setLoading(true);
        try {
            const params = new URLSearchParams({
                format,
            });
            if (start)
                params.append('start', start);
            if (end)
                params.append('end', end);
            const response = await fetch(`/api/tenants/${tenantId}/billing/report?${params.toString()}`);
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.error || 'Failed to download report');
            }
            if (format === 'csv') {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `tenant-${tenantId}-billing.csv`;
                link.click();
                window.URL.revokeObjectURL(url);
                setMessage('CSV export downloaded');
                return;
            }
            const json = await response.json();
            const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `tenant-${tenantId}-billing.json`;
            link.click();
            window.URL.revokeObjectURL(url);
            setMessage('JSON export downloaded');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }
        catch (error) {
            setMessage(error.message);
        }
        finally {
            setLoading(false);
        }
    };
    return (<material_1.Card variant="outlined">
      <material_1.CardHeader title="Billing Exports" subheader={`Tenant: ${tenantId}`}/>
      <material_1.CardContent>
        <material_1.Typography variant="body2" color="textSecondary" gutterBottom>
          Download invoice-ready usage and cost reports with meter-level and cost attribution
          coverage.
        </material_1.Typography>
        <material_1.Stack spacing={2} mt={2}>
          <material_1.TextField label="Period start (ISO date)" value={start} type="date" onChange={(e) => setStart(e.target.value)} inputProps={{ 'data-testid': 'billing-start' }}/>
          <material_1.TextField label="Period end (optional, ISO date)" value={end} type="date" onChange={(e) => setEnd(e.target.value)} inputProps={{ 'data-testid': 'billing-end' }}/>
          {message && (<material_1.Alert severity={message.includes('downloaded') ? 'success' : 'error'}>
              {message}
            </material_1.Alert>)}
        </material_1.Stack>
      </material_1.CardContent>
      <material_1.CardActions>
        <material_1.Button variant="contained" onClick={() => downloadReport('json')} disabled={loading} data-testid="download-billing-json">
          {loading ? <material_1.CircularProgress size={18}/> : 'Download JSON'}
        </material_1.Button>
        <material_1.Button variant="outlined" onClick={() => downloadReport('csv')} disabled={loading} data-testid="download-billing-csv">
          {loading ? <material_1.CircularProgress size={18}/> : 'Download CSV'}
        </material_1.Button>
      </material_1.CardActions>
    </material_1.Card>);
}
