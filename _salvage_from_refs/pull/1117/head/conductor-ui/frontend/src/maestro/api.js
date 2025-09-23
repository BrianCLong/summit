import { useEffect, useMemo, useRef, useState } from 'react';
import { getMaestroConfig, authHeaders } from './config';
export function api() {
  const cfg = getMaestroConfig();
  const base = cfg.gatewayBase?.replace(/\/$/, '') || '';
  async function j(url, init) {
    const res = await fetch(url, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {}),
        ...authHeaders(cfg),
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }
  // In real usage, plumb env + auth headers; here we expose React hooks.
  function useSummary() {
    const [data, setData] = useState(null);
    useEffect(() => {
      setData({
        autonomy: { level: 3, canary: 0.1 },
        health: { success: 0.984, p95: 180, burn: 0.8 },
        budgets: { remaining: 1240, cap: 5000 },
        runs: Array.from({ length: 8 }).map((_, i) => ({
          id: `run_${1000 + i}`,
          status: i % 3 ? 'Running' : 'Succeeded',
        })),
        approvals: [{ id: 'appr_1' }],
        changes: [
          {
            at: new Date().toLocaleString(),
            title: 'Policy updated: Cost ceiling $200/run',
            by: 'alice',
          },
          { at: new Date().toLocaleString(), title: 'Recipe v1.2 published: SLO Guard', by: 'bob' },
        ],
      });
    }, []);
    return { data };
  }
  function useRuns() {
    const [data, setData] = useState([]);
    const refetch = async () => {
      if (!base) {
        // fallback mock
        const now = Date.now();
        return setData(
          Array.from({ length: 12 }).map((_, i) => ({
            id: `run_${now}_${i}`,
            pipeline: ['build', 'test', 'deploy'][i % 3],
            status: ['Queued', 'Running', 'Succeeded', 'Failed'][i % 4],
            durationMs: 200 + Math.round(Math.random() * 3000),
            cost: Number((Math.random() * 2).toFixed(2)),
          })),
        );
      }
      try {
        const resp = await j(`${base}/runs`);
        setData(resp.items || []);
      } catch (e) {
        console.warn('GET /runs failed, fallback to mock', e);
        const now = Date.now();
        setData(
          Array.from({ length: 8 }).map((_, i) => ({
            id: `run_${now}_${i}`,
            pipeline: 'build',
            status: i % 2 ? 'Running' : 'Succeeded',
            durationMs: 500,
            cost: 0.1,
          })),
        );
      }
    };
    useEffect(() => {
      void refetch();
    }, []);
    return { data, refetch };
  }
  function usePipelines() {
    const [data, setData] = useState([]);
    useEffect(() => {
      setData(
        ['Build IntelGraph', 'Run Tests', 'Publish Release'].map((name, i) => ({
          id: `pl_${i + 1}`,
          name,
          version: `1.${i}.0`,
          owner: ['alice', 'bob', 'carol'][i % 3],
        })),
      );
    }, []);
    return { data };
  }
  function useAutonomy() {
    const [data, setData] = useState({
      level: 3,
      policies: [
        { title: 'Change freeze on Fridays after 12:00', state: 'ON' },
        { title: 'Auto-rollback if error budget burn > 2%/h', state: 'ON' },
        { title: 'Dual-approval for risk score >= 7/10', state: 'ON' },
        { title: 'Cost ceiling $200/run', state: 'ON' },
      ],
    });
    const setLevel = (level) => setData((d) => ({ ...d, level }));
    return { data, setLevel };
  }
  function useRecipes() {
    const [data, setData] = useState([]);
    useEffect(() => {
      setData([
        { id: 'r1', name: 'Rapid Attribution', version: '1.0.0', verified: true },
        { id: 'r2', name: 'SLO Guard Enforcement', version: '1.2.0', verified: true },
        { id: 'r3', name: 'Cost Clamp', version: '0.9.1', verified: false },
      ]);
    }, []);
    return { data };
  }
  function useObservability() {
    const [data, setData] = useState(null);
    useEffect(() => {
      setData({ latencyP95: 180, errorRate: 0.4, throughput: 320, queueDepth: 7 });
    }, []);
    return { data };
  }
  function useCosts() {
    const [data, setData] = useState(null);
    useEffect(() => {
      setData({ today: 22.31, week: 145.89, utilization: 56, cap: 5000 });
    }, []);
    return { data };
  }
  function useTickets() {
    const [data, setData] = useState([]);
    useEffect(() => {
      setData([
        { id: '#1234', status: 'open', owner: 'alice', runId: 'run_001' },
        { id: '#1235', status: 'triage', owner: 'oncall', runId: 'run_002' },
      ]);
    }, []);
    return { data };
  }
  // Run detail
  function useRun(id) {
    const [data, setData] = useState(null);
    useEffect(() => {
      (async () => {
        if (!base)
          return setData({
            id,
            pipeline: 'build',
            status: 'Running',
            autonomyLevel: 3,
            canary: 0.1,
            budgetCap: 200,
            startedAt: new Date().toLocaleTimeString(),
            durationMs: 820,
            cost: 0.23,
          });
        try {
          const resp = await j(`${base}/runs/${encodeURIComponent(id)}`);
          setData(resp);
        } catch (e) {
          console.warn('GET /runs/:id failed, fallback', e);
          setData({
            id,
            pipeline: 'build',
            status: 'Running',
            autonomyLevel: 3,
            canary: 0.1,
            budgetCap: 200,
            startedAt: new Date().toLocaleTimeString(),
            durationMs: 820,
            cost: 0.23,
          });
        }
      })();
    }, [id]);
    return { data };
  }
  function useRunGraph(id) {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    useEffect(() => {
      (async () => {
        if (!base) {
          const ns = [
            { id: 'source', label: 'source', state: 'succeeded' },
            { id: 'validate', label: 'validate', state: 'succeeded' },
            { id: 'enrich', label: 'enrich', state: 'running' },
            { id: 'plan', label: 'plan', state: 'queued' },
            { id: 'execute', label: 'execute', state: 'queued' },
            { id: 'report', label: 'report', state: 'queued' },
            { id: 'fallback', label: 'fallback', state: 'queued' },
          ];
          const es = [
            { from: 'source', to: 'validate' },
            { from: 'validate', to: 'enrich' },
            { from: 'enrich', to: 'plan' },
            { from: 'plan', to: 'execute' },
            { from: 'execute', to: 'report' },
            { from: 'source', to: 'fallback' },
          ];
          return (setNodes(ns), setEdges(es));
        }
        try {
          const resp = await j(`${base}/runs/${encodeURIComponent(id)}/graph`);
          setNodes(resp.nodes || []);
          setEdges(resp.edges || []);
        } catch (e) {
          console.warn('GET /runs/:id/graph failed, fallback', e);
          setNodes([
            { id: 'source', label: 'source', state: 'succeeded' },
            { id: 'execute', label: 'execute', state: 'running' },
          ]);
          setEdges([{ from: 'source', to: 'execute' }]);
        }
      })();
    }, [id]);
    return { nodes, edges };
  }
  function useRunLogs(id, nodeId) {
    const [lines, setLines] = useState([]);
    const esRef = useRef(null);
    useEffect(() => {
      let alive = true;
      if (base) {
        try {
          const q = new URLSearchParams({
            stream: 'true',
            ...(nodeId ? { nodeId: String(nodeId) } : {}),
          });
          const url = `${base}/runs/${encodeURIComponent(id)}/logs?${q}`;
          const es = new EventSource(url, { withCredentials: false });
          esRef.current = es;
          es.addEventListener('message', (ev) => {
            try {
              const m = JSON.parse(ev.data);
              setLines((l) => [
                ...l.slice(-5000),
                { ts: m.ts || new Date().toISOString(), text: m.text || String(ev.data) },
              ]);
            } catch {
              setLines((l) => [
                ...l.slice(-5000),
                { ts: new Date().toISOString(), text: String(ev.data) },
              ]);
            }
          });
          es.addEventListener('error', () => {
            // fall back to timer
            es.close();
            if (!alive) return;
            let c = 0;
            const t = setInterval(
              () =>
                setLines((l) => [
                  ...l.slice(-5000),
                  { ts: new Date().toISOString(), text: `run ${id}: log line ${++c}` },
                ]),
              500,
            );
            return () => clearInterval(t);
          });
        } catch {
          // ignore, fallback below
        }
      }
      if (!base) {
        let c = 0;
        const t = setInterval(
          () =>
            setLines((l) => [
              ...l.slice(-5000),
              { ts: new Date().toISOString(), text: `run ${id}: log line ${++c}` },
            ]),
          500,
        );
        return () => {
          alive = false;
          clearInterval(t);
        };
      }
      return () => {
        alive = false;
        esRef.current?.close();
      };
    }, [id, nodeId]);
    const clear = () => setLines([]);
    return { lines, clear };
  }
  function usePolicyDecisions(id) {
    const [decisions, setDecisions] = useState([]);
    useEffect(() => {
      setDecisions([
        { id: 'pol1', action: 'promote', allowed: true, reasons: [], appealPath: '' },
        { id: 'pol2', action: 'cost_check', allowed: true, reasons: [], appealPath: '' },
        {
          id: 'pol3',
          action: 'change_freeze',
          allowed: false,
          reasons: ['Change Freeze Friday (12:00–23:59)'],
          appealPath: 'Request exception',
        },
      ]);
    }, [id]);
    return { decisions };
  }
  function useArtifacts(id) {
    const [artifacts, setArtifacts] = useState([]);
    useEffect(() => {
      setArtifacts([
        { name: 'image:app:sha256', digest: 'sha256:abc123', size: '64MB' },
        { name: 'sbom.spdx.json', digest: 'sha256:def456', size: '1.2MB' },
      ]);
    }, [id]);
    return { artifacts };
  }
  // Additional API helpers
  async function patchAutonomy(payload) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/autonomy`, { method: 'PATCH', body: JSON.stringify(payload) });
  }
  async function getBudgets() {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/budgets`);
  }
  async function putBudgets(payload) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/budgets`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async function postTickets(payload) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/tickets`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function postPolicyExplain(payload) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/policies/explain`, { method: 'POST', body: JSON.stringify(payload) });
  }
  // CI annotations
  async function getCIAnnotations(runId) {
    if (!base) return { items: [] };
    return j(`${base}/runs/${encodeURIComponent(runId)}/ci/annotations`);
  }
  async function getCIAnnotationsGlobal(params = {}) {
    if (!base) return { annotations: [] };
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    if (params.level) q.set('level', params.level);
    if (params.repo) q.set('repo', params.repo);
    const qs = q.toString();
    return j(`${base}/ci/annotations${qs ? `?${qs}` : ''}`);
  }
  // SLO by tenant
  async function getSLOSummaryByTenant(tenant) {
    if (!base)
      return {
        tenant,
        slo: 0.995,
        windowFast: '1h',
        windowSlow: '6h',
        fastBurn: 0.9,
        slowBurn: 0.8,
        errorRate: { fast: 0.005, slow: 0.004 },
        updatedAt: Date.now(),
      };
    return j(`${base}/metrics/slo?tenant=${encodeURIComponent(tenant)}`);
  }
  async function getSLOTimeSeriesByTenant(
    tenant,
    windowMs = 24 * 3600 * 1000,
    stepMs = 10 * 60 * 1000,
  ) {
    if (!base) return { tenant, points: [] };
    const q = new URLSearchParams({ tenant, windowMs: String(windowMs), stepMs: String(stepMs) });
    return j(`${base}/metrics/slo/timeseries?${q.toString()}`);
  }
  // Tenant costs
  async function getTenantCostSummary(tenant, windowMs = 24 * 3600 * 1000) {
    if (!base)
      return { tenant, windowMs, totalUsd: 0, byPipeline: [], byModelProvider: [], recentRuns: [] };
    const q = new URLSearchParams({ tenant, windowMs: String(windowMs) });
    return j(`${base}/metrics/cost/tenant?${q.toString()}`);
  }
  async function getTenantCostSeries(tenant, windowMs = 24 * 3600 * 1000, stepMs = 10 * 60 * 1000) {
    if (!base) return { tenant, points: [] };
    const q = new URLSearchParams({ tenant, windowMs: String(windowMs), stepMs: String(stepMs) });
    return j(`${base}/metrics/cost/tenant/timeseries?${q.toString()}`);
  }
  async function getTenantBudget(tenant) {
    if (!base) return { tenant, monthlyUsd: 100 };
    return j(`${base}/budgets/tenant?tenant=${encodeURIComponent(tenant)}`);
  }
  async function getTenantBudgetPolicy(tenant) {
    if (!base) return { tenant, type: 'hard', limit: 1000, grace: 0.1 }; // Mock policy
    // In a real scenario, this would fetch the actual policy from the backend
    return j(`${base}/budgets/tenant/policy?tenant=${encodeURIComponent(tenant)}`);
  }
  async function putTenantBudget(tenant, monthlyUsd) {
    if (!base) return { ok: true, tenant, monthlyUsd };
    return j(`${base}/budgets/tenant`, {
      method: 'PUT',
      body: JSON.stringify({ tenant, monthlyUsd }),
    });
  }
  async function getTenantCostForecast(tenant, hours = 48, alpha = 0.5, budgetUsd) {
    if (!base)
      return {
        tenant,
        budgetUsd: budgetUsd ?? 100,
        hourlyAvg: 0.2,
        projectedMonthUsd: 120,
        hist: [],
        smooth: [],
        forecast: [],
        risk: 'WARN',
      };
    const q = new URLSearchParams({
      tenant,
      hours: String(hours),
      alpha: String(alpha),
      ...(budgetUsd ? { budgetUsd: String(budgetUsd) } : {}),
    });
    return j(`${base}/metrics/cost/tenant/forecast?${q.toString()}`);
  }
  async function getTenantCostAnomalies(
    tenant,
    windowMs = 24 * 3600 * 1000,
    stepMs = 60 * 60 * 1000,
    z = 3.0,
  ) {
    if (!base) return { tenant, mean: 0.3, std: 0.1, threshold: z, series: [], anomalies: [] };
    const q = new URLSearchParams({
      tenant,
      windowMs: String(windowMs),
      stepMs: String(stepMs),
      z: String(z),
    });
    return j(`${base}/metrics/cost/tenant/anomalies?${q.toString()}`);
  }
  async function getModelCostAnomalies(tenant) {
    if (!base) return { items: [] };
    return j(`${base}/metrics/cost/models/anomalies?tenant=${encodeURIComponent(tenant)}`);
  }
  async function billingExport(tenant, month, format) {
    if (!base) return { csvUrl: 'mock-csv-url', jsonUrl: 'mock-json-url' };
    const q = new URLSearchParams({ tenant, month, format });
    return j(`${base}/billing/export?${q.toString()}`);
  }
  // DLQ signatures & policy
  async function getDLQSignatures() {
    if (!base) return { signatures: [] };
    return j(`${base}/ops/dlq/signatures`);
  }
  async function getDLQSignatureTimeSeries(sig) {
    if (!base) return { sig, points: [] };
    const q = new URLSearchParams({ sig });
    return j(`${base}/ops/dlq/signatures/timeseries?${q.toString()}`);
  }
  async function getDLQPolicy() {
    if (!base)
      return {
        enabled: false,
        dryRun: true,
        allowKinds: [],
        allowSignatures: [],
        maxReplaysPerMinute: 10,
      };
    return j(`${base}/ops/dlq/policy`);
  }
  async function putDLQPolicy(p) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/ops/dlq/policy`, { method: 'PUT', body: JSON.stringify(p) });
  }
  async function getDLQAudit() {
    if (!base) return { items: [] };
    return j(`${base}/ops/dlq/audit`);
  }
  async function getDLQ(params = {}) {
    if (!base) return { items: [] };
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    return j(`${base}/ops/dlq${q.toString() ? `?${q.toString()}` : ''}`);
  }
  async function getDLQRootCauses(params = {}) {
    if (!base) return { groups: [] };
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    return j(`${base}/ops/dlq/rootcauses${q.toString() ? `?${q.toString()}` : ''}`);
  }
  async function simulateDLQPolicy(item) {
    if (!base)
      return {
        enabled: true,
        dryRun: true,
        passKind: true,
        passSig: true,
        rateLimited: false,
        decision: 'DRY_RUN',
        reasons: [],
        normalizedSignature: 'sig',
      };
    return j(`${base}/ops/dlq/policy/simulate`, { method: 'POST', body: JSON.stringify({ item }) });
  }
  // Alerts & providers & watchdog
  async function listAlertRoutes() {
    return j(`${base}/alerts/routes`);
  }
  async function createAlertRoute(payload) {
    return j(`${base}/alerts/routes`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function deleteAlertRoute(id) {
    return j(`${base}/alerts/routes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  async function listAlertEvents() {
    return j(`${base}/alerts/events`);
  }
  async function testAlertEvent(payload) {
    return j(`${base}/alerts/events/test`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function getAlertCenterEvents(params = {}) {
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    return j(`${base}/alertcenter/events${q.toString() ? `?${q.toString()}` : ''}`);
  }
  async function getProviderUsage(windowMs = 60 * 60 * 1000) {
    return j(`${base}/providers/usage?windowMs=${windowMs}`);
  }
  async function setProviderLimit(provider, rpm) {
    return j(`${base}/providers/${encodeURIComponent(provider)}/limits`, {
      method: 'PUT',
      body: JSON.stringify({ rpm }),
    });
  }
  async function getPinHistory(route) {
    return j(`${base}/routing/pins/history${route ? `?route=${encodeURIComponent(route)}` : ''}`);
  }
  async function postRollback(route, reason) {
    return j(`${base}/routing/rollback`, {
      method: 'POST',
      body: JSON.stringify({ route, reason }),
    });
  }
  async function getWatchdogConfigs() {
    return j(`${base}/routing/watchdog/configs`);
  }
  async function putWatchdogConfigs(body) {
    return j(`${base}/routing/watchdog/configs`, { method: 'PUT', body: JSON.stringify(body) });
  }
  async function getWatchdogEvents() {
    return j(`${base}/routing/watchdog/events`);
  }
  // EvalOps
  async function getRunScorecard(runId) {
    return j(`${base}/eval/scorecards/run/${encodeURIComponent(runId)}`);
  }
  async function getPipelineBaseline(pipeline) {
    return j(`${base}/eval/scorecards/pipeline/${encodeURIComponent(pipeline)}/baseline`);
  }
  async function putPipelineBaseline(pipeline, body) {
    return j(`${base}/eval/scorecards/pipeline/${encodeURIComponent(pipeline)}/baseline`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
  async function getPipelineGate(pipeline) {
    return j(`${base}/eval/gates/pipeline/${encodeURIComponent(pipeline)}`);
  }
  async function checkGate(payload) {
    return j(`${base}/eval/gates/check`, { method: 'POST', body: JSON.stringify(payload) });
  }
  // Agent/HITL
  async function getAgentSteps(runId) {
    return j(`${base}/runs/${encodeURIComponent(runId)}/agent/steps`);
  }
  function streamAgent(runId, onStep) {
    const url = `${base}/runs/${encodeURIComponent(runId)}/agent/stream`;
    const es = new EventSource(url);
    const handler = (e) => {
      try {
        onStep(JSON.parse(e.data));
      } catch {}
    };
    es.addEventListener('step', handler);
    es.onerror = () => es.close();
    return () => {
      try {
        es.removeEventListener('step', handler);
        es.close();
      } catch {}
    };
  }
  async function actOnAgent(runId, payload) {
    return j(`${base}/runs/${encodeURIComponent(runId)}/agent/actions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
  // Incidents
  async function getIncidents(params = {}) {
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    if (params.windowMs) q.set('windowMs', String(params.windowMs));
    return j(`${base}/alertcenter/incidents${q.toString() ? `?${q.toString()}` : ''}`);
  }
  // Graph compare
  async function getRunGraphCompare(runId, baselineRunId) {
    if (!base)
      return {
        runId,
        baselineRunId: null,
        current: { nodes: [], edges: [] },
        baseline: { nodes: [], edges: [] },
      };
    const q = baselineRunId ? `?baseline=${encodeURIComponent(baselineRunId)}` : '';
    return j(`${base}/runs/${encodeURIComponent(runId)}/graph-compare${q}`);
  }
  async function getRunNodeRouting(runId, nodeId) {
    if (!base)
      return {
        nodeId,
        decision: { model: 'gpt-4o-mini', score: 0.72 },
        candidates: [],
        policy: { allow: true, rulePath: 'policy.default.allow', reasons: [] },
      };
    return j(
      `${base}/runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/routing`,
    );
  }
  async function getRunComparePrevious(runId) {
    if (!base) return { durationDeltaMs: 0, costDelta: 0, changedNodes: [] };
    return j(`${base}/runs/${encodeURIComponent(runId)}/compare/previous`);
  }
  async function validatePipeline(id, body) {
    if (!base) return { valid: true, errors: [] };
    return j(`${base}/pipelines/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  async function getProviders() {
    if (!base) return { items: [] };
    return j(`${base}/providers`);
  }
  async function testProvider(id) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/providers/${encodeURIComponent(id)}/test`, { method: 'POST' });
  }
  // Routing pin management
  async function getRoutingPins() {
    if (!base) return {};
    return j(`${base}/routing/pins`);
  }
  async function putRoutingPin(payload) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/routing/pin`, { method: 'PUT', body: JSON.stringify(payload) });
  }
  async function deleteRoutingPin(route) {
    if (!base) throw new Error('gatewayBase not configured');
    const q = new URLSearchParams({ route });
    return j(`${base}/routing/pin?${q.toString()}`, { method: 'DELETE' });
  }
  // Node-level details
  function useRunNodeMetrics(runId, nodeId) {
    const [metrics, setMetrics] = useState(null);
    useEffect(() => {
      if (!nodeId) {
        setMetrics(null);
        return;
      }
      (async () => {
        if (!base)
          return setMetrics({
            cpuPct: 22.3,
            memMB: 210,
            tokens: 12000,
            cost: 0.02,
            durationMs: 320,
            retries: 0,
          });
        try {
          const resp = await j(
            `${base}/runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/metrics`,
          );
          setMetrics(resp);
        } catch {
          setMetrics({
            cpuPct: 22.3,
            memMB: 210,
            tokens: 12000,
            cost: 0.02,
            durationMs: 320,
            retries: 0,
          });
        }
      })();
    }, [runId, nodeId]);
    return { metrics };
  }
  function useRunNodeEvidence(runId, nodeId) {
    const [evidence, setEvidence] = useState(null);
    useEffect(() => {
      if (!nodeId) {
        setEvidence(null);
        return;
      }
      (async () => {
        if (!base)
          return setEvidence({
            artifacts: [{ name: `${nodeId}-output.json`, digest: 'sha256:deadbeef', size: '12KB' }],
            traceId: 'trace-123-abc',
            provenance: { sbom: 'present', cosign: 'verified', slsa: 'attested' },
          });
        try {
          const resp = await j(
            `${base}/runs/${encodeURIComponent(runId)}/nodes/${encodeURIComponent(nodeId)}/evidence`,
          );
          setEvidence(resp);
        } catch {
          setEvidence({ artifacts: [], traceId: null, provenance: {} });
        }
      })();
    }, [runId, nodeId]);
    return { evidence };
  }
  async function getSecrets() {
    if (!base) return { items: [] };
    return j(`${base}/secrets`);
  }
  async function rotateSecret(id) {
    if (!base) throw new Error('gatewayBase not configured');
    return j(`${base}/secrets/${encodeURIComponent(id)}/rotate`, { method: 'POST' });
  }
  async function routingPreview(payload) {
    if (!base)
      return {
        decision: { model: 'gpt-4o-mini', confidence: 0.7, reason: 'dev stub' },
        candidates: [],
      };
    return j(`${base}/routing/preview`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function getPipelinesAPI() {
    if (!base) return { items: [] };
    return j(`${base}/pipelines`);
  }
  async function getPipeline(id) {
    if (!base) return { id, name: 'Mock', version: '0.0.0', owner: 'n/a', yaml: 'steps: []' };
    return j(`${base}/pipelines/${encodeURIComponent(id)}`);
  }
  async function planPipeline(id, body) {
    if (!base) return { changes: [], costEstimate: { delta: 0 } };
    return j(`${base}/pipelines/${encodeURIComponent(id)}/plan`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  async function getRunEvidence(runId) {
    if (!base) return { sbom: 'present', cosign: 'verified', slsa: 'attested', attestations: [] };
    return j(`${base}/runs/${encodeURIComponent(runId)}/evidence`);
  }
  async function supplychainVerify(payload) {
    if (!base)
      return {
        ok: true,
        cosign: { verified: true },
        slsa: { verified: true },
        sbom: { present: true },
      };
    return j(`${base}/supplychain/verify`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function supplychainSbomDiff(payload) {
    if (!base)
      return {
        diff: {
          added: [],
          removed: [],
          changed: [],
          summary: {
            addedCount: 0,
            removedCount: 0,
            changedCount: 0,
            highSeverityAdded: 0,
            mediumSeverityChanged: 0,
          },
        },
        policyBreach: false,
      };
    return j(`${base}/supplychain/sbom-diff`, { method: 'POST', body: JSON.stringify(payload) });
  }
  async function getServingMetrics() {
    if (!base) return { summary: { qDepth: 2, batch: 4, kvHit: 0.8 }, series: [] };
    return j(`${base}/serving/metrics`);
  }
  async function getCITrends(params = {}) {
    if (!base) return { buckets: [] };
    const q = new URLSearchParams();
    if (params.sinceMs) q.set('sinceMs', String(params.sinceMs));
    if (params.stepMs) q.set('stepMs', String(params.stepMs));
    return j(`${base}/ci/annotations/trends${q.toString() ? `?${q.toString()}` : ''}`);
  }
  return useMemo(
    () => ({
      // hooks
      useSummary,
      useRuns,
      usePipelines,
      useAutonomy,
      useRecipes,
      useObservability,
      useCosts,
      useTickets,
      useRun,
      useRunGraph,
      useRunLogs,
      usePolicyDecisions,
      useArtifacts,
      useRunNodeMetrics,
      useRunNodeEvidence,
      // actions
      patchAutonomy,
      getBudgets,
      putBudgets,
      postTickets,
      postPolicyExplain,
      getCIAnnotations,
      getCIAnnotationsGlobal,
      getRunGraphCompare,
      getRunNodeRouting,
      getSecrets,
      rotateSecret,
      getRoutingPins,
      putRoutingPin,
      deleteRoutingPin,
      routingPreview,
      getPipelinesAPI,
      getPipeline,
      planPipeline,
      getRunEvidence,
      getServingMetrics,
      getCITrends,
      // new APIs
      getSLOSummaryByTenant,
      getSLOTimeSeriesByTenant,
      getTenantCostSummary,
      getTenantCostSeries,
      getDLQSignatures,
      getDLQSignatureTimeSeries,
      getDLQPolicy,
      putDLQPolicy,
      getDLQAudit,
      getDLQ,
      getDLQRootCauses,
      simulateDLQPolicy,
      getTenantBudget,
      putTenantBudget,
      getTenantCostForecast,
      getTenantCostAnomalies,
      getModelCostAnomalies,
      listAlertRoutes,
      createAlertRoute,
      deleteAlertRoute,
      listAlertEvents,
      testAlertEvent,
      getAlertCenterEvents,
      getProviderUsage,
      setProviderLimit,
      getPinHistory,
      postRollback,
      getWatchdogConfigs,
      putWatchdogConfigs,
      getWatchdogEvents,
      getRunScorecard,
      getPipelineBaseline,
      putPipelineBaseline,
      getPipelineGate,
      checkGate,
      getAgentSteps,
      streamAgent,
      actOnAgent,
      getIncidents,
    }),
    [],
  );
}
