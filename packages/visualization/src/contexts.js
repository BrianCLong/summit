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
exports.VisualizationThemeProvider = VisualizationThemeProvider;
exports.useVisualizationTheme = useVisualizationTheme;
exports.DataProvider = DataProvider;
exports.useDataContext = useDataContext;
exports.InteractionProvider = InteractionProvider;
exports.useInteraction = useInteraction;
// @ts-nocheck
const react_1 = __importStar(require("react"));
const defaultTheme = {
    background: '#ffffff',
    foreground: '#000000',
    grid: {
        enabled: true,
        color: '#e0e0e0',
        strokeWidth: 1,
    },
    fonts: {
        family: 'Inter, system-ui, sans-serif',
        size: 12,
        weight: 400,
    },
    colors: {
        primary: [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ],
        secondary: [
            '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
            '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
        ],
        diverging: [
            '#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf',
            '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'
        ],
        sequential: [
            '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6',
            '#4292c6', '#2171b5', '#08519c', '#08306b'
        ],
        categorical: [
            '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
            '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
        ],
    },
};
const VisualizationThemeContext = (0, react_1.createContext)({
    theme: defaultTheme,
    setTheme: () => { },
});
function VisualizationThemeProvider({ children }) {
    const [theme, setTheme] = (0, react_1.useState)(defaultTheme);
    return (<VisualizationThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </VisualizationThemeContext.Provider>);
}
function useVisualizationTheme() {
    return (0, react_1.useContext)(VisualizationThemeContext);
}
const DataContext = (0, react_1.createContext)(null);
function DataProvider({ children, initialData = [], }) {
    const [globalData, setGlobalData] = (0, react_1.useState)(initialData);
    const [filteredData, setFilteredData] = (0, react_1.useState)(initialData);
    const [selectedData, setSelectedData] = (0, react_1.useState)([]);
    const [filters, setFilters] = (0, react_1.useState)(new Map());
    const addFilter = (0, react_1.useCallback)((filterFn) => {
        const id = Math.random().toString(36).substr(2, 9);
        setFilters(prev => new Map(prev).set(id, filterFn));
    }, []);
    const removeFilter = (0, react_1.useCallback)((id) => {
        setFilters(prev => {
            const newFilters = new Map(prev);
            newFilters.delete(id);
            return newFilters;
        });
    }, []);
    const clearFilters = (0, react_1.useCallback)(() => {
        setFilters(new Map());
        setFilteredData(globalData);
    }, [globalData]);
    // Apply all filters when filters or global data changes
    react_1.default.useEffect(() => {
        let result = globalData;
        filters.forEach(filterFn => {
            result = filterFn(result);
        });
        setFilteredData(result);
    }, [globalData, filters]);
    return (<DataContext.Provider value={{
            globalData,
            setGlobalData,
            filteredData,
            setFilteredData,
            selectedData,
            setSelectedData,
            addFilter,
            removeFilter,
            clearFilters,
        }}>
      {children}
    </DataContext.Provider>);
}
function useDataContext() {
    const context = (0, react_1.useContext)(DataContext);
    if (!context) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
}
const InteractionContext = (0, react_1.createContext)(null);
function InteractionProvider({ children }) {
    const [hoveredId, setHoveredId] = (0, react_1.useState)(null);
    const [selectedIds, setSelectedIds] = (0, react_1.useState)(new Set());
    const selectIds = (0, react_1.useCallback)((ids) => {
        setSelectedIds(prev => new Set([...Array.from(prev), ...ids]));
    }, []);
    const deselectIds = (0, react_1.useCallback)((ids) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            ids.forEach(id => newSet.delete(id));
            return newSet;
        });
    }, []);
    const toggleId = (0, react_1.useCallback)((id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            }
            else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);
    const clearSelection = (0, react_1.useCallback)(() => {
        setSelectedIds(new Set());
    }, []);
    return (<InteractionContext.Provider value={{
            hoveredId,
            setHoveredId,
            selectedIds,
            selectIds,
            deselectIds,
            toggleId,
            clearSelection,
        }}>
      {children}
    </InteractionContext.Provider>);
}
function useInteraction() {
    const context = (0, react_1.useContext)(InteractionContext);
    if (!context) {
        throw new Error('useInteraction must be used within an InteractionProvider');
    }
    return context;
}
