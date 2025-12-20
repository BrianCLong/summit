import React, { useRef, ReactNode } from 'react';
import { useVisualizationDimensions } from '../hooks';

export interface VisualizationContainerProps {
  children: (dimensions: { width: number; height: number }) => ReactNode;
  className?: string;
  aspectRatio?: number;
  minHeight?: number;
  minWidth?: number;
}

export function VisualizationContainer({
  children,
  className = '',
  aspectRatio,
  minHeight = 200,
  minWidth = 300,
}: VisualizationContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useVisualizationDimensions(containerRef, aspectRatio);

  const { width, height } = dimensions;
  const validDimensions = width >= minWidth && height >= minHeight;

  return (
    <div
      ref={containerRef}
      className={`visualization-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth,
        minHeight,
        position: 'relative',
      }}
    >
      {validDimensions && children(dimensions)}
    </div>
  );
}
