import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import type { VisualizationContext, VisualizationTheme, Interaction, DEFAULT_THEME, DEFAULT_INTERACTIONS } from '../types';

export interface UseVisualizationOptions {
  width?: number;
  height?: number;
  theme?: Partial<VisualizationTheme>;
  interactions?: Partial<Interaction>;
  responsive?: boolean;
}

export interface UseVisualizationReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  dimensions: { width: number; height: number };
  context: VisualizationContext;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
  clear: () => void;
}

const defaultTheme: VisualizationTheme = {
  backgroundColor: '#ffffff',
  textColor: '#333333',
  gridColor: '#e0e0e0',
  accentColor: '#1976d2',
  colors: ['#1976d2', '#dc004e', '#9c27b0', '#f57c00', '#388e3c', '#00796b'],
  fontSize: 12,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const defaultInteractions: Interaction = {
  hover: true,
  click: true,
  brush: false,
  zoom: false,
  pan: false,
  crossfilter: false,
};

export function useVisualization(options: UseVisualizationOptions = {}): UseVisualizationReturn {
  const {
    width: initialWidth = 800,
    height: initialHeight = 400,
    theme: themeOverrides = {},
    interactions: interactionOverrides = {},
    responsive = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: initialWidth, height: initialHeight });

  // Merge theme with defaults
  const theme = useMemo<VisualizationTheme>(() => ({
    ...defaultTheme,
    ...themeOverrides,
  }), [themeOverrides]);

  // Merge interactions with defaults
  const interactions = useMemo<Interaction>(() => ({
    ...defaultInteractions,
    ...interactionOverrides,
  }), [interactionOverrides]);

  // Create context
  const context = useMemo<VisualizationContext>(() => ({
    width: dimensions.width,
    height: dimensions.height,
    theme,
    colorScale: {
      type: 'categorical',
      range: theme.colors,
    },
    interactions,
  }), [dimensions, theme, interactions]);

  // Handle responsive resize
  useEffect(() => {
    if (!responsive || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height: height || initialHeight });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [responsive, initialHeight]);

  // Get SVG selection
  const svg = useMemo(() => {
    if (!svgRef.current) return null;
    return d3.select(svgRef.current);
  }, [svgRef.current]);

  // Clear SVG content
  const clear = useCallback(() => {
    if (svgRef.current) {
      d3.select(svgRef.current).selectAll('*').remove();
    }
  }, []);

  return {
    containerRef,
    svgRef,
    dimensions,
    context,
    svg,
    clear,
  };
}

export function useResponsiveDimensions(
  ref: React.RefObject<HTMLElement>,
  defaultDimensions = { width: 800, height: 400 }
) {
  const [dimensions, setDimensions] = useState(defaultDimensions);

  useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0) {
        setDimensions({ width, height: height || defaultDimensions.height });
      }
    });

    resizeObserver.observe(ref.current);
    return () => resizeObserver.disconnect();
  }, [ref, defaultDimensions.height]);

  return dimensions;
}

export function useDataTransform<TInput, TOutput>(
  data: TInput,
  transform: (data: TInput) => TOutput,
  deps: unknown[] = []
): TOutput {
  return useMemo(() => transform(data), [data, ...deps]);
}
