"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEnums = void 0;
exports.useQueueAdapter = useQueueAdapter;
const react_1 = require("react");
const types_1 = require("./types");
const STORAGE_KEYS = {
    decisions: 'reviewQueue.decisions.v1',
    items: 'reviewQueue.items.v1',
};
const baseMockItems = [
    {
        id: 'rq-1001',
        title: 'Entity merge review: K. Santiago ↔ K. Santos',
        type: 'entity-diff',
        priority: 'critical',
        assignee: 'Dana Analyst',
        source: 'Entity Resolver',
        context: 'High-similarity merge flagged for manual review',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        tags: ['entity', 'merge'],
        preview: {
            entityDiff: {
                before: 'Name: K. Santiago\nEmail: ksanti@example.com\nIP: 10.0.0.12',
                after: 'Name: K. Santos\nEmail: ksantos@example.com\nIP: 10.0.0.12',
                highlights: ['Name mismatch', 'Email mismatch', 'Shared IP'],
            },
        },
    },
    {
        id: 'rq-1002',
        title: 'Evidence snippet: anomalous fund transfer',
        type: 'evidence',
        priority: 'high',
        assignee: 'Unassigned',
        source: 'Signals',
        context: 'Transfer exceeds peer baseline by 4.3x',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        tags: ['finance', 'anomaly'],
        preview: {
            snippet: 'Wire transfer of $420,000 from account 4411 → 8841 within 8 minutes of credential reset.',
        },
    },
    {
        id: 'rq-1003',
        title: 'Policy warning: export control conflict',
        type: 'policy',
        priority: 'medium',
        assignee: 'Alex Ops',
        source: 'OPA',
        context: 'Request routes restricted dataset to non-cleared tenant',
        status: 'open',
        createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        tags: ['policy', 'export'],
        preview: {
            policyWarning: 'Rule EU-482 triggered: cross-border movement of controlled intel.',
        },
    },
    {
        id: 'rq-1004',
        title: 'Resolved sample: duplicate device fingerprint',
        type: 'evidence',
        priority: 'low',
        assignee: 'Dana Analyst',
        source: 'DeviceGraph',
        context: 'Auto-resolved yesterday',
        status: 'approved',
        createdAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
        lastDecisionAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        preview: {
            snippet: 'Fingerprint fpr-9921 confirmed benign after 24h cooling period.',
        },
    },
];
const statusFromAction = {
    approve: 'approved',
    reject: 'rejected',
    defer: 'deferred',
};
const resolveStatusFilter = (status) => {
    if (status === 'all')
        return undefined;
    if (status === 'open')
        return ['open'];
    return ['approved', 'rejected', 'deferred'];
};
const hydrateItems = (persisted) => {
    if (persisted && persisted.length)
        return persisted;
    return baseMockItems;
};
const hydrateDecisions = () => {
    if (typeof window === 'undefined')
        return [];
    const raw = window.localStorage.getItem(STORAGE_KEYS.decisions);
    if (!raw)
        return [];
    try {
        return JSON.parse(raw);
    }
    catch (error) {
        console.warn('Failed to parse queue decisions', error);
        return [];
    }
};
function useQueueAdapter() {
    const [items, setItems] = (0, react_1.useState)(() => {
        if (typeof window === 'undefined')
            return baseMockItems;
        const raw = window.localStorage.getItem(STORAGE_KEYS.items);
        if (!raw)
            return baseMockItems;
        try {
            return hydrateItems(JSON.parse(raw));
        }
        catch (error) {
            console.warn('Failed to parse queue items', error);
            return baseMockItems;
        }
    });
    const [decisions, setDecisions] = (0, react_1.useState)(() => hydrateDecisions());
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
    }, [items]);
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        window.localStorage.setItem(STORAGE_KEYS.decisions, JSON.stringify(decisions));
    }, [decisions]);
    const list = (0, react_1.useCallback)(async (filters = types_1.defaultQueueFilters) => {
        const resolvedStatus = resolveStatusFilter(filters.status);
        return items.filter(item => {
            const statusMatch = resolvedStatus
                ? resolvedStatus.includes(item.status)
                : true;
            const typeMatch = filters.type === 'all' || item.type === filters.type;
            const priorityMatch = filters.priority === 'all' || item.priority === filters.priority;
            const assigneeMatch = filters.assignee === 'all' || item.assignee === filters.assignee;
            return statusMatch && typeMatch && priorityMatch && assigneeMatch;
        });
    }, [items]);
    const get = (0, react_1.useCallback)(async (id) => items.find(item => item.id === id), [items]);
    const act = (0, react_1.useCallback)(async (id, action, payload = {}) => {
        const target = items.find(item => item.id === id);
        if (!target)
            return undefined;
        const decision = {
            id: `${id}-${Date.now()}`,
            itemId: id,
            action,
            reason: payload.reason,
            decidedAt: new Date().toISOString(),
            decidedBy: payload.decidedBy || 'analyst@example.com',
            metadata: {
                adapter: 'local-mock',
                version: '1.0.0',
            },
        };
        const nextStatus = statusFromAction[action];
        const updatedItem = {
            ...target,
            status: nextStatus,
            lastDecisionAt: decision.decidedAt,
        };
        setItems(prev => prev.map(item => (item.id === id ? updatedItem : item)));
        setDecisions(prev => [...prev, decision]);
        return { item: updatedItem, decision };
    }, [items]);
    const reset = (0, react_1.useCallback)(() => {
        setItems(baseMockItems);
        setDecisions([]);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEYS.items);
            window.localStorage.removeItem(STORAGE_KEYS.decisions);
        }
    }, []);
    return (0, react_1.useMemo)(() => ({
        list,
        get,
        act,
        decisions,
        reset,
    }), [act, decisions, get, list, reset]);
}
exports.queueEnums = {
    types: ['entity-diff', 'evidence', 'policy'],
    priorities: ['critical', 'high', 'medium', 'low'],
};
