import React, { useState, useMemo } from 'react';
import type { SecurityMetric, MetricCategory, MetricTrend, MetricStatus } from './types';

export interface SecurityMetricsDashboardProps {
  metrics: SecurityMetric[];
  onSelectMetric?: (metric: SecurityMetric) => void;
  onRefresh?: () => void;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  onTimeRangeChange?: (range: '24h' | '7d' | '30d' | '90d') => void;
  className?: string;
}

const categoryColors: Record<MetricCategory, string> = {
  detection: 'bg-purple-500',
  response: 'bg-blue-500',
  prevention: 'bg-green-500',
  compliance: 'bg-indigo-500',
  risk: 'bg-red-500',
};

const categoryIcons: Record<MetricCategory, string> = {
  detection: '\u{1F50D}',
  response: '\u26A1',
  prevention: '\u{1F6E1}\uFE0F',
  compliance: '\u{1F4DC}',
  risk: '\u26A0\uFE0F',
};

const categoryLabels: Record<MetricCategory, string> = {
  detection: 'Detection',
  response: 'Response',
  prevention: 'Prevention',
  compliance: 'Compliance',
  risk: 'Risk',
};

const statusColors: Record<MetricStatus, string> = {
  good: 'text-green-600 bg-green-100',
  warning: 'text-yellow-600 bg-yellow-100',
  critical: 'text-red-600 bg-red-100',
};

const trendIcons: Record<MetricTrend, string> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

export const SecurityMetricsDashboard: React.FC<SecurityMetricsDashboardProps> = ({
  metrics,
  onSelectMetric,
  onRefresh,
  timeRange = '7d',
  onTimeRangeChange,
  className = '',
}) => {
  const [categoryFilter, setCategoryFilter] = useState<MetricCategory | 'all'>('all');
  const [showSparklines, setShowSparklines] = useState(true);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);

  const filteredMetrics = useMemo(() => {
    if (categoryFilter === 'all') return metrics;
    return metrics.filter((m) => m.category === categoryFilter);
  }, [metrics, categoryFilter]);

  const metricsByCategory = useMemo(() => {
    return metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.category]) acc[metric.category] = [];
        acc[metric.category].push(metric);
        return acc;
      },
      {} as Record<MetricCategory, SecurityMetric[]>
    );
  }, [metrics]);

  const overallHealth = useMemo(() => {
    if (metrics.length === 0) return 0;

    let score = 0;
    let count = 0;

    metrics.forEach((metric) => {
      if (metric.target) {
        const achievement = Math.min(metric.value / metric.target, 1);
        score += achievement * 100;
        count++;
      } else {
        score += metric.status === 'good' ? 100 : metric.status === 'warning' ? 50 : 0;
        count++;
      }
    });

    return Math.round(score / count);
  }, [metrics]);

  const healthColor = useMemo(() => {
    if (overallHealth >= 80) return 'text-green-600';
    if (overallHealth >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }, [overallHealth]);

  const renderSparkline = (dataPoints: { timestamp: string; value: number }[]) => {
    if (dataPoints.length < 2) return null;

    const values = dataPoints.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 80;
    const height = 24;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    });

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const renderMetricCard = (metric: SecurityMetric) => {
    const isSelected = selectedMetricId === metric.id;
    const trendColor =
      metric.trend === 'up'
        ? metric.category === 'risk'
          ? 'text-red-500'
          : 'text-green-500'
        : metric.trend === 'down'
        ? metric.category === 'risk'
          ? 'text-green-500'
          : 'text-red-500'
        : 'text-gray-500';

    return (
      <div
        key={metric.id}
        className={`p-4 bg-white border rounded-lg cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
        }`}
        onClick={() => {
          setSelectedMetricId(isSelected ? null : metric.id);
          onSelectMetric?.(metric);
        }}
        data-testid={`metric-${metric.id}`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${categoryColors[metric.category]}`} />
            <h3 className="font-medium text-gray-900 text-sm">{metric.name}</h3>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[metric.status]}`}>
            {metric.status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {metric.value}
              <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>
            </div>
            {metric.target && (
              <div className="text-xs text-gray-500">
                Target: {metric.target}
                {metric.unit}
              </div>
            )}
          </div>
          <div className="text-right">
            {showSparklines && metric.history.length > 1 && (
              <div className="mb-1">{renderSparkline(metric.history)}</div>
            )}
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <span>{trendIcons[metric.trend]}</span>
              <span>{metric.trendValue}%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {metric.target && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  metric.status === 'good'
                    ? 'bg-green-500'
                    : metric.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">{metric.description}</p>
            {metric.threshold && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-yellow-50 rounded">
                  <span className="text-yellow-600">Warning: </span>
                  <span className="text-gray-700">{metric.threshold.warning}{metric.unit}</span>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <span className="text-red-600">Critical: </span>
                  <span className="text-gray-700">{metric.threshold.critical}{metric.unit}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-gray-50 rounded-lg border border-gray-200 ${className}`} data-testid="security-metrics-dashboard">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Security Metrics</h2>
            <p className="text-sm text-gray-500">{metrics.length} metrics tracked</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Health Score */}
            <div className="text-right">
              <div className="text-sm text-gray-500">Health Score</div>
              <div className={`text-2xl font-bold ${healthColor}`}>{overallHealth}%</div>
            </div>
            {onRefresh && (
              <button
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                onClick={onRefresh}
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as MetricCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({metricsByCategory[value as MetricCategory]?.length || 0})
              </option>
            ))}
          </select>

          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            {(['24h', '7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                className={`px-3 py-2 text-sm ${
                  timeRange === range ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => onTimeRangeChange?.(range)}
              >
                {range}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showSparklines}
              onChange={(e) => setShowSparklines(e.target.checked)}
              className="rounded"
            />
            Show trends
          </label>
        </div>
      </div>

      {/* Category Summary */}
      <div className="bg-white border-b border-gray-200 p-4 grid grid-cols-5 gap-4">
        {Object.entries(categoryLabels).map(([category, label]) => {
          const categoryMetrics = metricsByCategory[category as MetricCategory] || [];
          const goodCount = categoryMetrics.filter((m) => m.status === 'good').length;
          const warningCount = categoryMetrics.filter((m) => m.status === 'warning').length;
          const criticalCount = categoryMetrics.filter((m) => m.status === 'critical').length;

          return (
            <div
              key={category}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                categoryFilter === category
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setCategoryFilter(category === categoryFilter ? 'all' : (category as MetricCategory))}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{categoryIcons[category as MetricCategory]}</span>
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                  {goodCount}
                </span>
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                  {warningCount}
                </span>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                  {criticalCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto">
        {filteredMetrics.map(renderMetricCard)}
      </div>

      {filteredMetrics.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No metrics match your filters.
        </div>
      )}

      {/* Footer Stats */}
      <div className="bg-white border-t border-gray-200 p-4 rounded-b-lg">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Total Metrics</div>
            <div className="text-xl font-semibold text-gray-900">{metrics.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Good</div>
            <div className="text-xl font-semibold text-green-600">
              {metrics.filter((m) => m.status === 'good').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Warning</div>
            <div className="text-xl font-semibold text-yellow-600">
              {metrics.filter((m) => m.status === 'warning').length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Critical</div>
            <div className="text-xl font-semibold text-red-600">
              {metrics.filter((m) => m.status === 'critical').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityMetricsDashboard;
