"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEARCH_SESSION_STORAGE_VERSION = exports.SEARCH_SESSION_STORAGE_KEY = void 0;
exports.useSearchSessions = useSearchSessions;
const react_1 = require("react");
exports.SEARCH_SESSION_STORAGE_KEY = 'intelgraph.searchSessions';
exports.SEARCH_SESSION_STORAGE_VERSION = 1;
const createSessionId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const cloneFilters = (filters) => ({
    entityTypes: [...filters.entityTypes],
    relationshipTypes: [...filters.relationshipTypes],
    dateRange: { ...filters.dateRange },
    confidenceRange: { ...filters.confidenceRange },
    tags: [...filters.tags],
    sources: [...filters.sources],
});
const normalizeTimeWindow = (timeWindow, filters) => ({
    start: timeWindow?.start ?? filters.dateRange.start ?? '',
    end: timeWindow?.end ?? filters.dateRange.end ?? '',
});
const buildSession = (name, createDefaultFilters, base) => {
    const filters = cloneFilters(base?.filters ?? createDefaultFilters());
    return {
        id: base?.id ?? createSessionId(),
        name,
        query: base?.query ?? '',
        filters,
        timeWindow: normalizeTimeWindow(base?.timeWindow, filters),
        selectedEntityId: base?.selectedEntityId,
        lastUpdated: base?.lastUpdated ?? new Date().toISOString(),
        stale: base?.stale ?? false,
    };
};
const loadFromStorage = (persist, createDefaultFilters) => {
    const defaultSession = buildSession('Session 1', createDefaultFilters);
    if (!persist || typeof window === 'undefined') {
        return {
            sessions: [defaultSession],
            activeSessionId: defaultSession.id,
            restoredFromStorage: false,
        };
    }
    const raw = window.localStorage.getItem(exports.SEARCH_SESSION_STORAGE_KEY);
    if (!raw) {
        return {
            sessions: [defaultSession],
            activeSessionId: defaultSession.id,
            restoredFromStorage: false,
        };
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed.version !== exports.SEARCH_SESSION_STORAGE_VERSION ||
            !parsed.sessions ||
            parsed.sessions.length === 0) {
            return {
                sessions: [defaultSession],
                activeSessionId: defaultSession.id,
                restoredFromStorage: false,
            };
        }
        const restoredSessions = parsed.sessions.map((session, index) => buildSession(session.name ?? `Session ${index + 1}`, createDefaultFilters, {
            ...session,
            stale: true,
        }));
        const activeSessionId = parsed.activeSessionId && restoredSessions.some(s => s.id === parsed.activeSessionId)
            ? parsed.activeSessionId
            : restoredSessions[0].id;
        return {
            sessions: restoredSessions,
            activeSessionId,
            restoredFromStorage: true,
        };
    }
    catch {
        return {
            sessions: [defaultSession],
            activeSessionId: defaultSession.id,
            restoredFromStorage: false,
        };
    }
};
function useSearchSessions(persist, createDefaultFilters) {
    const defaultFiltersRef = (0, react_1.useRef)(createDefaultFilters);
    const [state, setState] = (0, react_1.useState)(() => loadFromStorage(persist, defaultFiltersRef.current));
    const activeSession = (0, react_1.useMemo)(() => state.sessions.find(session => session.id === state.activeSessionId), [state.activeSessionId, state.sessions]);
    (0, react_1.useEffect)(() => {
        if (!persist || typeof window === 'undefined') {
            return;
        }
        const payload = {
            version: exports.SEARCH_SESSION_STORAGE_VERSION,
            activeSessionId: state.activeSessionId,
            sessions: state.sessions.map(session => ({
                ...session,
                filters: cloneFilters(session.filters),
                timeWindow: { ...session.timeWindow },
            })),
        };
        window.localStorage.setItem(exports.SEARCH_SESSION_STORAGE_KEY, JSON.stringify(payload));
    }, [persist, state.activeSessionId, state.sessions]);
    const selectSession = (0, react_1.useCallback)((id) => {
        setState(prev => ({
            ...prev,
            activeSessionId: id,
        }));
    }, []);
    const addSession = (0, react_1.useCallback)(() => {
        setState(prev => {
            const label = `Session ${prev.sessions.length + 1}`;
            const next = buildSession(label, defaultFiltersRef.current);
            return {
                ...prev,
                sessions: [...prev.sessions, next],
                activeSessionId: next.id,
                restoredFromStorage: prev.restoredFromStorage,
            };
        });
    }, []);
    const closeSession = (0, react_1.useCallback)((id) => {
        setState(prev => {
            if (prev.sessions.length === 1) {
                const replacement = buildSession('Session 1', defaultFiltersRef.current);
                return {
                    sessions: [replacement],
                    activeSessionId: replacement.id,
                    restoredFromStorage: prev.restoredFromStorage,
                };
            }
            const remaining = prev.sessions.filter(session => session.id !== id);
            const nextActive = prev.activeSessionId === id ? remaining[0].id : prev.activeSessionId;
            return {
                ...prev,
                sessions: remaining,
                activeSessionId: nextActive,
            };
        });
    }, []);
    const updateActiveSession = (0, react_1.useCallback)((updates) => {
        setState(prev => {
            const nextSessions = prev.sessions.map(session => {
                if (session.id !== prev.activeSessionId) {
                    return session;
                }
                const mergedFilters = updates.filters
                    ? cloneFilters(updates.filters)
                    : session.filters;
                return {
                    ...session,
                    ...updates,
                    filters: mergedFilters,
                    timeWindow: normalizeTimeWindow(updates.timeWindow, mergedFilters),
                    lastUpdated: updates.lastUpdated ?? new Date().toISOString(),
                };
            });
            return { ...prev, sessions: nextSessions };
        });
    }, []);
    const duplicateSession = (0, react_1.useCallback)((id) => {
        setState(prev => {
            const source = prev.sessions.find(session => session.id === id);
            if (!source) {
                return prev;
            }
            const copy = buildSession(`${source.name} Copy`, defaultFiltersRef.current, {
                ...source,
                id: undefined,
                stale: false,
            });
            return {
                ...prev,
                sessions: [...prev.sessions, copy],
                activeSessionId: copy.id,
            };
        });
    }, []);
    const resetSession = (0, react_1.useCallback)((id) => {
        setState(prev => {
            const nextSessions = prev.sessions.map(session => session.id === id
                ? buildSession(session.name, defaultFiltersRef.current, { id: session.id })
                : session);
            return { ...prev, sessions: nextSessions };
        });
    }, []);
    const importSession = (0, react_1.useCallback)((raw) => {
        try {
            const parsed = JSON.parse(raw);
            const sessionPayload = parsed.sessions?.[0] || parsed.session || parsed;
            const imported = buildSession(sessionPayload.name || 'Imported Session', defaultFiltersRef.current, { ...sessionPayload, stale: true });
            setState(prev => ({
                ...prev,
                sessions: [...prev.sessions, imported],
                activeSessionId: imported.id,
            }));
            return true;
        }
        catch (e) {
            console.warn('Failed to import search session', e);
            return false;
        }
    }, []);
    const exportSession = (0, react_1.useCallback)((id) => {
        const session = state.sessions.find(s => s.id === id);
        if (!session) {
            return '';
        }
        const payload = {
            version: exports.SEARCH_SESSION_STORAGE_VERSION,
            session,
        };
        const json = JSON.stringify(payload, null, 2);
        if (typeof navigator !== 'undefined' &&
            navigator.clipboard &&
            navigator.clipboard.writeText) {
            navigator.clipboard.writeText(json).catch(() => {
                /* non-blocking */
            });
        }
        return json;
    }, [state.sessions]);
    const markSessionRefreshed = (0, react_1.useCallback)((id) => {
        setState(prev => ({
            ...prev,
            sessions: prev.sessions.map(session => session.id === id
                ? {
                    ...session,
                    stale: false,
                    lastUpdated: new Date().toISOString(),
                }
                : session),
        }));
    }, []);
    return {
        sessions: state.sessions,
        activeSession,
        activeSessionId: state.activeSessionId,
        restoredFromStorage: state.restoredFromStorage,
        addSession,
        closeSession,
        selectSession,
        duplicateSession,
        resetSession,
        updateActiveSession,
        importSession,
        exportSession,
        markSessionRefreshed,
    };
}
