import React, { useMemo } from 'react';
import { ChartWidgetConfig } from '../types';

export interface ChartWidgetProps {
  config: ChartWidgetConfig;
  data?: any[];
  width?: number;
  height?: number;
  onDataPointClick?: (point: any) => void;
}

export function ChartWidget({
  config,
  data = [],
  width = 400,
  height = 300,
  onDataPointClick,
}: ChartWidgetProps) {
  const chartType = config.chartType || 'bar';

  const processedData = useMemo(() => {
    if (!data.length) return [];
    return data.slice(0, 100); // Limit for performance
  }, [data]);

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return <LineChartContent data={processedData} config={config} width={width} height={height} />;
      case 'bar':
        return <BarChartContent data={processedData} config={config} width={width} height={height} />;
      case 'pie':
        return <PieChartContent data={processedData} config={config} width={width} height={height} />;
      case 'scatter':
        return <ScatterChartContent data={processedData} config={config} width={width} height={height} />;
      default:
        return <PlaceholderChart type={chartType} />;
    }
  };

  return (
    <div className="chart-widget" style={{ width: '100%', height: '100%', padding: '16px' }}>
      {processedData.length > 0 ? (
        renderChart()
      ) : (
        <EmptyState message="No data available" />
      )}
    </div>
  );
}

function LineChartContent({ data, config, width, height }: any) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <text x={width / 2} y={height / 2} textAnchor="middle" fill="#6b7280" fontSize={14}>
        Line Chart: {data.length} points
      </text>
    </svg>
  );
}

function BarChartContent({ data, config, width, height }: any) {
  const barWidth = Math.max(10, (width - 60) / Math.min(data.length, 20));
  const maxValue = Math.max(...data.map((d: any) => d.value || d.y || 0));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform="translate(30, 10)">
        {data.slice(0, 20).map((d: any, i: number) => {
          const value = d.value || d.y || 0;
          const barHeight = maxValue > 0 ? (value / maxValue) * (height - 40) : 0;
          return (
            <rect
              key={i}
              x={i * (barWidth + 2)}
              y={height - 30 - barHeight}
              width={barWidth}
              height={barHeight}
              fill={config.colors?.[0] || '#3b82f6'}
              rx={2}
            />
          );
        })}
      </g>
    </svg>
  );
}

function PieChartContent({ data, config, width, height }: any) {
  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <circle cx={centerX} cy={centerY} r={radius} fill="#e5e7eb" />
      <text x={centerX} y={centerY} textAnchor="middle" fill="#6b7280" fontSize={14}>
        Pie: {data.length} segments
      </text>
    </svg>
  );
}

function ScatterChartContent({ data, config, width, height }: any) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <text x={width / 2} y={height / 2} textAnchor="middle" fill="#6b7280" fontSize={14}>
        Scatter: {data.length} points
      </text>
    </svg>
  );
}

function PlaceholderChart({ type }: { type: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
        <div>{type} chart</div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
        <div>{message}</div>
      </div>
    </div>
  );
}
