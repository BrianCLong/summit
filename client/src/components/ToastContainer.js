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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useToastHelpers = exports.ToastProvider = exports.useToast = exports.ToastContext = void 0;
/* eslint-disable react-refresh/only-export-components */
const react_1 = __importStar(require("react"));
const Toast_1 = __importDefault(require("./Toast"));
exports.ToastContext = react_1.default.createContext(null);
const useToast = () => {
    const context = react_1.default.useContext(exports.ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};
exports.useToast = useToast;
const ToastProvider = ({ children, maxToasts = 5, position = 'top-right', }) => {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const addToast = (0, react_1.useCallback)((toastData) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast = {
            ...toastData,
            id,
            timestamp: Date.now(),
            onDismiss: (toastId) => removeToast(toastId),
        };
        setToasts((current) => {
            const updated = [newToast, ...current];
            // Limit number of toasts
            if (updated.length > maxToasts) {
                return updated.slice(0, maxToasts);
            }
            return updated;
        });
        return id;
    }, [maxToasts]);
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const clearAllToasts = (0, react_1.useCallback)(() => {
        setToasts([]);
    }, []);
    const getPositionClasses = () => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'bottom-right':
                return 'bottom-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            default:
                return 'top-4 right-4';
        }
    };
    const contextValue = {
        addToast,
        removeToast,
        clearAllToasts,
        success: (title, message) => addToast({ type: 'success', title, message }),
        error: (title, message) => addToast({ type: 'error', title, message }),
        warning: (title, message) => addToast({ type: 'warning', title, message }),
        info: (title, message) => addToast({ type: 'info', title, message }),
    };
    return (<exports.ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast Container */}
      <div className={`fixed ${getPositionClasses()} z-50 pointer-events-none`} aria-live="assertive">
        <div className="flex flex-col space-y-3">
          {toasts.map((toast) => (<Toast_1.default key={toast.id} {...toast}/>))}
        </div>
      </div>
    </exports.ToastContext.Provider>);
};
exports.ToastProvider = ToastProvider;
// Convenience hooks for common toast types
const useToastHelpers = () => {
    const { addToast } = (0, exports.useToast)();
    return {
        success: (title, message) => addToast({ type: 'success', title, message }),
        error: (title, message) => addToast({ type: 'error', title, message }),
        warning: (title, message) => addToast({ type: 'warning', title, message }),
        info: (title, message) => addToast({ type: 'info', title, message }),
    };
};
exports.useToastHelpers = useToastHelpers;
