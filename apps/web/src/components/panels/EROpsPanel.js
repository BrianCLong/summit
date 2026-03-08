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
exports.EROpsPanel = EROpsPanel;
const react_1 = __importStar(require("react"));
const recharts_1 = require("recharts");
const Badge_1 = require("@/components/ui/Badge");
const Card_1 = require("@/components/ui/Card");
const Skeleton_1 = require("@/components/ui/Skeleton");
const COLORS = ['#6366f1', '#f97316', '#14b8a6', '#eab308', '#ec4899'];
const formatPercent = (value) => value === undefined ? '--' : `${(value * 100).toFixed(1)}%`;
function EROpsPanel() {
    const [precisionData, setPrecisionData] = (0, react_1.useState)([]);
    const [rollbackData, setRollbackData] = (0, react_1.useState)([]);
    const [conflictData, setConflictData] = (0, react_1.useState)([]);
    const [guardrailStatus, setGuardrailStatus] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [precisionResponse, rollbackResponse, conflictResponse, guardrailResponse,] = await Promise.all([
                    fetch('/api/ga-core-metrics/er-ops/precision-recall?days=30'),
                    fetch('/api/ga-core-metrics/er-ops/rollbacks?days=30'),
                    fetch('/api/ga-core-metrics/er-ops/conflicts?days=30'),
                    fetch('/api/er/guardrails/status'),
                ]);
                if (!precisionResponse.ok) {
                    throw new Error('Failed to load precision/recall trends');
                }
                if (!rollbackResponse.ok) {
                    throw new Error('Failed to load rollback metrics');
                }
                if (!conflictResponse.ok) {
                    throw new Error('Failed to load conflict metrics');
                }
                if (!guardrailResponse.ok) {
                    throw new Error('Failed to load guardrail status');
                }
                const precisionJson = await precisionResponse.json();
                const rollbackJson = await rollbackResponse.json();
                const conflictJson = await conflictResponse.json();
                const guardrailJson = await guardrailResponse.json();
                if (!active)
                    return;
                setPrecisionData(precisionJson.data || []);
                setRollbackData(rollbackJson.data || []);
                setConflictData(conflictJson.data || []);
                setGuardrailStatus(guardrailJson || null);
            }
            catch (err) {
                if (!active)
                    return;
                setError(err instanceof Error ? err.message : 'Failed to load metrics');
            }
            finally {
                if (active)
                    setLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);
    const precisionTrend = (0, react_1.useMemo)(() => {
        const map = new Map();
        precisionData.forEach(point => {
            const entry = map.get(point.date) || { date: point.date };
            const value = Number(point.value);
            if (point.metric_name === 'precision') {
                entry.precision = value;
            }
            else {
                entry.recall = value;
            }
            map.set(point.date, entry);
        });
        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [precisionData]);
    const rollbackTrend = (0, react_1.useMemo)(() => rollbackData
        .map(point => ({
        date: point.date,
        rollbacks: Number(point.rollbacks),
        total: Number(point.total_deployments),
    }))
        .sort((a, b) => a.date.localeCompare(b.date)), [rollbackData]);
    const conflictSummary = (0, react_1.useMemo)(() => conflictData.map(point => ({
        name: point.conflict_reason,
        count: Number(point.count),
    })), [conflictData]);
    const latestTrend = precisionTrend[precisionTrend.length - 1];
    const totalRollbacks = rollbackTrend.reduce((sum, point) => sum + point.rollbacks, 0);
    const topConflict = conflictSummary[0]?.name;
    const guardrailOverride = guardrailStatus?.latestOverride;
    const guardrailBadge = guardrailStatus?.passed ? 'PASS' : 'FAIL';
    return (<Card_1.Card className="border-primary/20">
      <Card_1.CardHeader className="flex flex-row items-center justify-between">
        <div>
          <Card_1.CardTitle>ER Ops</Card_1.CardTitle>
          <p className="text-sm text-muted-foreground">
            Precision, recall, rollbacks, and conflict signals
          </p>
        </div>
        <Badge_1.Badge variant="secondary">Ops</Badge_1.Badge>
      </Card_1.CardHeader>
      <Card_1.CardContent>
        {loading ? (<div className="space-y-4">
            <Skeleton_1.Skeleton className="h-20 w-full"/>
            <Skeleton_1.Skeleton className="h-64 w-full"/>
          </div>) : error ? (<div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>) : (<div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    Guardrails
                  </h4>
                  <Badge_1.Badge variant={guardrailStatus?.passed ? 'secondary' : 'destructive'}>
                    {guardrailStatus ? guardrailBadge : '---'}
                  </Badge_1.Badge>
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Precision</span>
                    <span>{formatPercent(guardrailStatus?.metrics?.precision)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recall</span>
                    <span>{formatPercent(guardrailStatus?.metrics?.recall)}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Dataset: {guardrailStatus?.datasetId || '--'} · Thresholds{' '}
                  {formatPercent(guardrailStatus?.thresholds?.minPrecision)}/
                  {formatPercent(guardrailStatus?.thresholds?.minRecall)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Override:{' '}
                  {guardrailOverride
                ? `${guardrailOverride.reason} (${guardrailOverride.actorId || 'unknown'})`
                : 'None'}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Latest Precision
                </h4>
                <div className="text-2xl font-semibold">
                  {formatPercent(latestTrend?.precision)}
                </div>
                <p className="text-xs text-muted-foreground">30-day trend</p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Latest Recall
                </h4>
                <div className="text-2xl font-semibold">
                  {formatPercent(latestTrend?.recall)}
                </div>
                <p className="text-xs text-muted-foreground">30-day trend</p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Rollbacks (30d)
                </h4>
                <div className="text-2xl font-semibold">{totalRollbacks}</div>
                <p className="text-xs text-muted-foreground">
                  Latest conflict: {topConflict || 'None'}
                </p>
              </div>
            </div>

            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Precision vs Recall
                </h4>
                <div className="h-52">
                  <recharts_1.ResponsiveContainer width="100%" height="100%">
                    <recharts_1.LineChart data={precisionTrend}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                      <recharts_1.XAxis dataKey="date"/>
                      <recharts_1.YAxis domain={[0, 1]}/>
                      <recharts_1.Tooltip formatter={(value) => formatPercent(value)}/>
                      <recharts_1.Line type="monotone" dataKey="precision" stroke="#6366f1" strokeWidth={2} dot={false}/>
                      <recharts_1.Line type="monotone" dataKey="recall" stroke="#14b8a6" strokeWidth={2} dot={false}/>
                    </recharts_1.LineChart>
                  </recharts_1.ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Rollback Counts
                </h4>
                <div className="h-52">
                  <recharts_1.ResponsiveContainer width="100%" height="100%">
                    <recharts_1.BarChart data={rollbackTrend}>
                      <recharts_1.CartesianGrid strokeDasharray="3 3"/>
                      <recharts_1.XAxis dataKey="date"/>
                      <recharts_1.YAxis allowDecimals={false}/>
                      <recharts_1.Tooltip />
                      <recharts_1.Bar dataKey="rollbacks" fill="#f97316" radius={[4, 4, 0, 0]}/>
                    </recharts_1.BarChart>
                  </recharts_1.ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-lg border p-4 md:col-span-2">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Conflict Reasons
                </h4>
                <div className="h-52">
                  <recharts_1.ResponsiveContainer width="100%" height="100%">
                    <recharts_1.PieChart>
                      <recharts_1.Pie data={conflictSummary} dataKey="count" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {conflictSummary.map((entry, index) => (<recharts_1.Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]}/>))}
                      </recharts_1.Pie>
                      <recharts_1.Tooltip />
                    </recharts_1.PieChart>
                  </recharts_1.ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>)}
      </Card_1.CardContent>
    </Card_1.Card>);
}
