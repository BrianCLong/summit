"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseMockPRs = exports.prTriageEnums = void 0;
exports.usePRTriageAdapter = usePRTriageAdapter;
const react_1 = require("react");
const types_1 = require("./types");
// ── Helpers ───────────────────────────────────────────────────────────────────
const ago = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const cleanConvergence = (behind = 0) => ({
    mergesCleanly: true,
    behindByCommits: behind,
    deprecatedBranches: [],
    computedAt: ago(2),
});
const conflictConvergence = (deprecated = []) => ({
    mergesCleanly: false,
    behindByCommits: 14,
    deprecatedBranches: deprecated,
    computedAt: ago(5),
});
const sampleDiff = (path, adds, dels) => ({
    path,
    additions: adds,
    deletions: dels,
    patch: `@@ -1,${dels} +1,${adds} @@\n${Array.from({ length: dels }, (_, i) => `-const old_${i} = ${i}`).join('\n')}\n${Array.from({ length: adds }, (_, i) => `+const new_${i} = ${i}`).join('\n')}`,
});
// ── Base mock data ────────────────────────────────────────────────────────────
const baseMockPRs = [
    {
        id: 'pr-101',
        number: 101,
        title: 'feat: add branch convergence metrics API',
        author: 'dana.analyst',
        baseBranch: 'main',
        headBranch: 'feature/branch-convergence',
        status: 'merge-ready',
        priority: 'high',
        createdAt: ago(120),
        updatedAt: ago(15),
        assignee: 'alex.ops',
        labels: ['feature', 'api'],
        description: 'Exposes a `/convergence` endpoint returning merge-readiness and deprecated-branch lists per PR.',
        riskChecks: [
            { id: 'policy-violation', label: 'Policy violations', passed: true, riskLevel: 'none' },
            { id: 'missing-timestamps', label: 'Missing timestamps', passed: true, riskLevel: 'none' },
            { id: 'missing-provenance', label: 'Provenance evidence', passed: true, riskLevel: 'none' },
            { id: 'governance-gate-blocked', label: 'Governance gate', passed: true, riskLevel: 'none' },
            { id: 'no-owner-approval', label: 'Owner approval', passed: true, riskLevel: 'none' },
            { id: 'stale-review', label: 'Stale review', passed: true, riskLevel: 'none' },
            { id: 'breaking-change', label: 'Breaking change risk', passed: true, riskLevel: 'none' },
        ],
        diffFiles: [
            sampleDiff('apps/api/src/routes/convergence.ts', 82, 0),
            sampleDiff('apps/api/src/routes/convergence.test.ts', 45, 0),
        ],
        convergence: cleanConvergence(2),
    },
    {
        id: 'pr-102',
        number: 102,
        title: 'fix: resolve merge conflict in governance gate middleware',
        author: 'bob.engineer',
        baseBranch: 'main',
        headBranch: 'fix/governance-conflict',
        status: 'conflict',
        priority: 'critical',
        createdAt: ago(240),
        updatedAt: ago(90),
        labels: ['bug', 'governance'],
        description: 'Resolves the conflict introduced by PR #99 which touched the same OPA rule file.',
        riskChecks: [
            { id: 'policy-violation', label: 'Policy violations', passed: false, riskLevel: 'high', detail: 'OPA rule EU-482 conflict detected in middleware' },
            { id: 'missing-timestamps', label: 'Missing timestamps', passed: true, riskLevel: 'none' },
            { id: 'missing-provenance', label: 'Provenance evidence', passed: false, riskLevel: 'medium', detail: 'Commit 3f9a is unsigned' },
            { id: 'governance-gate-blocked', label: 'Governance gate', passed: false, riskLevel: 'critical', detail: 'Blocked: merge window closed (Fri 17:00 UTC freeze)' },
            { id: 'no-owner-approval', label: 'Owner approval', passed: true, riskLevel: 'none' },
            { id: 'stale-review', label: 'Stale review', passed: false, riskLevel: 'low', detail: 'Approval from bob.engineer is 72h old; re-review required' },
            { id: 'breaking-change', label: 'Breaking change risk', passed: true, riskLevel: 'none' },
        ],
        diffFiles: [
            sampleDiff('server/middleware/governance.ts', 12, 8),
            sampleDiff('server/middleware/governance.test.ts', 6, 2),
        ],
        convergence: conflictConvergence(['fix/old-governance-patch', 'wip/opa-tweak']),
    },
    {
        id: 'pr-103',
        number: 103,
        title: 'chore: upgrade Vite to 6.x and update plugin configs',
        author: 'carol.devops',
        baseBranch: 'main',
        headBranch: 'chore/vite-6-upgrade',
        status: 'needs-owner-review',
        priority: 'medium',
        createdAt: ago(60),
        updatedAt: ago(10),
        assignee: 'dana.analyst',
        labels: ['chore', 'deps'],
        description: 'Vite 6 drops some legacy plugins. This PR migrates config and removes the deprecated `ssr` flag.',
        riskChecks: [
            { id: 'policy-violation', label: 'Policy violations', passed: true, riskLevel: 'none' },
            { id: 'missing-timestamps', label: 'Missing timestamps', passed: true, riskLevel: 'none' },
            { id: 'missing-provenance', label: 'Provenance evidence', passed: true, riskLevel: 'none' },
            { id: 'governance-gate-blocked', label: 'Governance gate', passed: true, riskLevel: 'none' },
            { id: 'no-owner-approval', label: 'Owner approval', passed: false, riskLevel: 'high', detail: 'CODEOWNERS: apps/web requires review from @web-platform-team' },
            { id: 'stale-review', label: 'Stale review', passed: true, riskLevel: 'none' },
            { id: 'breaking-change', label: 'Breaking change risk', passed: false, riskLevel: 'medium', detail: 'build output path changed; downstream consumers may break' },
        ],
        diffFiles: [
            sampleDiff('apps/web/vite.config.ts', 24, 18),
            sampleDiff('package.json', 3, 3),
        ],
        convergence: cleanConvergence(0),
    },
    {
        id: 'pr-104',
        number: 104,
        title: 'feat: PR triage workspace – queue UI + diff preview',
        author: 'eve.frontender',
        baseBranch: 'main',
        headBranch: 'claude/add-pr-triage-workspace-23UtZ',
        status: 'blocked-on-governance',
        priority: 'high',
        createdAt: ago(30),
        updatedAt: ago(5),
        labels: ['feature', 'ui', 'governance'],
        description: 'Adds the PR triage workspace: queue view, diff preview, risk checklist, and branch convergence integration.',
        riskChecks: [
            { id: 'policy-violation', label: 'Policy violations', passed: true, riskLevel: 'none' },
            { id: 'missing-timestamps', label: 'Missing timestamps', passed: false, riskLevel: 'low', detail: 'PR description is missing "Evidence Bundle" section (S-AOS §5)' },
            { id: 'missing-provenance', label: 'Provenance evidence', passed: false, riskLevel: 'medium', detail: 'No SLSA provenance attestation attached to release artifact' },
            { id: 'governance-gate-blocked', label: 'Governance gate', passed: false, riskLevel: 'critical', detail: 'Security review required for new UI surface (S-AOS §6)' },
            { id: 'no-owner-approval', label: 'Owner approval', passed: false, riskLevel: 'high', detail: 'Requires approval from @security-governance-team' },
            { id: 'stale-review', label: 'Stale review', passed: true, riskLevel: 'none' },
            { id: 'breaking-change', label: 'Breaking change risk', passed: true, riskLevel: 'none' },
        ],
        diffFiles: [
            sampleDiff('apps/web/src/features/pr-triage/types.ts', 90, 0),
            sampleDiff('apps/web/src/features/pr-triage/PRTriagePage.tsx', 320, 0),
            sampleDiff('apps/web/src/App.tsx', 5, 1),
        ],
        convergence: cleanConvergence(1),
    },
    {
        id: 'pr-105',
        number: 105,
        title: 'docs: update AGENTS.md with triage workspace runbook',
        author: 'frank.pm',
        baseBranch: 'main',
        headBranch: 'docs/triage-runbook',
        status: 'merge-ready',
        priority: 'low',
        createdAt: ago(180),
        updatedAt: ago(45),
        assignee: 'eve.frontender',
        labels: ['docs'],
        description: 'Runbook for the PR triage workspace covering daily workflows and escalation paths.',
        riskChecks: [
            { id: 'policy-violation', label: 'Policy violations', passed: true, riskLevel: 'none' },
            { id: 'missing-timestamps', label: 'Missing timestamps', passed: true, riskLevel: 'none' },
            { id: 'missing-provenance', label: 'Provenance evidence', passed: true, riskLevel: 'none' },
            { id: 'governance-gate-blocked', label: 'Governance gate', passed: true, riskLevel: 'none' },
            { id: 'no-owner-approval', label: 'Owner approval', passed: true, riskLevel: 'none' },
            { id: 'stale-review', label: 'Stale review', passed: true, riskLevel: 'none' },
            { id: 'breaking-change', label: 'Breaking change risk', passed: true, riskLevel: 'none' },
        ],
        diffFiles: [sampleDiff('AGENTS.md', 55, 2)],
        convergence: cleanConvergence(0),
    },
];
exports.baseMockPRs = baseMockPRs;
// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
    prs: 'prTriage.prs.v1',
    decisions: 'prTriage.decisions.v1',
};
const loadFromStorage = (key, fallback) => {
    if (typeof window === 'undefined')
        return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw)
        return fallback;
    try {
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
};
// ── Hook ──────────────────────────────────────────────────────────────────────
function usePRTriageAdapter() {
    const [prs, setPRs] = (0, react_1.useState)(() => loadFromStorage(STORAGE_KEYS.prs, baseMockPRs));
    const [decisions, setDecisions] = (0, react_1.useState)(() => loadFromStorage(STORAGE_KEYS.decisions, []));
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(STORAGE_KEYS.prs, JSON.stringify(prs));
    }, [prs]);
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(STORAGE_KEYS.decisions, JSON.stringify(decisions));
    }, [decisions]);
    const list = (0, react_1.useCallback)(async (filters = types_1.defaultPRTriageFilters) => {
        return prs.filter(pr => {
            const statusMatch = filters.status === 'all' || pr.status === filters.status;
            const priorityMatch = filters.priority === 'all' || pr.priority === filters.priority;
            const assigneeMatch = !filters.assignee ||
                pr.assignee?.toLowerCase().includes(filters.assignee.toLowerCase());
            return statusMatch && priorityMatch && assigneeMatch;
        });
    }, [prs]);
    const get = (0, react_1.useCallback)(async (id) => prs.find(pr => pr.id === id), [prs]);
    const act = (0, react_1.useCallback)(async (id, action, opts = {}) => {
        const decision = {
            id: `${id}-${Date.now()}`,
            prId: id,
            action,
            comment: opts.comment,
            assignedTo: opts.assignedTo,
            decidedAt: new Date().toISOString(),
            decidedBy: 'analyst@example.com',
        };
        if (action === 'assign' && opts.assignedTo) {
            setPRs(prev => prev.map(pr => pr.id === id ? { ...pr, assignee: opts.assignedTo } : pr));
        }
        setDecisions(prev => [...prev, decision]);
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        setPRs(baseMockPRs);
        setDecisions([]);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEYS.prs);
            window.localStorage.removeItem(STORAGE_KEYS.decisions);
        }
    }, []);
    return (0, react_1.useMemo)(() => ({ list, get, act, decisions, reset }), [list, get, act, decisions, reset]);
}
// ── Helpers exported for tests ────────────────────────────────────────────────
exports.prTriageEnums = {
    statuses: ['merge-ready', 'conflict', 'needs-owner-review', 'blocked-on-governance'],
    priorities: ['critical', 'high', 'medium', 'low'],
};
