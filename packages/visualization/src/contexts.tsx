import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { VisualizationTheme, DataPoint } from './types';

// Visualization Theme Context
interface VisualizationThemeContextValue {
  theme: VisualizationTheme;
  setTheme: (theme: VisualizationTheme) => void;
}

const defaultTheme: VisualizationTheme = {
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

const VisualizationThemeContext = createContext<VisualizationThemeContextValue>({
  theme: defaultTheme,
  setTheme: () => {},
});

export function VisualizationThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<VisualizationTheme>(defaultTheme);

  return (
    <VisualizationThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </VisualizationThemeContext.Provider>
  );
}

export function useVisualizationTheme() {
  return useContext(VisualizationThemeContext);
}

// Data Context for cross-filtering
interface DataContextValue<T extends DataPoint = DataPoint> {
  globalData: T[];
  setGlobalData: (data: T[]) => void;
  filteredData: T[];
  setFilteredData: (data: T[]) => void;
  selectedData: T[];
  setSelectedData: (data: T[]) => void;
  addFilter: (filterFn: (data: T[]) => T[]) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider<T extends DataPoint = DataPoint>({
  children,
  initialData = [],
}: {
  children: ReactNode;
  initialData?: T[];
}) {
  const [globalData, setGlobalData] = useState<T[]>(initialData);
  const [filteredData, setFilteredData] = useState<T[]>(initialData);
  const [selectedData, setSelectedData] = useState<T[]>([]);
  const [filters, setFilters] = useState<Map<string, (data: T[]) => T[]>>(new Map());

  const addFilter = useCallback((filterFn: (data: T[]) => T[]) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFilters(prev => new Map(prev).set(id, filterFn));
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters(prev => {
      const newFilters = new Map(prev);
      newFilters.delete(id);
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(new Map());
    setFilteredData(globalData);
  }, [globalData]);

  // Apply all filters when filters or global data changes
  React.useEffect(() => {
    let result = globalData;
    filters.forEach(filterFn => {
      result = filterFn(result);
    });
    setFilteredData(result);
  }, [globalData, filters]);

  return (
    <DataContext.Provider
      value={{
        globalData,
        setGlobalData,
        filteredData,
        setFilteredData,
        selectedData,
        setSelectedData,
        addFilter,
        removeFilter,
        clearFilters,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext<T extends DataPoint = DataPoint>(): DataContextValue<T> {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context as DataContextValue<T>;
}

// Interaction Context for coordinated views
interface InteractionContextValue {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  selectedIds: Set<string>;
  selectIds: (ids: string[]) => void;
  deselectIds: (ids: string[]) => void;
  toggleId: (id: string) => void;
  clearSelection: () => void;
}

const InteractionContext = createContext<InteractionContextValue | null>(null);

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectIds = useCallback((ids: string[]) => {
    setSelectedIds(prev => new Set([...Array.from(prev), ...ids]));
  }, []);

  const deselectIds = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  const toggleId = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <InteractionContext.Provider
      value={{
        hoveredId,
        setHoveredId,
        selectedIds,
        selectIds,
        deselectIds,
        toggleId,
        clearSelection,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}

export function useInteraction() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
}
