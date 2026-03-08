"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCommandStatusContext = void 0;
exports.CommandStatusProvider = CommandStatusProvider;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = __importDefault(require("react"));
const state_1 = require("./state");
const CommandStatusContext = react_1.default.createContext(undefined);
const fetchStatus = async (key, signal) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : undefined;
    const response = await fetch(state_1.statusEndpoints[key], {
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
        throw new Error(`Failed to load ${key} status (${response.status})`);
    }
    const data = await response.json();
    return data;
};
function CommandStatusProvider({ children }) {
    const [state, dispatch] = react_1.default.useReducer(state_1.statusReducer, state_1.initialState);
    const load = react_1.default.useCallback(() => {
        const controller = new AbortController();
        dispatch({ type: 'FETCH_START' });
        Object.keys(state_1.statusEndpoints).forEach(async (key) => {
            try {
                const payload = await fetchStatus(key, controller.signal);
                dispatch({ type: 'FETCH_SUCCESS', key, payload });
            }
            catch (error) {
                dispatch({ type: 'FETCH_FAILURE', key, error: error?.message || 'Unknown error' });
            }
        });
        return () => controller.abort();
    }, []);
    react_1.default.useEffect(() => {
        const abort = load();
        return abort;
    }, [load]);
    const value = react_1.default.useMemo(() => ({ state, refresh: load }), [state, load]);
    return <CommandStatusContext.Provider value={value}>{children}</CommandStatusContext.Provider>;
}
const useCommandStatusContext = () => {
    const ctx = react_1.default.useContext(CommandStatusContext);
    if (!ctx) {
        throw new Error('useCommandStatusContext must be used within CommandStatusProvider');
    }
    return ctx;
};
exports.useCommandStatusContext = useCommandStatusContext;
