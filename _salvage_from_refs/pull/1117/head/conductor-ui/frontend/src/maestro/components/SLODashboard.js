import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { useSLO, AlertSeverity } from '../utils/sloUtils';
const SLODashboard = ({ service, className = '' }) => {
  const { slos, loading, error, fetchSLOs, generateReport } = useSLO();
  const [selectedSLO, setSelectedSLO] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(null);
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
      const timeRangeMap = {
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
  const getStatusColor = (status, compliance, objective) => {
    if (status === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'warning') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (compliance !== undefined && objective !== undefined) {
      if (compliance >= objective) return 'text-green-600 bg-green-50 border-green-200';
      if (compliance >= objective - 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  const formatPercentage = (value) => `${value.toFixed(2)}%`;
  const formatDuration = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return _jsx('span', { className: 'text-green-500', children: '\u2197' });
      case 'degrading':
        return _jsx('span', { className: 'text-red-500', children: '\u2198' });
      default:
        return _jsx('span', { className: 'text-gray-500', children: '\u2192' });
    }
  };
  const renderErrorBudgetBar = (errorBudget) => {
    const percentage = Math.min(100, errorBudget.consumedPercentage);
    const color =
      percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-green-500';
    return _jsx('div', {
      className: 'w-full bg-gray-200 rounded-full h-2',
      children: _jsx('div', {
        className: `h-2 rounded-full transition-all duration-300 ${color}`,
        style: { width: `${percentage}%` },
      }),
    });
  };
  const renderSLOCard = (sloData) => {
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
    return _jsxs(
      'div',
      {
        className: `bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''}`,
        onClick: () => setSelectedSLO(isSelected ? null : slo.id),
        children: [
          _jsxs('div', {
            className: 'flex items-start justify-between mb-3',
            children: [
              _jsxs('div', {
                className: 'flex-1 min-w-0',
                children: [
                  _jsx('h3', {
                    className: 'font-semibold text-gray-900 truncate',
                    children: slo.name,
                  }),
                  _jsx('p', { className: 'text-sm text-gray-600 truncate', children: slo.service }),
                ],
              }),
              _jsxs('div', {
                className: 'flex items-center space-x-2 ml-4',
                children: [
                  getTrendIcon(trend),
                  _jsx('div', {
                    className: `px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`,
                    children: compliance >= slo.objective ? 'Compliant' : 'At Risk',
                  }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'grid grid-cols-2 gap-4 mb-3',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Current SLI' }),
                  _jsx('div', {
                    className: 'text-lg font-bold text-gray-900',
                    children: formatPercentage(compliance),
                  }),
                ],
              }),
              _jsxs('div', {
                children: [
                  _jsx('div', { className: 'text-xs text-gray-500', children: 'Objective' }),
                  _jsx('div', {
                    className: 'text-lg font-bold text-gray-600',
                    children: formatPercentage(slo.objective),
                  }),
                ],
              }),
            ],
          }),
          _jsxs('div', {
            className: 'mb-3',
            children: [
              _jsxs('div', {
                className: 'flex justify-between text-xs text-gray-500 mb-1',
                children: [
                  _jsx('span', { children: 'Error Budget' }),
                  _jsxs('span', {
                    children: [formatPercentage(errorBudget.consumedPercentage), ' consumed'],
                  }),
                ],
              }),
              renderErrorBudgetBar(errorBudget),
            ],
          }),
          errorBudget.exhaustionDate &&
            _jsxs('div', {
              className: 'text-xs text-gray-500',
              children: [
                'Budget exhaustion: ',
                new Date(errorBudget.exhaustionDate).toLocaleDateString(),
              ],
            }),
          isSelected &&
            _jsx('div', {
              className: 'mt-4 pt-3 border-t border-gray-200',
              children: _jsxs('div', {
                className: 'grid grid-cols-2 gap-4 text-xs',
                children: [
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Window:' }),
                      _jsx('span', { className: 'ml-1 font-medium', children: slo.window }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Burn Rate:' }),
                      _jsxs('span', {
                        className: 'ml-1 font-medium',
                        children: [errorBudget.burnRate.toFixed(2), '/hr'],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'Remaining:' }),
                      _jsxs('span', {
                        className: 'ml-1 font-medium',
                        children: [errorBudget.remaining, ' errors'],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    children: [
                      _jsx('span', { className: 'text-gray-500', children: 'SLI Type:' }),
                      _jsx('span', { className: 'ml-1 font-medium', children: slo.sli.type }),
                    ],
                  }),
                ],
              }),
            }),
        ],
      },
      slo.id,
    );
  };
  if (loading && slos.length === 0) {
    return _jsx('div', {
      className: `slo-dashboard ${className}`,
      children: _jsx('div', {
        className: 'flex items-center justify-center h-64',
        children: _jsxs('div', {
          className: 'text-center',
          children: [
            _jsx('div', {
              className:
                'animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2',
            }),
            _jsx('p', { className: 'text-sm text-gray-600', children: 'Loading SLOs...' }),
          ],
        }),
      }),
    });
  }
  if (error) {
    return _jsx('div', {
      className: `slo-dashboard ${className}`,
      children: _jsxs('div', {
        className: 'text-center text-red-600 p-8',
        children: [
          _jsx('p', { className: 'font-medium', children: 'Error loading SLOs' }),
          _jsx('p', { className: 'text-sm mt-1', children: error }),
          _jsx('button', {
            onClick: () => fetchSLOs(service ? { service } : undefined),
            className: 'mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200',
            children: 'Retry',
          }),
        ],
      }),
    });
  }
  return _jsxs('div', {
    className: `slo-dashboard ${className}`,
    children: [
      _jsxs('div', {
        className: 'flex items-center justify-between mb-6',
        children: [
          _jsxs('div', {
            children: [
              _jsx('h2', {
                className: 'text-xl font-bold text-gray-900',
                children: 'Service Level Objectives',
              }),
              service &&
                _jsxs('p', {
                  className: 'text-sm text-gray-600 mt-1',
                  children: ['Service: ', service],
                }),
            ],
          }),
          _jsxs('div', {
            className: 'flex items-center space-x-3',
            children: [
              _jsxs('select', {
                value: timeRange,
                onChange: (e) => setTimeRange(e.target.value),
                className: 'border rounded px-3 py-1 text-sm',
                children: [
                  _jsx('option', { value: '1h', children: 'Last Hour' }),
                  _jsx('option', { value: '24h', children: 'Last 24 Hours' }),
                  _jsx('option', { value: '7d', children: 'Last 7 Days' }),
                  _jsx('option', { value: '30d', children: 'Last 30 Days' }),
                ],
              }),
              _jsxs('button', {
                onClick: () => fetchSLOs(service ? { service } : undefined),
                disabled: loading,
                className:
                  'px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center',
                children: [
                  loading &&
                    _jsxs('svg', {
                      className: 'animate-spin -ml-1 mr-2 h-3 w-3 text-white',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      children: [
                        _jsx('circle', {
                          className: 'opacity-25',
                          cx: '12',
                          cy: '12',
                          r: '10',
                          stroke: 'currentColor',
                          strokeWidth: '4',
                        }),
                        _jsx('path', {
                          className: 'opacity-75',
                          fill: 'currentColor',
                          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z',
                        }),
                      ],
                    }),
                  'Refresh',
                ],
              }),
            ],
          }),
        ],
      }),
      reportData &&
        _jsxs('div', {
          className: 'grid grid-cols-4 gap-4 mb-6',
          children: [
            _jsxs('div', {
              className: 'bg-white border rounded-lg p-4',
              children: [
                _jsx('div', { className: 'text-sm text-gray-500', children: 'Total SLOs' }),
                _jsx('div', {
                  className: 'text-2xl font-bold text-gray-900',
                  children: reportData.summary.totalSLOs,
                }),
              ],
            }),
            _jsxs('div', {
              className: 'bg-white border rounded-lg p-4',
              children: [
                _jsx('div', { className: 'text-sm text-gray-500', children: 'Compliant' }),
                _jsx('div', {
                  className: 'text-2xl font-bold text-green-600',
                  children: reportData.summary.compliantSLOs,
                }),
              ],
            }),
            _jsxs('div', {
              className: 'bg-white border rounded-lg p-4',
              children: [
                _jsx('div', { className: 'text-sm text-gray-500', children: 'At Risk' }),
                _jsx('div', {
                  className: 'text-2xl font-bold text-red-600',
                  children: reportData.summary.atRiskSLOs,
                }),
              ],
            }),
            _jsxs('div', {
              className: 'bg-white border rounded-lg p-4',
              children: [
                _jsx('div', { className: 'text-sm text-gray-500', children: 'Avg Compliance' }),
                _jsx('div', {
                  className: 'text-2xl font-bold text-blue-600',
                  children: formatPercentage(reportData.summary.averageCompliance),
                }),
              ],
            }),
          ],
        }),
      slos.length === 0
        ? _jsxs('div', {
            className: 'text-center text-gray-500 py-12',
            children: [
              _jsx('div', {
                className: 'mb-4',
                children: _jsx('svg', {
                  className: 'mx-auto h-12 w-12 text-gray-400',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 48 48',
                  children: _jsx('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: 2,
                    d: 'M9 19v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10',
                  }),
                }),
              }),
              _jsx('p', { className: 'text-lg', children: 'No SLOs found' }),
              _jsx('p', {
                className: 'text-sm mt-1',
                children: service
                  ? `No SLOs configured for service "${service}"`
                  : 'No SLOs have been configured yet',
              }),
              _jsx('button', {
                className: 'mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
                children: 'Create SLO',
              }),
            ],
          })
        : _jsx('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
            children: reportData
              ? reportData.slos.map((sloData) => renderSLOCard(sloData))
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
                    trend: 'stable',
                  }),
                ),
          }),
      slos.length > 0 &&
        _jsxs('div', {
          className: 'mt-6 bg-white border rounded-lg p-4',
          children: [
            _jsx('h3', {
              className: 'font-semibold text-gray-900 mb-3',
              children: 'Recent Alerts',
            }),
            _jsx('div', {
              className: 'space-y-2',
              children: [
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
              ].map((alert) =>
                _jsxs(
                  'div',
                  {
                    className: 'flex items-center justify-between py-2 px-3 bg-gray-50 rounded',
                    children: [
                      _jsxs('div', {
                        className: 'flex items-center space-x-3',
                        children: [
                          _jsx('div', {
                            className: `w-2 h-2 rounded-full ${
                              alert.severity === AlertSeverity.CRITICAL
                                ? 'bg-red-500'
                                : alert.severity === AlertSeverity.WARNING
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-500'
                            }`,
                          }),
                          _jsxs('div', {
                            children: [
                              _jsx('div', {
                                className: 'font-medium text-sm',
                                children: alert.slo,
                              }),
                              _jsx('div', {
                                className: 'text-xs text-gray-600',
                                children: alert.message,
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsx('div', {
                        className: 'text-xs text-gray-500',
                        children: alert.timestamp,
                      }),
                    ],
                  },
                  alert.id,
                ),
              ),
            }),
          ],
        }),
    ],
  });
};
export default SLODashboard;
