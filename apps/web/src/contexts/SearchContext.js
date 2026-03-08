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
exports.useSearch = useSearch;
exports.SearchProvider = SearchProvider;
const react_1 = __importStar(require("react"));
const react_hotkeys_hook_1 = require("react-hotkeys-hook");
const SearchContext = (0, react_1.createContext)(undefined);
function useSearch() {
    const context = (0, react_1.useContext)(SearchContext);
    if (context === undefined) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}
function SearchProvider({ children }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [query, setQuery] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const openSearch = (0, react_1.useCallback)(() => {
        setIsOpen(true);
    }, []);
    const closeSearch = (0, react_1.useCallback)(() => {
        setIsOpen(false);
        setQuery('');
        setResults([]);
    }, []);
    // Global hotkey: Cmd/Ctrl + K
    (0, react_hotkeys_hook_1.useHotkeys)('meta+k, ctrl+k', event => {
        event.preventDefault();
        openSearch();
    }, { enableOnContentEditable: true, enableOnFormTags: true });
    // ESC to close search
    (0, react_hotkeys_hook_1.useHotkeys)('esc', () => {
        if (isOpen) {
            closeSearch();
        }
    }, { enableOnContentEditable: true });
    // Memoize the context value to prevent unnecessary re-renders of consumers
    const value = (0, react_1.useMemo)(() => ({
        isOpen,
        query,
        setQuery,
        openSearch,
        closeSearch,
        results,
        setResults,
        loading,
        setLoading,
    }), [isOpen, query, openSearch, closeSearch, results, loading]);
    return (<SearchContext.Provider value={value}>{children}</SearchContext.Provider>);
}
