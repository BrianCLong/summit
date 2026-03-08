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
exports.SnapshotProvider = SnapshotProvider;
exports.useSnapshotContext = useSnapshotContext;
exports.useSnapshotHandler = useSnapshotHandler;
const react_1 = __importStar(require("react"));
const SnapshotContext = (0, react_1.createContext)(null);
function SnapshotProvider({ children }) {
    const handlers = (0, react_1.useRef)(new Map());
    const register = (0, react_1.useCallback)((id, handler) => {
        handlers.current.set(id, handler);
        return () => {
            handlers.current.delete(id);
        };
    }, []);
    const captureAll = (0, react_1.useCallback)(() => {
        const data = {};
        handlers.current.forEach((handler, id) => {
            try {
                data[id] = handler.get();
            }
            catch (e) {
                console.error(`Failed to capture snapshot for ${id}`, e);
            }
        });
        return data;
    }, []);
    const restoreAll = (0, react_1.useCallback)((data) => {
        Object.entries(data).forEach(([id, componentState]) => {
            const handler = handlers.current.get(id);
            if (handler) {
                try {
                    handler.restore(componentState);
                }
                catch (e) {
                    console.error(`Failed to restore snapshot for ${id}`, e);
                }
            }
        });
    }, []);
    return (<SnapshotContext.Provider value={{ register, captureAll, restoreAll }}>
      {children}
    </SnapshotContext.Provider>);
}
function useSnapshotContext() {
    const ctx = (0, react_1.useContext)(SnapshotContext);
    if (!ctx) {
        throw new Error('useSnapshotContext must be used within a SnapshotProvider');
    }
    return ctx;
}
function useSnapshotHandler(id, get, restore) {
    const { register } = useSnapshotContext();
    // We use a ref to keep track of the latest get/restore functions
    // without triggering re-registration on every render
    const currentHandler = (0, react_1.useRef)({ get, restore });
    react_1.default.useEffect(() => {
        currentHandler.current = { get, restore };
    }, [get, restore]);
    react_1.default.useEffect(() => {
        return register(id, {
            get: () => currentHandler.current.get(),
            restore: (data) => currentHandler.current.restore(data),
        });
    }, [id, register]);
}
