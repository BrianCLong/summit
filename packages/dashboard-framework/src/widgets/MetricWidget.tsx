import React from 'react';
import { MetricWidgetConfig } from '../types';

export interface MetricWidgetProps {
  config: MetricWidgetConfig;
  className?: string;
}

export function MetricWidget({ config, className = '' }: MetricWidgetProps) {
  const { value, label, trend, icon, color = '#3b82f6', target, format } = config;

  const formattedValue = formatValue(value, format);
  const progress = target ? (Number(value) / target) * 100 : null;

  return (
    <div className={`metric-widget ${className}`} style={containerStyle}>
      {icon && <div style={iconStyle}>{icon}</div>}

      <div style={valueStyle}>
        <span style={{ color }}>{formattedValue}</span>
      </div>

      <div style={labelStyle}>{label}</div>

      {trend && (
        <div style={trendStyle}>
          <span style={{ color: trend.direction === 'up' ? '#10b981' : '#ef4444' }}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          {trend.label && <span style={{ color: '#9ca3af', marginLeft: '4px' }}>{trend.label}</span>}
        </div>
      )}

      {progress !== null && (
        <div style={progressContainerStyle}>
          <div style={{ ...progressBarStyle, width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  );
}

function formatValue(value: number | string, format?: string): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'compact':
      return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
    default:
      return value.toLocaleString();
  }
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  height: '100%',
};

const iconStyle: React.CSSProperties = {
  fontSize: '28px',
  marginBottom: '12px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  lineHeight: 1.2,
};

const labelStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '8px',
};

const trendStyle: React.CSSProperties = {
  fontSize: '13px',
  marginTop: '8px',
  display: 'flex',
  alignItems: 'center',
};

const progressContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: '#e5e7eb',
  borderRadius: '2px',
  marginTop: '12px',
  overflow: 'hidden',
};

const progressBarStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: '2px',
  transition: 'width 0.3s ease',
};
