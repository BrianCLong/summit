"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialState = exports.deriveChecklistStatus = exports.statusEndpoints = void 0;
exports.statusReducer = statusReducer;
const date_fns_1 = require("date-fns");
const config_1 = __importDefault(require("@/config"));
exports.statusEndpoints = {
    governance: `${config_1.default.apiBaseUrl}/internal/governance/status`,
    agents: `${config_1.default.apiBaseUrl}/internal/agents/status`,
    ci: `${config_1.default.apiBaseUrl}/internal/ci/status`,
    releases: `${config_1.default.apiBaseUrl}/internal/releases/status`,
    zk: `${config_1.default.apiBaseUrl}/internal/zk/status`,
    streaming: `${config_1.default.apiBaseUrl}/internal/streaming/status`,
    ga: `${config_1.default.apiBaseUrl}/internal/ga/status`,
};
const severityRank = { green: 0, yellow: 1, red: 2 };
const deriveChecklistStatus = (checklist) => {
    if (!checklist || checklist.length === 0)
        return 'red';
    if (checklist.some(item => item.status === 'red'))
        return 'red';
    if (checklist.some(item => item.status === 'yellow'))
        return 'yellow';
    return 'green';
};
exports.deriveChecklistStatus = deriveChecklistStatus;
const normalizePayload = (key, payload) => {
    const fallback = {
        system: key,
        status: 'red',
        summary: 'Status unavailable',
        updatedAt: new Date().toISOString(),
        evidence: [],
    };
    const merged = {
        ...fallback,
        ...payload,
        status: payload?.status ?? fallback.status,
        evidence: payload?.evidence ?? fallback.evidence,
    };
    if (key === 'ga' && payload?.checklist) {
        merged.status = (0, exports.deriveChecklistStatus)(payload.checklist);
    }
    return merged;
};
const computeBanner = (statuses) => {
    const values = Object.values(statuses);
    if (!values.length) {
        return {
            level: 'red',
            headline: 'Status unavailable',
            detail: 'No telemetry returned; fail closed until refreshed.',
        };
    }
    const worst = values.reduce((current, candidate) => {
        if (!current)
            return candidate;
        return severityRank[candidate.status] > severityRank[current.status] ? candidate : current;
    }, undefined);
    if (!worst) {
        return {
            level: 'red',
            headline: 'Status unavailable',
            detail: 'No telemetry returned; fail closed until refreshed.',
        };
    }
    const detail = `Escalated from ${values.length} systems • Updated ${(0, date_fns_1.formatDistanceToNow)(new Date(worst.updatedAt), {
        addSuffix: true,
    })}`;
    const headline = worst.status === 'red'
        ? 'Critical condition detected'
        : worst.status === 'yellow'
            ? 'At-risk signals detected'
            : 'Systems nominal';
    return {
        level: worst.status,
        headline,
        detail,
    };
};
exports.initialState = {
    statuses: {},
    loading: false,
    banner: {
        level: 'red',
        headline: 'Status unavailable',
        detail: 'Telemetry has not yet been retrieved.',
    },
};
function statusReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: undefined };
        case 'FETCH_SUCCESS': {
            const statuses = { ...state.statuses, [action.key]: normalizePayload(action.key, action.payload) };
            return {
                ...state,
                loading: false,
                statuses,
                lastUpdated: new Date().toISOString(),
                banner: computeBanner(statuses),
            };
        }
        case 'FETCH_FAILURE': {
            const statuses = { ...state.statuses, [action.key]: normalizePayload(action.key) };
            return {
                ...state,
                loading: false,
                error: action.error,
                statuses,
                banner: computeBanner(statuses),
            };
        }
        case 'RESET_ERRORS':
            return { ...state, error: undefined };
        default:
            return state;
    }
}
