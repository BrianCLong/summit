import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DataPoint, DataFilter, Dimension } from './types';

// Hook for managing visualization dimensions with responsive resize
export function useVisualizationDimensions(
  containerRef: React.RefObject<HTMLElement>,
  aspectRatio?: number
): Dimension {
  const [dimensions, setDimensions] = useState<Dimension>({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width,
          height: aspectRatio ? width / aspectRatio : height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, aspectRatio]);

  return dimensions;
}

// Hook for data filtering with debouncing
export function useDataFilter<T extends DataPoint>(
  data: T[],
  filters: DataFilter[],
  debounceMs: number = 300
): T[] {
  const [filteredData, setFilteredData] = useState<T[]>(data);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const result = data.filter((item) => {
        return filters.every((filter) => {
          const value = item[filter.field];

          switch (filter.operator) {
            case 'eq':
              return value === filter.value;
            case 'ne':
              return value !== filter.value;
            case 'gt':
              return value > filter.value;
            case 'gte':
              return value >= filter.value;
            case 'lt':
              return value < filter.value;
            case 'lte':
              return value <= filter.value;
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(value);
            case 'nin':
              return Array.isArray(filter.value) && !filter.value.includes(value);
            case 'contains':
              return String(value).includes(String(filter.value));
            case 'startsWith':
              return String(value).startsWith(String(filter.value));
            case 'endsWith':
              return String(value).endsWith(String(filter.value));
            default:
              return true;
          }
        });
      });

      setFilteredData(result);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, filters, debounceMs]);

  return filteredData;
}

// Hook for selection management
export function useSelection<T extends DataPoint>(
  initialSelection: T[] = []
): {
  selection: T[];
  select: (items: T | T[]) => void;
  deselect: (items: T | T[]) => void;
  toggle: (item: T) => void;
  clear: () => void;
  isSelected: (item: T) => boolean;
} {
  const [selection, setSelection] = useState<T[]>(initialSelection);

  const select = useCallback((items: T | T[]) => {
    const itemsArray = Array.isArray(items) ? items : [items];
    setSelection((prev) => {
      const newSelection = [...prev];
      itemsArray.forEach((item) => {
        if (!newSelection.find((s) => s.id === item.id)) {
          newSelection.push(item);
        }
      });
      return newSelection;
    });
  }, []);

  const deselect = useCallback((items: T | T[]) => {
    const itemsArray = Array.isArray(items) ? items : [items];
    setSelection((prev) =>
      prev.filter((item) => !itemsArray.find((i) => i.id === item.id))
    );
  }, []);

  const toggle = useCallback((item: T) => {
    setSelection((prev) => {
      const exists = prev.find((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  }, []);

  const clear = useCallback(() => {
    setSelection([]);
  }, []);

  const isSelected = useCallback(
    (item: T) => {
      return selection.some((s) => s.id === item.id);
    },
    [selection]
  );

  return { selection, select, deselect, toggle, clear, isSelected };
}

// Hook for animation frame management
export function useAnimationFrame(callback: (deltaTime: number) => void, deps: any[] = []) {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();

  const animate = useCallback(
    (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callback(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [callback]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, ...deps]);
}

// Hook for zoom and pan state management
export function useZoomPan(
  initialZoom: number = 1,
  initialPan: [number, number] = [0, 0]
): {
  zoom: number;
  pan: [number, number];
  setZoom: (zoom: number) => void;
  setPan: (pan: [number, number]) => void;
  reset: () => void;
} {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<[number, number]>(initialPan);

  const reset = useCallback(() => {
    setZoom(initialZoom);
    setPan(initialPan);
  }, [initialZoom, initialPan]);

  return { zoom, pan, setZoom, setPan, reset };
}

// Hook for data aggregation
export function useDataAggregation<T extends DataPoint>(
  data: T[],
  groupBy: keyof T,
  aggregateField: keyof T,
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' = 'count'
): Record<string, number> {
  return useMemo(() => {
    const groups: Record<string, T[]> = {};

    // Group data
    data.forEach((item) => {
      const key = String(item[groupBy]);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Aggregate
    const result: Record<string, number> = {};
    Object.entries(groups).forEach(([key, items]) => {
      switch (operation) {
        case 'count':
          result[key] = items.length;
          break;
        case 'sum':
          result[key] = items.reduce((sum, item) => sum + Number(item[aggregateField]), 0);
          break;
        case 'avg':
          result[key] =
            items.reduce((sum, item) => sum + Number(item[aggregateField]), 0) / items.length;
          break;
        case 'min':
          result[key] = Math.min(...items.map((item) => Number(item[aggregateField])));
          break;
        case 'max':
          result[key] = Math.max(...items.map((item) => Number(item[aggregateField])));
          break;
      }
    });

    return result;
  }, [data, groupBy, aggregateField, operation]);
}

// Hook for tooltip management
export function useTooltip<T = any>(): {
  tooltip: { visible: boolean; x: number; y: number; data: T | null };
  showTooltip: (x: number, y: number, data: T) => void;
  hideTooltip: () => void;
} {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: T | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });

  const showTooltip = useCallback((x: number, y: number, data: T) => {
    setTooltip({ visible: true, x, y, data });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip({ visible: false, x: 0, y: 0, data: null });
  }, []);

  return { tooltip, showTooltip, hideTooltip };
}

// Hook for data loading with caching
export function useDataLoader<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = [],
  cacheKey?: string
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache if key provided
      if (cacheKey && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      const result = await fetchFn();
      setData(result);

      // Cache result if key provided
      if (cacheKey && typeof window !== 'undefined') {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, cacheKey]);

  useEffect(() => {
    fetchData();
  }, deps);

  return { data, loading, error, refetch: fetchData };
}
