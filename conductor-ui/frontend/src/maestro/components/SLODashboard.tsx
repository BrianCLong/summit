import React, { useState, useEffect } from 'react';
import { useSLO, ErrorBudget, AlertSeverity, SLO } from '../utils/sloUtils';

interface SLODashboardProps {
  service?: string;
  className?: string;
}

export default function SLODashboard({
  service,
  className = '',
}: SLODashboardProps) {
  const { slos, loading, error, fetchSLOs, generateReport } = useSLO();
  const [selectedSLO, setSelectedSLO] = useState<string | null>(null);
  const [reportData, setReportData] = useState<object | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null,
  );

  useEffect(() => {
    fetchSLOs(service ? { service } : undefined);
  }, [service, fetchSLOs]);

  useEffect(() => {
    if (slos.length > 0) {
      generateSLOReport();
    }
  }, [slos]);

  useEffect(() => {
    // Set up auto-refresh
    const interval = setInterval(() => {
      if (!loading) {
        fetchSLOs(service ? { service } : undefined);
      }
    }, 60000); // Refresh every minute

    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [service, loading, fetchSLOs]);

  const generateSLOReport = async () => {
    if (slos.length === 0) return;

    try {
      const timeRangeMap: Record<string, { from: string; to: string }> = {
        '1h': { from: 'now-1h', to: 'now' },
        '24h': { from: 'now-24h', to: 'now' },
        '7d': { from: 'now-7d', to: 'now' },
        '30d': { from: 'now-30d', to: 'now' },
      };

      const report = await generateReport(
        slos.map((slo) => slo.id),
        timeRangeMap[timeRange] || timeRangeMap['24h'],
      );

      setReportData(report);
    } catch (err) {
      console.error('Failed to generate SLO report:', err);
    }
  };

  const getStatusColor = (
    status: string,
    compliance?: number,
    objective?: number,
  ) => {
    if (status === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'warning')
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (compliance !== undefined && objective !== undefined) {
      if (compliance >= objective)
        return 'text-green-600 bg-green-50 border-green-200';
      if (compliance >= objective - 5)
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

  const getTrendIcon = (trend: 'improving' | 'degrading' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <span className="text-green-500">↗</span>;
      case 'degrading':
        return <span className="text-red-500">↘</span>;
      default:
        return <span className="text-gray-500">→</span>;
    }
  };

  const renderErrorBudgetBar = (errorBudget: ErrorBudget) => {
    const percentage = Math.min(100, errorBudget.consumedPercentage);
    const color =
      percentage > 90
        ? 'bg-red-500'
        : percentage > 70
          ? 'bg-yellow-500'
          : 'bg-green-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const renderSLOCard = (sloData: {
    slo: SLO;
    compliance: number;
    errorBudget: ErrorBudget;
    trend: 'improving' | 'degrading' | 'stable';
  }) => {
    const { slo, compliance, errorBudget, trend } = sloData;
    const isSelected = selectedSLO === slo.id;
    const statusColor = getStatusColor(
      errorBudget.consumedPercentage > 90
        ? 'critical'
        : errorBudget.consumedPercentage > 70
          ? 'warning'
          : 'healthy',
      compliance,
      slo.objective,
    );

    return (
      <div
        key={slo.id}
        className={`bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
          isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''
        }`}
        onClick={() => setSelectedSLO(isSelected ? null : slo.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{slo.name}</h3>
            <p className="text-sm text-gray-600 truncate">{slo.service}</p>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {getTrendIcon(trend)}
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}
            >
              {compliance >= slo.objective ? 'Compliant' : 'At Risk'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500">Current SLI</div>
            <div className="text-lg font-bold text-gray-900">
              {formatPercentage(compliance)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Objective</div>
            <div className="text-lg font-bold text-gray-600">
              {formatPercentage(slo.objective)}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Error Budget</span>
            <span>
              {formatPercentage(errorBudget.consumedPercentage)} consumed
            </span>
          </div>
          {renderErrorBudgetBar(errorBudget)}
        </div>

        {errorBudget.exhaustionDate && (
          <div className="text-xs text-gray-500">
            Budget exhaustion:{' '}
            {new Date(errorBudget.exhaustionDate).toLocaleDateString()}
          </div>
        )}

        {isSelected && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Window:</span>
                <span className="ml-1 font-medium">{slo.window}</span>
              </div>
              <div>
                <span className="text-gray-500">Burn Rate:</span>
                <span className="ml-1 font-medium">
                  {errorBudget.burnRate.toFixed(2)}/hr
                </span>
              </div>
              <div>
                <span className="text-gray-500">Remaining:</span>
                <span className="ml-1 font-medium">
                  {errorBudget.remaining} errors
                </span>
              </div>
              <div>
                <span className="ml-1 font-medium">{slo.sli.type}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && slos.length === 0) {
    return (
      <div className={`slo-dashboard ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading SLOs...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`slo-dashboard ${className}`}>
        <div className="text-center text-red-600 p-8">
          <p className="font-medium">Error loading SLOs</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => fetchSLOs(service ? { service } : undefined)}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`slo-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Service Level Objectives
          </h2>
          {service && (
            <p className="text-sm text-gray-600 mt-1">Service: {service}</p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={() => fetchSLOs(service ? { service } : undefined)}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading && (
              <svg
                className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      {reportData && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Total SLOs</div>
            <div className="text-2xl font-bold text-gray-900">
              {reportData.summary.totalSLOs}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Compliant</div>
            <div className="text-2xl font-bold text-green-600">
              {reportData.summary.compliantSLOs}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">At Risk</div>
            <div className="text-2xl font-bold text-red-600">
              {reportData.summary.atRiskSLOs}
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-500">Avg Compliance</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(reportData.summary.averageCompliance)}
            </div>
          </div>
        </div>
      )}

      {/* SLO Cards */}
      {slos.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 48 48"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"
              />
            </svg>
          </div>
          <p className="text-lg">No SLOs found</p>
          <p className="text-sm mt-1">
            {service
              ? `No SLOs configured for service "${service}"`
              : 'No SLOs have been configured yet'}
          </p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create SLO
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportData
            ? reportData.slos.map(
                (sloData: {
                  slo: SLO;
                  compliance: number;
                  errorBudget: ErrorBudget;
                  trend: 'improving' | 'degrading' | 'stable';
                }) => renderSLOCard(sloData),
              )
            : slos.map((slo) =>
                renderSLOCard({
                  slo,
                  compliance: slo.status?.currentSLI || 0,
                  errorBudget: {
                    total: 100,
                    consumed: 0,
                    remaining: 100,
                    consumedPercentage: 0,
                    burnRate: 0,
                    isHealthy: true,
                  },
                  trend: 'stable' as const,
                }),
              )}
        </div>
      )}

      {/* Alert Summary */}
      {slos.length > 0 && (
        <div className="mt-6 bg-white border rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Recent Alerts</h3>
          <div className="space-y-2">
            {[
              {
                id: 1,
                slo: 'API Response Time',
                severity: AlertSeverity.WARNING,
                message: 'SLI below target for 5 minutes',
                timestamp: '2 minutes ago',
              },
              {
                id: 2,
                slo: 'Database Availability',
                severity: AlertSeverity.CRITICAL,
                message: 'Error budget 90% consumed',
                timestamp: '15 minutes ago',
              },
            ].map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.severity === AlertSeverity.CRITICAL
                        ? 'bg-red-500'
                        : alert.severity === AlertSeverity.WARNING
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                    }`}
                  ></div>
                  <div>
                    <div className="font-medium text-sm">{alert.slo}</div>
                    <div className="text-xs text-gray-600">{alert.message}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{alert.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
