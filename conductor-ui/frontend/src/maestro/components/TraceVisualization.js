import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useMemo } from 'react';
import { useTelemetry, SpanStatus, telemetry } from '../utils/telemetryUtils';
const TraceVisualization = ({
  traceId,
  runId,
  className = '',
  height = 600,
}) => {
  const { getTrace, searchTraces } = useTelemetry();
  const [spans, setSpans] = useState([]);
  const [traceTree, setTraceTree] = useState([]);
  const [selectedSpanId, setSelectedSpanId] = useState(null);
  const [expandedSpans, setExpandedSpans] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('timeline');
  // Fetch trace data
  useEffect(() => {
    const fetchTraceData = async () => {
      if (!traceId && !runId) return;
      setLoading(true);
      setError(null);
      try {
        let traceSpans = [];
        if (traceId) {
          traceSpans = await getTrace(traceId);
        } else if (runId) {
          // Search for traces related to the run
          const searchResults = await searchTraces({
            timeRange: {
              start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
              end: Date.now(),
            },
            tags: { 'maestro.run.id': runId },
          });
          if (searchResults.length > 0) {
            traceSpans = searchResults[0].spans;
          }
        }
        setSpans(traceSpans);
        if (traceSpans.length > 0) {
          const tree = telemetry.buildTraceTree(traceSpans);
          setTraceTree(tree);
          // Auto-expand root spans
          const rootSpanIds = tree.map((node) => node.spanId);
          setExpandedSpans(new Set(rootSpanIds));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load trace data',
        );
      } finally {
        setLoading(false);
      }
    };
    fetchTraceData();
  }, [traceId, runId, getTrace, searchTraces]);
  // Calculate trace metrics
  const traceMetrics = useMemo(() => {
    if (spans.length === 0) return null;
    return telemetry.calculateTraceMetrics(spans);
  }, [spans]);
  // Timeline view calculations
  const timelineData = useMemo(() => {
    if (spans.length === 0) return { spans: [], startTime: 0, endTime: 0 };
    const startTime = Math.min(...spans.map((s) => s.startTime));
    const endTime = Math.max(...spans.map((s) => s.endTime || s.startTime));
    return {
      spans: spans.map((span) => ({
        ...span,
        relativeStart: span.startTime - startTime,
        relativeEnd: (span.endTime || span.startTime) - startTime,
        width:
          (((span.endTime || span.startTime) - span.startTime) /
            (endTime - startTime)) *
          100,
      })),
      startTime,
      endTime,
      totalDuration: endTime - startTime,
    };
  }, [spans]);
  const getStatusColor = (status) => {
    switch (status) {
      case SpanStatus.OK:
        return 'bg-green-500';
      case SpanStatus.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };
  const getSpanColor = (span) => {
    const serviceName = span.resource.attributes['service.name'];
    const colors = [
      'bg-blue-400',
      'bg-purple-400',
      'bg-pink-400',
      'bg-indigo-400',
      'bg-cyan-400',
      'bg-teal-400',
      'bg-emerald-400',
      'bg-lime-400',
      'bg-yellow-400',
      'bg-orange-400',
    ];
    const hash = serviceName
      ? serviceName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
      : 0;
    return colors[hash % colors.length];
  };
  const formatDuration = (durationMs) => {
    if (durationMs < 1000) return `${durationMs.toFixed(2)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(2)}s`;
    return `${(durationMs / 60000).toFixed(2)}m`;
  };
  const toggleSpanExpansion = (spanId) => {
    setExpandedSpans((prev) => {
      const next = new Set(prev);
      if (next.has(spanId)) {
        next.delete(spanId);
      } else {
        next.add(spanId);
      }
      return next;
    });
  };
  const renderTreeView = () => {
    const renderNode = (node, depth = 0) => {
      const isExpanded = expandedSpans.has(node.spanId);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedSpanId === node.spanId;
      return _jsxs(
        'div',
        {
          className: 'trace-node',
          children: [
            _jsxs('div', {
              className: `flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`,
              style: { paddingLeft: `${depth * 20 + 8}px` },
              onClick: () => setSelectedSpanId(node.spanId),
              children: [
                hasChildren &&
                  _jsx('button', {
                    onClick: (e) => {
                      e.stopPropagation();
                      toggleSpanExpansion(node.spanId);
                    },
                    className:
                      'mr-2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600',
                    children: isExpanded ? '−' : '+',
                  }),
                _jsx('div', {
                  className: `w-3 h-3 rounded mr-3 ${getStatusColor(node.status)}`,
                }),
                _jsxs('div', {
                  className: 'flex-1 min-w-0',
                  children: [
                    _jsx('div', {
                      className: 'text-sm font-medium text-gray-900 truncate',
                      children: node.name,
                    }),
                    _jsxs('div', {
                      className: 'text-xs text-gray-500',
                      children: [
                        formatDuration(node.duration),
                        node.attributes['service.name'] &&
                          _jsxs('span', {
                            className: 'ml-2',
                            children: [
                              '\u2022 ',
                              node.attributes['service.name'],
                            ],
                          }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            hasChildren &&
              isExpanded &&
              _jsx('div', {
                className: 'trace-children',
                children: node.children.map((child) =>
                  renderNode(child, depth + 1),
                ),
              }),
          ],
        },
        node.spanId,
      );
    };
    return _jsx('div', {
      className: 'trace-tree overflow-auto',
      style: { height: height - 200 },
      children: traceTree.map((node) => renderNode(node)),
    });
  };
  const renderTimelineView = () => {
    const { spans: timelineSpans, totalDuration } = timelineData;
    return _jsxs('div', {
      className: 'trace-timeline overflow-auto',
      style: { height: height - 200 },
      children: [
        _jsx('div', {
          className: 'timeline-header sticky top-0 bg-white border-b p-2',
          children: _jsxs('div', {
            className: 'text-xs text-gray-500 flex justify-between',
            children: [
              _jsx('span', { children: '0ms' }),
              _jsx('span', { children: formatDuration(totalDuration) }),
            ],
          }),
        }),
        _jsx('div', {
          className: 'timeline-spans space-y-1 p-2',
          children: timelineSpans.map((span, index) =>
            _jsxs(
              'div',
              {
                className: `timeline-span relative h-8 rounded cursor-pointer hover:opacity-80 ${selectedSpanId === span.spanId ? 'ring-2 ring-blue-500' : ''}`,
                onClick: () => setSelectedSpanId(span.spanId),
                children: [
                  _jsx('div', {
                    className: `absolute h-full rounded flex items-center px-2 text-xs text-white font-medium ${getSpanColor(span)}`,
                    style: {
                      left: `${(span.relativeStart / totalDuration) * 100}%`,
                      width: `${Math.max(span.width, 0.5)}%`,
                    },
                    children: _jsx('span', {
                      className: 'truncate',
                      children: span.name,
                    }),
                  }),
                  span.status === SpanStatus.ERROR &&
                    _jsx('div', {
                      className:
                        'absolute right-1 top-1 w-2 h-2 bg-red-500 rounded-full',
                    }),
                ],
              },
              span.spanId,
            ),
          ),
        }),
      ],
    });
  };
  const renderFlamegraph = () => {
    // Simplified flamegraph representation
    const levels = new Map();
    const processNode = (node, level) => {
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(node);
      node.children.forEach((child) => processNode(child, level + 1));
    };
    traceTree.forEach((node) => processNode(node, 0));
    const maxLevel = Math.max(...levels.keys());
    const totalDuration = traceMetrics?.totalDuration || 1;
    return _jsx('div', {
      className: 'flamegraph overflow-auto',
      style: { height: height - 200 },
      children: _jsx('div', {
        className: 'flamegraph-levels space-y-1 p-2',
        children: Array.from({ length: maxLevel + 1 }, (_, level) =>
          _jsx(
            'div',
            {
              className: 'flamegraph-level h-8 relative',
              children: (levels.get(level) || []).map((node) =>
                _jsx(
                  'div',
                  {
                    className: `absolute h-full border border-gray-300 cursor-pointer hover:opacity-80 ${getSpanColor(
                      {
                        ...node,
                        resource: {
                          attributes: {
                            'service.name':
                              node.attributes['service.name'] || 'unknown',
                          },
                        },
                      },
                    )}`,
                    style: {
                      left: `${(node.startTime / totalDuration) * 100}%`,
                      width: `${Math.max((node.duration / totalDuration) * 100, 0.5)}%`,
                    },
                    onClick: () => setSelectedSpanId(node.spanId),
                    title: `${node.name} (${formatDuration(node.duration)})`,
                    children: _jsx('div', {
                      className: 'text-xs text-white font-medium px-1 truncate',
                      children: node.name,
                    }),
                  },
                  node.spanId,
                ),
              ),
            },
            level,
          ),
        ),
      }),
    });
  };
  const selectedSpan = spans.find((s) => s.spanId === selectedSpanId);
  if (loading) {
    return _jsx('div', {
      className: `trace-visualization ${className}`,
      style: { height },
      children: _jsx('div', {
        className: 'flex items-center justify-center h-full',
        children: _jsxs('div', {
          className: 'text-center',
          children: [
            _jsx('div', {
              className:
                'animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2',
            }),
            _jsx('p', {
              className: 'text-sm text-gray-600',
              children: 'Loading trace data...',
            }),
          ],
        }),
      }),
    });
  }
  if (error) {
    return _jsx('div', {
      className: `trace-visualization ${className}`,
      style: { height },
      children: _jsx('div', {
        className: 'flex items-center justify-center h-full',
        children: _jsxs('div', {
          className: 'text-center text-red-600',
          children: [
            _jsx('p', {
              className: 'font-medium',
              children: 'Error loading trace',
            }),
            _jsx('p', { className: 'text-sm mt-1', children: error }),
          ],
        }),
      }),
    });
  }
  if (spans.length === 0) {
    return _jsx('div', {
      className: `trace-visualization ${className}`,
      style: { height },
      children: _jsx('div', {
        className: 'flex items-center justify-center h-full',
        children: _jsxs('div', {
          className: 'text-center text-gray-500',
          children: [
            _jsx('p', { children: 'No trace data available' }),
            _jsx('p', {
              className: 'text-sm mt-1',
              children: traceId
                ? `Trace ${traceId} not found`
                : `No traces found for run ${runId}`,
            }),
          ],
        }),
      }),
    });
  }
  return _jsxs('div', {
    className: `trace-visualization bg-white border rounded-lg ${className}`,
    style: { height },
    children: [
      _jsxs('div', {
        className: 'trace-header border-b p-4',
        children: [
          _jsxs('div', {
            className: 'flex items-center justify-between mb-3',
            children: [
              _jsxs('div', {
                children: [
                  _jsx('h3', {
                    className: 'font-semibold text-gray-900',
                    children: 'Distributed Trace',
                  }),
                  _jsx('p', {
                    className: 'text-sm text-gray-600',
                    children:
                      traceId || spans[0]?.traceId.substring(0, 16) + '...',
                  }),
                ],
              }),
              _jsx('div', {
                className: 'flex space-x-1',
                children: ['timeline', 'tree', 'flamegraph'].map((mode) =>
                  _jsx(
                    'button',
                    {
                      onClick: () => setViewMode(mode),
                      className: `px-3 py-1 text-sm rounded ${
                        viewMode === mode
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`,
                      children: mode.charAt(0).toUpperCase() + mode.slice(1),
                    },
                    mode,
                  ),
                ),
              }),
            ],
          }),
          traceMetrics &&
            _jsxs('div', {
              className: 'grid grid-cols-5 gap-4 text-sm',
              children: [
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'text-gray-500',
                      children: 'Duration',
                    }),
                    _jsx('div', {
                      className: 'font-medium',
                      children: formatDuration(traceMetrics.totalDuration),
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'text-gray-500',
                      children: 'Spans',
                    }),
                    _jsx('div', {
                      className: 'font-medium',
                      children: traceMetrics.spanCount,
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'text-gray-500',
                      children: 'Services',
                    }),
                    _jsx('div', {
                      className: 'font-medium',
                      children: traceMetrics.serviceCount,
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'text-gray-500',
                      children: 'Errors',
                    }),
                    _jsx('div', {
                      className: `font-medium ${traceMetrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`,
                      children: traceMetrics.errorCount,
                    }),
                  ],
                }),
                _jsxs('div', {
                  children: [
                    _jsx('div', {
                      className: 'text-gray-500',
                      children: 'Critical Path',
                    }),
                    _jsxs('div', {
                      className: 'font-medium',
                      children: [traceMetrics.criticalPath.length, ' spans'],
                    }),
                  ],
                }),
              ],
            }),
        ],
      }),
      _jsxs('div', {
        className: 'trace-content flex',
        children: [
          _jsxs('div', {
            className: 'trace-view flex-1',
            children: [
              viewMode === 'timeline' && renderTimelineView(),
              viewMode === 'tree' && renderTreeView(),
              viewMode === 'flamegraph' && renderFlamegraph(),
            ],
          }),
          selectedSpan &&
            _jsx('div', {
              className: 'span-details w-80 border-l bg-gray-50 overflow-auto',
              children: _jsxs('div', {
                className: 'p-4',
                children: [
                  _jsxs('div', {
                    className: 'mb-4',
                    children: [
                      _jsx('h4', {
                        className: 'font-medium text-gray-900 mb-2',
                        children: selectedSpan.name,
                      }),
                      _jsxs('div', {
                        className: 'text-sm text-gray-600 space-y-1',
                        children: [
                          _jsxs('div', {
                            children: [
                              'Duration: ',
                              formatDuration(selectedSpan.duration || 0),
                            ],
                          }),
                          _jsxs('div', {
                            children: [
                              'Start: ',
                              new Date(
                                selectedSpan.startTime,
                              ).toLocaleTimeString(),
                            ],
                          }),
                          _jsxs('div', {
                            children: [
                              'Status:',
                              ' ',
                              _jsx('span', {
                                className: `font-medium ${
                                  selectedSpan.status === SpanStatus.OK
                                    ? 'text-green-600'
                                    : selectedSpan.status === SpanStatus.ERROR
                                      ? 'text-red-600'
                                      : 'text-gray-600'
                                }`,
                                children: SpanStatus[selectedSpan.status],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsxs('div', {
                    className: 'mb-4',
                    children: [
                      _jsx('h5', {
                        className: 'font-medium text-gray-900 mb-2',
                        children: 'Attributes',
                      }),
                      _jsx('div', {
                        className: 'text-xs space-y-1',
                        children: Object.entries(selectedSpan.attributes).map(
                          ([key, value]) =>
                            _jsxs(
                              'div',
                              {
                                className: 'flex justify-between',
                                children: [
                                  _jsxs('span', {
                                    className: 'text-gray-500 break-all',
                                    children: [key, ':'],
                                  }),
                                  _jsx('span', {
                                    className:
                                      'text-gray-900 font-mono ml-2 break-all',
                                    children:
                                      typeof value === 'object'
                                        ? JSON.stringify(value)
                                        : String(value),
                                  }),
                                ],
                              },
                              key,
                            ),
                        ),
                      }),
                    ],
                  }),
                  selectedSpan.events.length > 0 &&
                    _jsxs('div', {
                      className: 'mb-4',
                      children: [
                        _jsx('h5', {
                          className: 'font-medium text-gray-900 mb-2',
                          children: 'Events',
                        }),
                        _jsx('div', {
                          className: 'space-y-2',
                          children: selectedSpan.events.map((event, index) =>
                            _jsxs(
                              'div',
                              {
                                className: 'text-xs border rounded p-2',
                                children: [
                                  _jsx('div', {
                                    className: 'font-medium',
                                    children: event.name,
                                  }),
                                  _jsx('div', {
                                    className: 'text-gray-500',
                                    children: new Date(
                                      event.timestamp,
                                    ).toLocaleTimeString(),
                                  }),
                                  event.attributes &&
                                    _jsx('div', {
                                      className: 'mt-1 space-y-1',
                                      children: Object.entries(
                                        event.attributes,
                                      ).map(([key, value]) =>
                                        _jsxs(
                                          'div',
                                          {
                                            className: 'text-gray-600',
                                            children: [
                                              _jsxs('span', {
                                                className: 'text-gray-500',
                                                children: [key, ':'],
                                              }),
                                              ' ',
                                              String(value),
                                            ],
                                          },
                                          key,
                                        ),
                                      ),
                                    }),
                                ],
                              },
                              index,
                            ),
                          ),
                        }),
                      ],
                    }),
                  selectedSpan.links.length > 0 &&
                    _jsxs('div', {
                      children: [
                        _jsx('h5', {
                          className: 'font-medium text-gray-900 mb-2',
                          children: 'Links',
                        }),
                        _jsx('div', {
                          className: 'space-y-1',
                          children: selectedSpan.links.map((link, index) =>
                            _jsxs(
                              'div',
                              {
                                className: 'text-xs font-mono',
                                children: [
                                  link.traceId.substring(0, 8),
                                  '.../',
                                  link.spanId.substring(0, 8),
                                  '...',
                                ],
                              },
                              index,
                            ),
                          ),
                        }),
                      ],
                    }),
                ],
              }),
            }),
        ],
      }),
    ],
  });
};
export default TraceVisualization;
