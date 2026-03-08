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
exports.default = ControlHub;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const api_1 = require("../api");
function ReleaseOverview({ summary }) {
    const [releaseStatus, setReleaseStatus] = (0, react_1.useState)({
        currentCanary: summary?.autonomy.canary || 0,
        trafficPercent: 10,
        rolloutHealth: 'healthy',
        lastPromotion: '2h ago',
    });
    const quickActions = [
        { label: 'Pause Rollout', action: 'pause', variant: 'secondary' },
        { label: 'Promote to 25%', action: 'promote', variant: 'primary' },
        {
            label: 'Emergency Rollback',
            action: 'rollback',
            variant: 'danger',
        },
    ];
    return (<div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Release Overview
        </h2>
        <div className={`rounded-full px-2 py-1 text-xs font-medium ${{
            healthy: 'bg-green-100 text-green-800',
            warning: 'bg-yellow-100 text-yellow-800',
            critical: 'bg-red-100 text-red-800',
        }[releaseStatus.rolloutHealth]}`}>
          {releaseStatus.rolloutHealth.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <div className="text-sm text-slate-600">Current Canary</div>
          <div className="text-2xl font-bold text-slate-900">
            {Math.round(releaseStatus.currentCanary * 100)}%
          </div>
          <div className="text-xs text-slate-500">
            Traffic: {releaseStatus.trafficPercent}%
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600">Rollout Health</div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${{
            healthy: 'bg-green-500',
            warning: 'bg-yellow-500',
            critical: 'bg-red-500',
        }[releaseStatus.rolloutHealth]}`}/>
            <span className="text-sm font-medium capitalize">
              {releaseStatus.rolloutHealth}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Last promotion: {releaseStatus.lastPromotion}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-600">Quick Actions</div>
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action) => (<button key={action.action} className={`rounded px-2 py-1 text-xs font-medium ${{
                primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
                secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                danger: 'bg-red-100 text-red-700 hover:bg-red-200',
            }[action.variant]}`}>
                {action.label}
              </button>))}
          </div>
        </div>
      </div>
    </div>);
}
function TopKPIs({ summary }) {
    const kpis = [
        {
            label: 'Build Success Rate',
            value: `${Math.round((summary?.health.success || 0.98) * 100)}%`,
            trend: '+2.1%',
            trendUp: true,
            target: '≥97%',
        },
        {
            label: 'Mean Lead Time',
            value: '2.3h',
            trend: '-15min',
            trendUp: true,
            target: '≤4h',
        },
        {
            label: 'P95 Build Duration',
            value: `${summary?.health.p95 || 180}ms`,
            trend: '+12ms',
            trendUp: false,
            target: '≤600ms',
        },
        {
            label: 'SLO Burn Rate',
            value: `${summary?.health.burn || 0.8}×`,
            trend: '-0.2×',
            trendUp: true,
            target: '≤1.0×',
        },
        {
            label: 'Cost Burn',
            value: `$${summary?.budgets.remaining || 1240}`,
            trend: '+$120',
            trendUp: false,
            target: `≤$${summary?.budgets.cap || 5000}`,
        },
        {
            label: 'Queue Depth',
            value: '3',
            trend: '-2',
            trendUp: true,
            target: '≤10',
        },
    ];
    return (<div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Top KPIs</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {kpis.map((kpi) => (<div key={kpi.label} className="space-y-1">
            <div className="text-xs text-slate-600">{kpi.label}</div>
            <div className="text-lg font-semibold text-slate-900">
              {kpi.value}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${kpi.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.trendUp ? '↑' : '↓'} {kpi.trend}
              </span>
              <span className="text-xs text-slate-500">{kpi.target}</span>
            </div>
          </div>))}
      </div>
    </div>);
}
function WhatsHotCold({ summary }) {
    const issues = [
        {
            type: 'flapping',
            title: 'Test: integration.auth.test.js',
            description: '67% flap rate, 3 failures in last hour',
            severity: 'warning',
            trend: 'worsening',
        },
        {
            type: 'pipeline',
            title: 'Pipeline: deploy-staging',
            description: 'P95 duration increased 45% (8min → 11.6min)',
            severity: 'warning',
            trend: 'worsening',
        },
        {
            type: 'cost',
            title: 'Cost Center: ml-inference',
            description: '$1,245 spend this hour (+340% vs baseline)',
            severity: 'critical',
            trend: 'worsening',
        },
        {
            type: 'alert',
            title: 'Alert: SLO Burn Rate High',
            description: 'Error budget at 15% (85% consumed)',
            severity: 'critical',
            trend: 'stable',
        },
    ];
    const improvements = [
        {
            type: 'performance',
            title: 'Pipeline: build-frontend',
            description: 'P95 duration improved 23% (6min → 4.6min)',
            trend: 'improving',
        },
        {
            type: 'reliability',
            title: 'Route: /api/v1/chat/completions',
            description: '99.97% success rate (target: 99.9%)',
            trend: 'stable',
        },
    ];
    return (<div className="space-y-4">
      {/* What's Hot (Issues) */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          What's Hot 🔥
        </h2>
        <div className="space-y-3">
          {issues.map((issue, i) => (<div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <div className={`h-2 w-2 rounded-full mt-2 ${{
                warning: 'bg-yellow-500',
                critical: 'bg-red-500',
            }[issue.severity]}`}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {issue.title}
                </div>
                <div className="text-xs text-slate-600">
                  {issue.description}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${{
                warning: 'bg-yellow-100 text-yellow-800',
                critical: 'bg-red-100 text-red-800',
            }[issue.severity]}`}>
                    {issue.severity}
                  </span>
                  <span className={`text-xs font-medium ${{
                worsening: 'text-red-600',
                stable: 'text-slate-600',
            }[issue.trend]}`}>
                    {issue.trend === 'worsening' ? '↗' : '→'} {issue.trend}
                  </span>
                </div>
              </div>
            </div>))}
        </div>
      </div>

      {/* What's Cold (Good) */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          What's Cold ❄️
        </h2>
        <div className="space-y-3">
          {improvements.map((item, i) => (<div key={i} className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
              <div className="h-2 w-2 rounded-full bg-green-500 mt-2"/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  {item.title}
                </div>
                <div className="text-xs text-slate-600">{item.description}</div>
                <div className="mt-1">
                  <span className={`text-xs font-medium ${{
                improving: 'text-green-600',
                stable: 'text-slate-600',
            }[item.trend]}`}>
                    {item.trend === 'improving' ? '↘' : '→'} {item.trend}
                  </span>
                </div>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}
function ComplianceGlance({ summary }) {
    const compliance = {
        signaturesVerified: { count: 47, total: 47, status: 'pass' },
        sbomDiff: { status: 'pass', lastCheck: '5 min ago' },
        policyDenials: { count: 3, window: '24h', trend: '-40%' },
        evidenceBundles: {
            generated: 12,
            window: 'today',
            lastBundle: '15 min ago',
        },
    };
    return (<div className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Compliance at a Glance
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Signatures Verified</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {compliance.signaturesVerified.count}/
                {compliance.signaturesVerified.total}
              </span>
              <div className={`h-2 w-2 rounded-full ${compliance.signaturesVerified.status === 'pass'
            ? 'bg-green-500'
            : 'bg-red-500'}`}/>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">SBOM Diff</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {compliance.sbomDiff.lastCheck}
              </span>
              <div className={`h-2 w-2 rounded-full ${compliance.sbomDiff.status === 'pass'
            ? 'bg-green-500'
            : 'bg-red-500'}`}/>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Policy Denials ({compliance.policyDenials.window})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {compliance.policyDenials.count}
              </span>
              <span className="text-xs text-green-600 font-medium">
                ↓ {compliance.policyDenials.trend}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Evidence Bundles ({compliance.evidenceBundles.window})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">
                {compliance.evidenceBundles.generated}
              </span>
              <span className="text-xs text-slate-500">
                {compliance.evidenceBundles.lastBundle}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            All attestations signed • Supply chain verified • Audit trail
            complete
          </span>
          <react_router_dom_1.Link to="/maestro/admin/compliance" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            View Details →
          </react_router_dom_1.Link>
        </div>
      </div>
    </div>);
}
function ControlHub() {
    const { useSummary } = (0, api_1.api)();
    const { data: summary } = useSummary();
    return (<div className="space-y-6">
      {/* Status Ribbon */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-400"/>
            <span className="text-sm font-medium">
              System Status: All services operational
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>Current Release: v2.4.1</span>
            <span>Error Budget: 85% remaining</span>
            <span>Environment: Development</span>
          </div>
        </div>
      </div>

      {/* Release Overview */}
      <ReleaseOverview summary={summary}/>

      {/* Top KPIs */}
      <TopKPIs summary={summary}/>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* What's Hot/Cold */}
        <WhatsHotCold summary={summary}/>

        {/* Compliance at a Glance */}
        <ComplianceGlance summary={summary}/>
      </div>

      {/* Live Runs and Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Live Runs</h2>
            <react_router_dom_1.Link to="/maestro/runs" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View All →
            </react_router_dom_1.Link>
          </div>
          <div className="space-y-2">
            {summary?.runs?.slice(0, 5).map((run) => (<div key={run.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${run.status === 'Running'
                ? 'bg-blue-500 animate-pulse'
                : run.status === 'Succeeded'
                    ? 'bg-green-500'
                    : 'bg-red-500'}`}/>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      <react_router_dom_1.Link to={`/maestro/runs/${run.id}`} className="hover:text-indigo-600">
                        {run.id}
                      </react_router_dom_1.Link>
                    </div>
                    <div className="text-xs text-slate-600">
                      {run.pipeline || 'build'}
                    </div>
                  </div>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-medium ${run.status === 'Running'
                ? 'bg-blue-100 text-blue-800'
                : run.status === 'Succeeded'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'}`}>
                  {run.status}
                </span>
              </div>))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Pending Approvals
            </h2>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {summary?.approvals?.length || 0}
              </div>
              <div className="text-sm text-slate-600">
                items awaiting approval
              </div>
              {(summary?.approvals?.length || 0) > 0 && (<react_router_dom_1.Link to="/maestro/approvals" className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Review Now →
                </react_router_dom_1.Link>)}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <button className="w-full rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
                Create New Run
              </button>
              <button className="w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Generate Evidence Bundle
              </button>
              <button className="w-full rounded border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Review Policies
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Changes */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Changes
          </h2>
          <react_router_dom_1.Link to="/maestro/audit" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View Audit Log →
          </react_router_dom_1.Link>
        </div>
        <div className="space-y-3">
          {summary?.changes?.slice(0, 6).map((change, i) => (<div key={i} className="flex gap-4 border-b pb-3 last:border-0">
              <div className="w-32 flex-shrink-0">
                <div className="text-xs font-mono text-slate-500">
                  {change.at}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-900">{change.title}</div>
                <div className="text-xs text-slate-600">by {change.by}</div>
              </div>
            </div>))}
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-slate-500">
          Provenance and diffs are recorded for each change. All changes are
          cryptographically signed and immutable.
        </div>
      </div>
    </div>);
}
