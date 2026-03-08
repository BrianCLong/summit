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
exports.useKeyboardShortcuts = useKeyboardShortcuts;
exports.useShortcut = useShortcut;
exports.KeyboardShortcutsProvider = KeyboardShortcutsProvider;
// =============================================
// Keyboard Shortcuts Context
// =============================================
const react_1 = __importStar(require("react"));
const react_hotkeys_hook_1 = require("react-hotkeys-hook");
const KeyboardShortcutsContext = (0, react_1.createContext)(undefined);
function useKeyboardShortcuts() {
    const context = (0, react_1.useContext)(KeyboardShortcutsContext);
    if (!context) {
        throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
    }
    return context;
}
// Hook for registering a shortcut in a component
function useShortcut(keys, callback, options) {
    const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
    // Register with the global list (for the help dialog)
    react_1.default.useEffect(() => {
        if (options.enabled === false)
            return;
        const keyArray = Array.isArray(keys) ? keys : [keys];
        registerShortcut({
            id: options.id,
            keys: keyArray,
            description: options.description,
            category: options.category || 'Actions',
        });
        return () => {
            unregisterShortcut(options.id);
        };
    }, [options.id, options.description, options.category, options.enabled, keys, registerShortcut, unregisterShortcut]);
    // Bind the hotkey
    (0, react_hotkeys_hook_1.useHotkeys)(keys, (e) => {
        if (options.preventDefault !== false) {
            e.preventDefault();
        }
        callback();
    }, { enabled: options.enabled !== false });
}
function KeyboardShortcutsProvider({ children }) {
    const [shortcuts, setShortcuts] = (0, react_1.useState)([]);
    const [isHelpOpen, setIsHelpOpen] = (0, react_1.useState)(false);
    const registerShortcut = (0, react_1.useCallback)((shortcut) => {
        setShortcuts(prev => {
            // Avoid duplicates
            if (prev.some(s => s.id === shortcut.id)) {
                return prev.map(s => s.id === shortcut.id ? { ...s, ...shortcut, action: () => { } } : s);
            }
            return [...prev, { ...shortcut, action: () => { } }];
        });
    }, []);
    const unregisterShortcut = (0, react_1.useCallback)((id) => {
        setShortcuts(prev => prev.filter(s => s.id !== id));
    }, []);
    const openHelp = (0, react_1.useCallback)(() => setIsHelpOpen(true), []);
    const closeHelp = (0, react_1.useCallback)(() => setIsHelpOpen(false), []);
    // Register global shortcuts
    (0, react_hotkeys_hook_1.useHotkeys)('shift+?', (e) => {
        e.preventDefault();
        setIsHelpOpen(prev => !prev);
    });
    (0, react_hotkeys_hook_1.useHotkeys)('esc', () => {
        if (isHelpOpen)
            setIsHelpOpen(false);
    });
    return (<KeyboardShortcutsContext.Provider value={{
            registerShortcut,
            unregisterShortcut,
            openHelp,
            closeHelp,
            isHelpOpen,
            shortcuts
        }}>
      {children}
    </KeyboardShortcutsContext.Provider>);
}
