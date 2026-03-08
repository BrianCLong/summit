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
exports.useWorkspaceLayout = exports.WorkspaceContext = void 0;
exports.WorkspaceProvider = WorkspaceProvider;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("@/contexts/AuthContext");
const storage_1 = require("./storage");
exports.WorkspaceContext = react_1.default.createContext(null);
function WorkspaceProvider({ children, }) {
    const { user } = (0, AuthContext_1.useAuth)();
    const location = (0, react_router_dom_1.useLocation)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [settingsOpen, setSettingsOpen] = (0, react_1.useState)(false);
    const [state, setState] = (0, react_1.useState)(() => (0, storage_1.loadWorkspaceState)(user?.id || 'anonymous', location.pathname));
    const userKey = user?.id || 'anonymous';
    (0, react_1.useEffect)(() => {
        setState((0, storage_1.loadWorkspaceState)(userKey, location.pathname));
    }, [userKey, location.pathname]);
    (0, react_1.useEffect)(() => {
        (0, storage_1.persistWorkspaceState)(userKey, state);
    }, [state, userKey]);
    (0, react_1.useEffect)(() => {
        setState(prev => {
            const active = prev.workspaces[prev.activeWorkspaceId];
            if (!active || active.lastRoute === location.pathname) {
                return prev;
            }
            return {
                ...prev,
                workspaces: {
                    ...prev.workspaces,
                    [prev.activeWorkspaceId]: {
                        ...active,
                        lastRoute: location.pathname,
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    }, [location.pathname]);
    const activeWorkspace = state.workspaces[state.activeWorkspaceId];
    const switchWorkspace = (0, react_1.useCallback)((workspaceId, options = {}) => {
        let targetRoute;
        setState(prev => {
            const target = prev.workspaces[workspaceId];
            if (!target)
                return prev;
            targetRoute = options.useDefaultRoute
                ? target.defaultRoute
                : target.lastRoute || target.defaultRoute;
            return {
                ...prev,
                activeWorkspaceId: workspaceId,
            };
        });
        if (options.applyRoute &&
            targetRoute &&
            targetRoute !== location.pathname) {
            navigate(targetRoute);
        }
    }, [location.pathname, navigate]);
    const updatePanel = (0, react_1.useCallback)((panel, updates) => {
        setState(prev => {
            const current = prev.workspaces[prev.activeWorkspaceId];
            if (!current)
                return prev;
            return {
                ...prev,
                workspaces: {
                    ...prev.workspaces,
                    [prev.activeWorkspaceId]: {
                        ...current,
                        panels: {
                            ...current.panels,
                            [panel]: {
                                ...current.panels[panel],
                                ...updates,
                            },
                        },
                        lastUpdated: Date.now(),
                    },
                },
            };
        });
    }, []);
    const resetWorkspace = (0, react_1.useCallback)((workspaceId) => {
        setState(prev => {
            const targetId = workspaceId || prev.activeWorkspaceId;
            const defaultPreset = (0, storage_1.getDefaultPresetFor)(targetId, location.pathname);
            if (!defaultPreset)
                return prev;
            return {
                ...prev,
                workspaces: {
                    ...prev.workspaces,
                    [targetId]: {
                        ...defaultPreset,
                        lastUpdated: Date.now(),
                    },
                },
                activeWorkspaceId: targetId,
            };
        });
    }, [location.pathname]);
    const value = (0, react_1.useMemo)(() => ({
        isEnabled: true,
        activeWorkspace,
        workspaces: Object.values(state.workspaces),
        switchWorkspace,
        updatePanel,
        resetWorkspace,
        settingsOpen,
        setSettingsOpen,
    }), [activeWorkspace, resetWorkspace, settingsOpen, state.workspaces, switchWorkspace, updatePanel]);
    return (<exports.WorkspaceContext.Provider value={value}>
      {children}
    </exports.WorkspaceContext.Provider>);
}
const useWorkspaceLayout = () => {
    const context = react_1.default.useContext(exports.WorkspaceContext);
    if (!context) {
        return {
            isEnabled: false,
            workspaces: [],
            switchWorkspace: () => { },
            updatePanel: () => { },
            resetWorkspace: () => { },
            settingsOpen: false,
            setSettingsOpen: () => { },
        };
    }
    return context;
};
exports.useWorkspaceLayout = useWorkspaceLayout;
