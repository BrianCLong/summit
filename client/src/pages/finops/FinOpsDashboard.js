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
exports.default = FinOpsDashboard;
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const icons_material_1 = require("@mui/icons-material");
const api_1 = require("../../services/api");
const bucketIconMap = {
    compute: <icons_material_1.TrendingUp color="primary"/>,
    storage: <icons_material_1.Storage color="secondary"/>,
    egress: <icons_material_1.CloudUpload color="info"/>,
    third_party: <icons_material_1.Assessment color="action"/>,
};
function formatUsd(value) {
    return `$${value.toFixed(2)}`;
}
function Sparkline({ points, color = '#1976d2', height = 40, }) {
    if (!points.length) {
        return <material_1.Box sx={{ height }}/>;
    }
    const max = Math.max(...points);
    const min = Math.min(...points);
    const width = Math.max(points.length * 14, 80);
    const range = Math.max(max - min, 1);
    const path = points
        .map((value, idx) => {
        const x = (idx / Math.max(points.length - 1, 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
        .join(' ');
    return (<svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <path d={path} fill="none" stroke={color} strokeWidth={2}/>
    </svg>);
}
function FinOpsDashboard() {
    const [windowDays, setWindowDays] = (0, react_1.useState)(30);
    const [overview, setOverview] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        setLoading(true);
        setError(null);
        api_1.FinOpsAPI.rollups(windowDays)
            .then((data) => {
            if (mounted)
                setOverview(data);
        })
            .catch((err) => {
            if (mounted)
                setError(err.message || 'Failed to load FinOps data');
        })
            .finally(() => {
            if (mounted)
                setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [windowDays]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const trendPoints = overview?.trend || [];
    const totalSparkline = (0, react_1.useMemo)(() => trendPoints.map((point) => point.totalCostUsd), [trendPoints]);
    return (<material_1.Box sx={{ p: 2 }}>
      <material_1.Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <material_1.Box>
          <material_1.Typography variant="h4" gutterBottom>
            FinOps Cost & Usage
          </material_1.Typography>
          <material_1.Typography variant="body1" color="text.secondary">
            Daily attribution by compute, storage, egress, and third-party usage
            with per-unit insights.
          </material_1.Typography>
        </material_1.Box>
        <material_1.Stack direction="row" spacing={1} alignItems="center">
          <material_1.Typography variant="body2" color="text.secondary">
            Window
          </material_1.Typography>
          <material_1.Select size="small" value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
            {[7, 14, 30, 60, 90].map((window) => (<material_1.MenuItem key={window} value={window}>
                Last {window} days
              </material_1.MenuItem>))}
          </material_1.Select>
        </material_1.Stack>
      </material_1.Stack>

      {loading && <material_1.LinearProgress sx={{ mb: 2 }}/>}
      {error && (<material_1.Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </material_1.Alert>)}

      <Grid_1.default container spacing={2}>
        <Grid_1.default xs={12} md={4}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Stack direction="row" justifyContent="space-between" spacing={2}>
                <material_1.Box>
                  <material_1.Typography variant="subtitle2" color="text.secondary">
                    Total Cost
                  </material_1.Typography>
                  <material_1.Typography variant="h5">
                    {formatUsd(overview?.totals.totalCostUsd || 0)}
                  </material_1.Typography>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Across {overview?.periodDays || windowDays} days
                  </material_1.Typography>
                </material_1.Box>
                <icons_material_1.Savings color="success"/>
              </material_1.Stack>
              <material_1.Box sx={{ mt: 2 }}>
                <Sparkline points={totalSparkline} color="#2e7d32"/>
              </material_1.Box>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        {(overview?.buckets || []).map((bucket) => (<Grid_1.default xs={12} md={2} key={bucket.key}>
            <material_1.Card>
              <material_1.CardContent>
                <material_1.Stack direction="row" alignItems="center" spacing={1}>
                  {bucketIconMap[bucket.key]}
                  <material_1.Typography variant="subtitle2" color="text.secondary">
                    {bucket.label}
                  </material_1.Typography>
                </material_1.Stack>
                <material_1.Typography variant="h6" sx={{ mt: 1 }}>
                  {formatUsd(bucket.costUsd)}
                </material_1.Typography>
                <material_1.Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <material_1.Chip label={`${bucket.allocationPct.toFixed(1)}%`} size="small" color={bucket.allocationPct > 70
                ? 'error'
                : bucket.allocationPct > 50
                    ? 'warning'
                    : 'default'}/>
                  <material_1.Typography variant="caption" color="text.secondary">
                    Units: {bucket.units.toFixed(1)}
                  </material_1.Typography>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>))}
      </Grid_1.default>

      <Grid_1.default container spacing={2} sx={{ mt: 1 }}>
        <Grid_1.default xs={12} md={5}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <icons_material_1.TrendingUp color="primary"/>
                <material_1.Typography variant="h6">Unit Metrics</material_1.Typography>
              </material_1.Stack>
              <material_1.Divider sx={{ mb: 1 }}/>
              <material_1.Table size="small">
                <material_1.TableBody>
                  <material_1.TableRow>
                    <material_1.TableCell>Cost per compute unit</material_1.TableCell>
                    <material_1.TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerComputeUnit || 0)}
                    </material_1.TableCell>
                  </material_1.TableRow>
                  <material_1.TableRow>
                    <material_1.TableCell>Cost per GB-hour</material_1.TableCell>
                    <material_1.TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerGbHour || 0)}
                    </material_1.TableCell>
                  </material_1.TableRow>
                  <material_1.TableRow>
                    <material_1.TableCell>Cost per egress GB</material_1.TableCell>
                    <material_1.TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerEgressGb || 0)}
                    </material_1.TableCell>
                  </material_1.TableRow>
                  <material_1.TableRow>
                    <material_1.TableCell>Cost per 3p request</material_1.TableCell>
                    <material_1.TableCell align="right">
                      {formatUsd(overview?.unitMetrics.costPerThirdPartyRequest || 0)}
                    </material_1.TableCell>
                  </material_1.TableRow>
                </material_1.TableBody>
              </material_1.Table>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>

        <Grid_1.default xs={12} md={7}>
          <material_1.Card>
            <material_1.CardContent>
              <material_1.Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <icons_material_1.Assessment color="primary"/>
                <material_1.Typography variant="h6">Daily Trend</material_1.Typography>
              </material_1.Stack>
              <material_1.Divider sx={{ mb: 1 }}/>
              <material_1.Table size="small">
                <material_1.TableHead>
                  <material_1.TableRow>
                    <material_1.TableCell>Date</material_1.TableCell>
                    <material_1.TableCell align="right">Total</material_1.TableCell>
                    <material_1.TableCell align="right">Compute</material_1.TableCell>
                    <material_1.TableCell align="right">Storage</material_1.TableCell>
                    <material_1.TableCell align="right">Egress</material_1.TableCell>
                    <material_1.TableCell align="right">3P</material_1.TableCell>
                  </material_1.TableRow>
                </material_1.TableHead>
                <material_1.TableBody>
                  {trendPoints.map((point) => (<material_1.TableRow key={point.usageDate}>
                      <material_1.TableCell>{point.usageDate}</material_1.TableCell>
                      <material_1.TableCell align="right">
                        {formatUsd(point.totalCostUsd)}
                      </material_1.TableCell>
                      <material_1.TableCell align="right">
                        {formatUsd(point.computeCostUsd)}
                      </material_1.TableCell>
                      <material_1.TableCell align="right">
                        {formatUsd(point.storageCostUsd)}
                      </material_1.TableCell>
                      <material_1.TableCell align="right">
                        {formatUsd(point.egressCostUsd)}
                      </material_1.TableCell>
                      <material_1.TableCell align="right">
                        {formatUsd(point.thirdPartyCostUsd)}
                      </material_1.TableCell>
                    </material_1.TableRow>))}
                  {!trendPoints.length && (<material_1.TableRow>
                      <material_1.TableCell colSpan={6}>
                        <material_1.Typography variant="body2" color="text.secondary">
                          No rollup data available for this window.
                        </material_1.Typography>
                      </material_1.TableCell>
                    </material_1.TableRow>)}
                </material_1.TableBody>
              </material_1.Table>
            </material_1.CardContent>
          </material_1.Card>
        </Grid_1.default>
      </Grid_1.default>
    </material_1.Box>);
}
