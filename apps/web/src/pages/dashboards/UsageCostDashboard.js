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
exports.default = UsageCostDashboard;
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const lucide_react_1 = require("lucide-react");
const TenantContext_1 = require("@/contexts/TenantContext");
const usage_1 = require("@/lib/api/usage");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const EmptyState_1 = require("@/components/ui/EmptyState");
const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
}).format(value);
const formatNumber = (value) => new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
}).format(value);
const toIsoDate = (dateValue, endOfDay = false) => new Date(`${dateValue}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`).toISOString();
function UsageCostDashboard() {
    const { currentTenant } = (0, TenantContext_1.useTenant)();
    const [usageData, setUsageData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [fromDate, setFromDate] = (0, react_1.useState)(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [toDate, setToDate] = (0, react_1.useState)(() => new Date().toISOString().slice(0, 10));
    (0, react_1.useEffect)(() => {
        const loadUsage = async () => {
            if (!currentTenant?.id) {
                return;
            }
            setLoading(true);
            setErrorMessage(null);
            try {
                const response = await (0, usage_1.fetchTenantUsageRollups)(currentTenant.id, {
                    from: toIsoDate(fromDate),
                    to: toIsoDate(toDate, true),
                });
                setUsageData(response);
            }
            catch (error) {
                setErrorMessage(error?.message || 'Failed to load usage');
            }
            finally {
                setLoading(false);
            }
        };
        void loadUsage();
    }, [currentTenant?.id, fromDate, toDate]);
    const usageTotals = (0, react_1.useMemo)(() => {
        if (!usageData?.rollups) {
            return [];
        }
        const totals = new Map();
        usageData.rollups.forEach(rollup => {
            const entry = totals.get(rollup.dimension) ?? {
                total: 0,
                unit: rollup.unit,
            };
            entry.total += rollup.totalQuantity;
            totals.set(rollup.dimension, entry);
        });
        return Array.from(totals.entries()).map(([dimension, values]) => ({
            dimension,
            total: values.total,
            unit: values.unit,
        }));
    }, [usageData]);
    const costSeries = (0, react_1.useMemo)(() => {
        if (!usageData?.rollups) {
            return [];
        }
        const totals = new Map();
        usageData.rollups.forEach(rollup => {
            const date = new Date(rollup.periodStart);
            const label = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
            const entry = totals.get(label) ?? { cost: 0, date };
            entry.cost += rollup.estimatedCost ?? 0;
            totals.set(label, entry);
        });
        return Array.from(totals.entries())
            .map(([label, values]) => ({
            label,
            cost: values.cost,
            date: values.date,
        }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [usageData]);
    const totalCost = usageData?.totalEstimatedCost ??
        usageData?.rollups?.reduce((sum, rollup) => sum + (rollup.estimatedCost ?? 0), 0) ??
        0;
    const handleExport = (format) => {
        if (!currentTenant?.id) {
            return;
        }
        const url = (0, usage_1.buildUsageExportUrl)(currentTenant.id, format, {
            from: toIsoDate(fromDate),
            to: toIsoDate(toDate, true),
        });
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (<div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Usage & Cost Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track tenant usage rollups and estimated spend.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="fromDate" className="text-muted-foreground">
              From
            </label>
            <input id="fromDate" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1"/>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="toDate" className="text-muted-foreground">
              To
            </label>
            <input id="toDate" type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="rounded-md border border-input bg-background px-2 py-1"/>
          </div>
          <Button_1.Button variant="secondary" onClick={() => handleExport('csv')}>
            <lucide_react_1.Download className="mr-2 h-4 w-4"/> Export CSV
          </Button_1.Button>
          <Button_1.Button variant="secondary" onClick={() => handleExport('json')}>
            <lucide_react_1.Download className="mr-2 h-4 w-4"/> Export JSON
          </Button_1.Button>
        </div>
      </div>

      {errorMessage && (<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>)}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Total Estimated Cost</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-3xl font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </p>
            <p className="text-sm text-muted-foreground">
              {usageData?.window
            ? `${usageData.window.from.slice(0, 10)} → ${usageData.window.to.slice(0, 10)}`
            : 'Select a date range'}
            </p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Rollups</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-3xl font-semibold text-gray-900">
              {usageData?.rollups?.length ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">
              Usage summaries returned by the API
            </p>
          </Card_1.CardContent>
        </Card_1.Card>
        <Card_1.Card>
          <Card_1.CardHeader>
            <Card_1.CardTitle>Tenant</Card_1.CardTitle>
          </Card_1.CardHeader>
          <Card_1.CardContent>
            <p className="text-xl font-semibold text-gray-900">
              {currentTenant?.name ?? 'Unknown tenant'}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {currentTenant?.id ?? '--'}
            </p>
          </Card_1.CardContent>
        </Card_1.Card>
      </div>

      {loading ? (<div className="text-sm text-muted-foreground">Loading usage data…</div>) : usageTotals.length === 0 ? (<EmptyState_1.EmptyState title="No usage data available" description="Usage rollups will appear once metering is enabled." icon="file"/>) : (<div className="grid gap-6 lg:grid-cols-2">
          <Card_1.Card>
            <Card_1.CardHeader>
              <Card_1.CardTitle>Usage by Dimension</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="h-80">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={usageTotals}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="dimension"/>
                  <recharts_1.YAxis />
                  <recharts_1.Tooltip formatter={(value, _name, props) => [
                `${formatNumber(value)} ${props?.payload?.unit || ''}`,
                'Total',
            ]}/>
                  <recharts_1.Bar dataKey="total" fill="#2563EB"/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>
            </Card_1.CardContent>
          </Card_1.Card>
          <Card_1.Card>
            <Card_1.CardHeader>
              <Card_1.CardTitle>Estimated Cost Trend</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent className="h-80">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={costSeries}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                  <recharts_1.XAxis dataKey="label"/>
                  <recharts_1.YAxis tickFormatter={value => `$${value}`}/>
                  <recharts_1.Tooltip formatter={(value) => formatCurrency(value)}/>
                  <recharts_1.Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </Card_1.CardContent>
          </Card_1.Card>
        </div>)}
    </div>);
}
