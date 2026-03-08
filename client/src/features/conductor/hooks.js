"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRolloutSteps = useRolloutSteps;
exports.useCanaryHealth = useCanaryHealth;
exports.useBudgetDenials = useBudgetDenials;
exports.useProvenanceRoot = useProvenanceRoot;
const react_1 = require("react");
function useData(fetcher, deps = [], opts = {}) {
    const [data, setData] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [updatedAt, setUpdatedAt] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        let alive = true;
        async function run() {
            try {
                setLoading(true);
                const res = await fetcher();
                if (!alive)
                    return;
                setData(res);
                setUpdatedAt(Date.now());
                setError(null);
            }
            catch (e) {
                if (!alive)
                    return;
                setError(e);
            }
            finally {
                if (alive)
                    setLoading(false);
            }
        }
        run();
        let t;
        if (opts.refreshMs)
            t = setInterval(run, opts.refreshMs);
        return () => {
            alive = false;
            if (t)
                clearInterval(t);
        };
    }, deps);
    return { data, error, loading, updatedAt };
}
function useRolloutSteps() {
    const api = import.meta.env.VITE_ROLLOUTS_API || '';
    return useData(async () => {
        if (api) {
            const r = await fetch(api);
            if (!r.ok)
                throw new Error('rollouts api error');
            return (await r.json());
        }
        return [
            { weight: 10, status: 'completed', analysis: 'pass' },
            { weight: 25, status: 'completed', analysis: 'pass' },
            { weight: 50, status: 'running', analysis: 'running' },
            { weight: 100, status: 'pending' },
        ];
    }, [api], { refreshMs: 15000 });
}
function useCanaryHealth(target) {
    const prom = import.meta.env.VITE_PROM_URL || '';
    return useData(async () => {
        if (prom) {
            const q1 = `avg_over_time(probe_success{job="blackbox",instance="${target}"}[5m])`;
            const q2 = `histogram_quantile(0.95,sum(rate(probe_http_duration_seconds_bucket{job="blackbox",instance="${target}",phase="first_byte"}[5m])) by (le))`;
            const [a1, a2] = await Promise.all([
                fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q1)}`).then((r) => r.json()),
                fetch(`${prom}/api/v1/query?query=${encodeURIComponent(q2)}`).then((r) => r.json()),
            ]);
            const availability = Number(a1.data?.result?.[0]?.value?.[1] || 0);
            const p95TtfbMs = Number(a2.data?.result?.[0]?.value?.[1] || 0) * 1000;
            return { availability, p95TtfbMs, errorRate: 0 };
        }
        return { availability: 0.997, p95TtfbMs: 870, errorRate: 0.003 };
    }, [prom, target], { refreshMs: 30000 });
}
function useBudgetDenials() {
    const api = import.meta.env.VITE_POLICY_API || '';
    return useData(async () => {
        if (api) {
            const r = await fetch(`${api}/denials?window=24h`);
            if (!r.ok)
                throw new Error('policy api error');
            return (await r.json());
        }
        return [
            {
                time: new Date().toISOString(),
                tenant: 'acme',
                caseId: '42',
                reason: 'Daily budget exceeded for LLM_HEAVY',
                rule: 'budget.daily.usd',
            },
        ];
    }, [api], { refreshMs: 60000 });
}
function useProvenanceRoot() {
    const api = import.meta.env.VITE_PROV_API || '';
    return useData(async () => {
        if (api) {
            const r = await fetch(`${api}/latest`);
            if (!r.ok)
                throw new Error('prov api error');
            return await r.json();
        }
        return {
            id: 'root',
            label: 'Runbook R1: Rapid Attribution',
            children: [
                { id: '1', label: 'STIX feed → claim-abc123' },
                { id: '2', label: 'Normalize (map_to_canonical) → claim-def456' },
                { id: '3', label: 'Graph upsert → claim-ghi789' },
                { id: '4', label: 'Narrative build (citations: 5)' },
            ],
        };
    }, [api]);
}
