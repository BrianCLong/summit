import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry, SpanData, TraceNode, SpanStatus, telemetry } from '../utils/telemetryUtils';

interface TraceVisualizationProps {
  traceId?: string;
  runId?: string;
  className?: string;
  height?: number;
}

const TraceVisualization: React.FC<TraceVisualizationProps> = ({
  traceId,
  runId,
  className = '',
  height = 600,
}) => {
  const { getTrace, searchTraces } = useTelemetry();
  const [spans, setSpans] = useState<SpanData[]>([]);
  const [traceTree, setTraceTree] = useState<TraceNode[]>([]);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'tree' | 'flamegraph'>('timeline');

  // Fetch trace data
  useEffect(() => {
    const fetchTraceData = async () => {
      if (!traceId && !runId) return;

      setLoading(true);
      setError(null);

      try {
        let traceSpans: SpanData[] = [];

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
        setError(err instanceof Error ? err.message : 'Failed to load trace data');
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
        width: (((span.endTime || span.startTime) - span.startTime) / (endTime - startTime)) * 100,
      })),
      startTime,
      endTime,
      totalDuration: endTime - startTime,
    };
  }, [spans]);

  const getStatusColor = (status: SpanStatus) => {
    switch (status) {
      case SpanStatus.OK:
        return 'bg-green-500';
      case SpanStatus.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getSpanColor = (span: SpanData) => {
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
    const hash = serviceName ? serviceName.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    return colors[hash % colors.length];
  };

  const formatDuration = (durationMs: number) => {
    if (durationMs < 1000) return `${durationMs.toFixed(2)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(2)}s`;
    return `${(durationMs / 60000).toFixed(2)}m`;
  };

  const toggleSpanExpansion = (spanId: string) => {
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
    const renderNode = (node: TraceNode, depth: number = 0): React.ReactNode => {
      const isExpanded = expandedSpans.has(node.spanId);
      const hasChildren = node.children.length > 0;
      const isSelected = selectedSpanId === node.spanId;

      return (
        <div key={node.spanId} className="trace-node">
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer ${
              isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => setSelectedSpanId(node.spanId)}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSpanExpansion(node.spanId);
                }}
                className="mr-2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}

            <div className={`w-3 h-3 rounded mr-3 ${getStatusColor(node.status)}`}></div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{node.name}</div>
              <div className="text-xs text-gray-500">
                {formatDuration(node.duration)}
                {node.attributes['service.name'] && (
                  <span className="ml-2">• {node.attributes['service.name']}</span>
                )}
              </div>
            </div>
          </div>

          {hasChildren && isExpanded && (
            <div className="trace-children">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="trace-tree overflow-auto" style={{ height: height - 200 }}>
        {traceTree.map((node) => renderNode(node))}
      </div>
    );
  };

  const renderTimelineView = () => {
    const { spans: timelineSpans, totalDuration } = timelineData;

    return (
      <div className="trace-timeline overflow-auto" style={{ height: height - 200 }}>
        <div className="timeline-header sticky top-0 bg-white border-b p-2">
          <div className="text-xs text-gray-500 flex justify-between">
            <span>0ms</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>

        <div className="timeline-spans space-y-1 p-2">
          {timelineSpans.map((span, index) => (
            <div
              key={span.spanId}
              className={`timeline-span relative h-8 rounded cursor-pointer hover:opacity-80 ${
                selectedSpanId === span.spanId ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedSpanId(span.spanId)}
            >
              <div
                className={`absolute h-full rounded flex items-center px-2 text-xs text-white font-medium ${getSpanColor(span)}`}
                style={{
                  left: `${(span.relativeStart / totalDuration) * 100}%`,
                  width: `${Math.max(span.width, 0.5)}%`,
                }}
              >
                <span className="truncate">{span.name}</span>
              </div>

              {span.status === SpanStatus.ERROR && (
                <div className="absolute right-1 top-1 w-2 h-2 bg-red-500 rounded-full"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderFlamegraph = () => {
    // Simplified flamegraph representation
    const levels = new Map<number, TraceNode[]>();

    const processNode = (node: TraceNode, level: number) => {
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
      node.children.forEach((child) => processNode(child, level + 1));
    };

    traceTree.forEach((node) => processNode(node, 0));

    const maxLevel = Math.max(...levels.keys());
    const totalDuration = traceMetrics?.totalDuration || 1;

    return (
      <div className="flamegraph overflow-auto" style={{ height: height - 200 }}>
        <div className="flamegraph-levels space-y-1 p-2">
          {Array.from({ length: maxLevel + 1 }, (_, level) => (
            <div key={level} className="flamegraph-level h-8 relative">
              {(levels.get(level) || []).map((node) => (
                <div
                  key={node.spanId}
                  className={`absolute h-full border border-gray-300 cursor-pointer hover:opacity-80 ${getSpanColor(
                    {
                      ...node,
                      resource: {
                        attributes: {
                          'service.name': node.attributes['service.name'] || 'unknown',
                        },
                      },
                    } as SpanData,
                  )}`}
                  style={{
                    left: `${(node.startTime / totalDuration) * 100}%`,
                    width: `${Math.max((node.duration / totalDuration) * 100, 0.5)}%`,
                  }}
                  onClick={() => setSelectedSpanId(node.spanId)}
                  title={`${node.name} (${formatDuration(node.duration)})`}
                >
                  <div className="text-xs text-white font-medium px-1 truncate">{node.name}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedSpan = spans.find((s) => s.spanId === selectedSpanId);

  if (loading) {
    return (
      <div className={`trace-visualization ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading trace data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`trace-visualization ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading trace</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (spans.length === 0) {
    return (
      <div className={`trace-visualization ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <p>No trace data available</p>
            <p className="text-sm mt-1">
              {traceId ? `Trace ${traceId} not found` : `No traces found for run ${runId}`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`trace-visualization bg-white border rounded-lg ${className}`}
      style={{ height }}
    >
      {/* Header */}
      <div className="trace-header border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">Distributed Trace</h3>
            <p className="text-sm text-gray-600">
              {traceId || spans[0]?.traceId.substring(0, 16) + '...'}
            </p>
          </div>

          <div className="flex space-x-1">
            {['timeline', 'tree', 'flamegraph'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === mode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {traceMetrics && (
          <div className="grid grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Duration</div>
              <div className="font-medium">{formatDuration(traceMetrics.totalDuration)}</div>
            </div>
            <div>
              <div className="text-gray-500">Spans</div>
              <div className="font-medium">{traceMetrics.spanCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Services</div>
              <div className="font-medium">{traceMetrics.serviceCount}</div>
            </div>
            <div>
              <div className="text-gray-500">Errors</div>
              <div
                className={`font-medium ${traceMetrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {traceMetrics.errorCount}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Critical Path</div>
              <div className="font-medium">{traceMetrics.criticalPath.length} spans</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="trace-content flex">
        <div className="trace-view flex-1">
          {viewMode === 'timeline' && renderTimelineView()}
          {viewMode === 'tree' && renderTreeView()}
          {viewMode === 'flamegraph' && renderFlamegraph()}
        </div>

        {/* Span Details Sidebar */}
        {selectedSpan && (
          <div className="span-details w-80 border-l bg-gray-50 overflow-auto">
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{selectedSpan.name}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Duration: {formatDuration(selectedSpan.duration || 0)}</div>
                  <div>Start: {new Date(selectedSpan.startTime).toLocaleTimeString()}</div>
                  <div>
                    Status:{' '}
                    <span
                      className={`font-medium ${
                        selectedSpan.status === SpanStatus.OK
                          ? 'text-green-600'
                          : selectedSpan.status === SpanStatus.ERROR
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {SpanStatus[selectedSpan.status]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attributes */}
              <div className="mb-4">
                <h5 className="font-medium text-gray-900 mb-2">Attributes</h5>
                <div className="text-xs space-y-1">
                  {Object.entries(selectedSpan.attributes).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-500 break-all">{key}:</span>
                      <span className="text-gray-900 font-mono ml-2 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Events */}
              {selectedSpan.events.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Events</h5>
                  <div className="space-y-2">
                    {selectedSpan.events.map((event, index) => (
                      <div key={index} className="text-xs border rounded p-2">
                        <div className="font-medium">{event.name}</div>
                        <div className="text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                        {event.attributes && (
                          <div className="mt-1 space-y-1">
                            {Object.entries(event.attributes).map(([key, value]) => (
                              <div key={key} className="text-gray-600">
                                <span className="text-gray-500">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {selectedSpan.links.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Links</h5>
                  <div className="space-y-1">
                    {selectedSpan.links.map((link, index) => (
                      <div key={index} className="text-xs font-mono">
                        {link.traceId.substring(0, 8)}.../{link.spanId.substring(0, 8)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceVisualization;
