"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVisualizationDimensions = useVisualizationDimensions;
exports.useDataFilter = useDataFilter;
exports.useSelection = useSelection;
exports.useAnimationFrame = useAnimationFrame;
exports.useZoomPan = useZoomPan;
exports.useDataAggregation = useDataAggregation;
exports.useTooltip = useTooltip;
exports.useDataLoader = useDataLoader;
// @ts-nocheck
const react_1 = require("react");
// Hook for managing visualization dimensions with responsive resize
function useVisualizationDimensions(containerRef, aspectRatio) {
    const [dimensions, setDimensions] = (0, react_1.useState)({ width: 0, height: 0 });
    (0, react_1.useEffect)(() => {
        if (!containerRef.current) {
            return;
        }
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
function useDataFilter(data, filters, debounceMs = 300) {
    const [filteredData, setFilteredData] = (0, react_1.useState)(data);
    const timeoutRef = (0, react_1.useRef)();
    (0, react_1.useEffect)(() => {
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
function useSelection(initialSelection = []) {
    const [selection, setSelection] = (0, react_1.useState)(initialSelection);
    const select = (0, react_1.useCallback)((items) => {
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
    const deselect = (0, react_1.useCallback)((items) => {
        const itemsArray = Array.isArray(items) ? items : [items];
        setSelection((prev) => prev.filter((item) => !itemsArray.find((i) => i.id === item.id)));
    }, []);
    const toggle = (0, react_1.useCallback)((item) => {
        setSelection((prev) => {
            const exists = prev.find((s) => s.id === item.id);
            if (exists) {
                return prev.filter((s) => s.id !== item.id);
            }
            else {
                return [...prev, item];
            }
        });
    }, []);
    const clear = (0, react_1.useCallback)(() => {
        setSelection([]);
    }, []);
    const isSelected = (0, react_1.useCallback)((item) => {
        return selection.some((s) => s.id === item.id);
    }, [selection]);
    return { selection, select, deselect, toggle, clear, isSelected };
}
// Hook for animation frame management
function useAnimationFrame(callback, deps = []) {
    const requestRef = (0, react_1.useRef)();
    const previousTimeRef = (0, react_1.useRef)();
    const animate = (0, react_1.useCallback)((time) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = time - previousTimeRef.current;
            callback(deltaTime);
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, [callback]);
    (0, react_1.useEffect)(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [animate, ...deps]);
}
// Hook for zoom and pan state management
function useZoomPan(initialZoom = 1, initialPan = [0, 0]) {
    const [zoom, setZoom] = (0, react_1.useState)(initialZoom);
    const [pan, setPan] = (0, react_1.useState)(initialPan);
    const reset = (0, react_1.useCallback)(() => {
        setZoom(initialZoom);
        setPan(initialPan);
    }, [initialZoom, initialPan]);
    return { zoom, pan, setZoom, setPan, reset };
}
// Hook for data aggregation
function useDataAggregation(data, groupBy, aggregateField, operation = 'count') {
    return (0, react_1.useMemo)(() => {
        const groups = {};
        // Group data
        data.forEach((item) => {
            const key = String(item[groupBy]);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });
        // Aggregate
        const result = {};
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
function useTooltip() {
    const [tooltip, setTooltip] = (0, react_1.useState)({
        visible: false,
        x: 0,
        y: 0,
        data: null,
    });
    const showTooltip = (0, react_1.useCallback)((x, y, data) => {
        setTooltip({ visible: true, x, y, data });
    }, []);
    const hideTooltip = (0, react_1.useCallback)(() => {
        setTooltip({ visible: false, x: 0, y: 0, data: null });
    }, []);
    return { tooltip, showTooltip, hideTooltip };
}
// Hook for data loading with caching
function useDataLoader(fetchFn, deps = [], cacheKey) {
    const [data, setData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchData = (0, react_1.useCallback)(async () => {
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
        }
        catch (err) {
            setError(err);
        }
        finally {
            setLoading(false);
        }
    }, [fetchFn, cacheKey]);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, deps);
    return { data, loading, error, refetch: fetchData };
}
