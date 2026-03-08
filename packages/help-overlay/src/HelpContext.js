"use strict";
/**
 * Help Context
 * React context for managing help overlay state
 */
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
exports.HelpContext = void 0;
exports.HelpProvider = HelpProvider;
exports.useHelp = useHelp;
const react_1 = __importStar(require("react"));
const HelpContext = (0, react_1.createContext)(null);
exports.HelpContext = HelpContext;
// Simple in-memory cache
const cache = new Map();
function HelpProvider({ children, config }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [currentArticle, setCurrentArticle] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [searchResults, setSearchResults] = (0, react_1.useState)([]);
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const cacheTimeout = config.cacheTimeout || 5 * 60 * 1000; // 5 minutes default
    const getCached = (0, react_1.useCallback)((key) => {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
            return cached.data;
        }
        cache.delete(key);
        return null;
    }, [cacheTimeout]);
    const setCache = (0, react_1.useCallback)((key, data) => {
        cache.set(key, { data, timestamp: Date.now() });
    }, []);
    const openHelp = (0, react_1.useCallback)(() => setIsOpen(true), []);
    const closeHelp = (0, react_1.useCallback)(() => {
        setIsOpen(false);
        setCurrentArticle(null);
    }, []);
    const toggleHelp = (0, react_1.useCallback)(() => setIsOpen((prev) => !prev), []);
    const search = (0, react_1.useCallback)(async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }
        const cacheKey = `search:${query}`;
        const cached = getCached(cacheKey);
        if (cached) {
            setSearchResults(cached);
            return;
        }
        setIsSearching(true);
        try {
            const params = new URLSearchParams({
                q: query,
                limit: '10',
            });
            if (config.defaultRole) {
                params.set('role', config.defaultRole);
            }
            const response = await fetch(`${config.baseUrl}/search?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.defaultRole && { 'x-user-role': config.defaultRole }),
                },
            });
            if (!response.ok) {
                throw new Error('Search failed');
            }
            const data = await response.json();
            setSearchResults(data.articles || []);
            setCache(cacheKey, data.articles || []);
        }
        catch (error) {
            console.error('Help search error:', error);
            setSearchResults([]);
        }
        finally {
            setIsSearching(false);
        }
    }, [config.baseUrl, config.defaultRole, getCached, setCache]);
    const fetchContextualHelp = (0, react_1.useCallback)(async (route, anchorKey) => {
        const cacheKey = `context:${route}:${anchorKey || ''}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return cached;
        }
        try {
            const response = await fetch(`${config.baseUrl}/context`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(config.defaultRole && { 'x-user-role': config.defaultRole }),
                },
                body: JSON.stringify({
                    uiRoute: route,
                    anchorKey,
                    userRole: config.defaultRole,
                    limit: 5,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to fetch contextual help');
            }
            const data = await response.json();
            setCache(cacheKey, data);
            return data;
        }
        catch (error) {
            console.error('Contextual help error:', error);
            return null;
        }
    }, [config.baseUrl, config.defaultRole, getCached, setCache]);
    // Keyboard shortcut to toggle help (? key)
    (0, react_1.useEffect)(() => {
        const handleKeyDown = (event) => {
            // Check for ? key (Shift + /)
            if (event.key === '?' &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey) {
                // Don't trigger if user is typing in an input
                const target = event.target;
                if (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable) {
                    return;
                }
                event.preventDefault();
                toggleHelp();
            }
            // Escape to close
            if (event.key === 'Escape' && isOpen) {
                closeHelp();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, toggleHelp, closeHelp]);
    const value = (0, react_1.useMemo)(() => ({
        isOpen,
        openHelp,
        closeHelp,
        toggleHelp,
        currentArticle,
        setCurrentArticle,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        search,
        fetchContextualHelp,
        config,
    }), [
        isOpen,
        openHelp,
        closeHelp,
        toggleHelp,
        currentArticle,
        searchQuery,
        searchResults,
        isSearching,
        search,
        fetchContextualHelp,
        config,
    ]);
    return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}
function useHelp() {
    const context = (0, react_1.useContext)(HelpContext);
    if (!context) {
        throw new Error('useHelp must be used within a HelpProvider');
    }
    return context;
}
