"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LatencyPanels;
const react_1 = __importDefault(require("react"));
const hooks_1 = require("../../store/hooks");
const material_1 = require("@mui/material");
const recharts_1 = require("recharts");
const useSafeQuery_1 = require("../../hooks/useSafeQuery");
function LatencyPanels() {
    const { tenant, status, operation } = (0, hooks_1.useAppSelector)((s) => s.ui);
    const { data: p95, loading: loadingP95 } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `p95_${tenant}_${status}_${operation}`,
        mock: { valueMs: 120.4 },
        deps: [tenant, status, operation],
    });
    const { data: trend, loading: loadingTrend } = (0, useSafeQuery_1.useSafeQuery)({
        queryKey: `p95_trend_${tenant}_${status}`,
        mock: Array.from({ length: 20 }).map((_, i) => ({
            ts: Date.now() - (20 - i) * 60000,
            ms: 40 + i * 5,
        })),
        deps: [tenant, status],
    });
    return (<material_1.Stack spacing={2}>
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="subtitle2" color="text.secondary">
            p95 Latency (5m) — Tenant×Status
          </material_1.Typography>
          {loadingP95 ? (<material_1.Skeleton height={40} width={140}/>) : (<material_1.Typography variant="h4">{p95?.valueMs.toFixed(1)} ms</material_1.Typography>)}
        </material_1.CardContent>
      </material_1.Card>
      <material_1.Card>
        <material_1.CardContent>
          <material_1.Typography variant="subtitle2" color="text.secondary">
            p95 Trend (5m) — Tenant×Status
          </material_1.Typography>
          <div style={{ height: 220 }}>
            {loadingTrend ? (<material_1.Skeleton variant="rounded" height={200}/>) : (<recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={trend} aria-label="p95 trend">
                  <recharts_1.XAxis dataKey="ts" tickFormatter={(v) => new Date(v).toLocaleTimeString()}/>
                  <recharts_1.YAxis unit=" ms"/>
                  <recharts_1.Tooltip labelFormatter={(v) => new Date(Number(v)).toLocaleString()}/>
                  <recharts_1.Line type="monotone" dataKey="ms" stroke="#1976d2" dot={false} isAnimationActive={false}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>)}
          </div>
        </material_1.CardContent>
      </material_1.Card>
    </material_1.Stack>);
}
