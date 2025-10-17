import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../ToastContainer';

interface TimelineEvent {
  id: string;
  timestamp: number;
  title: string;
  description: string;
  type:
    | 'communication'
    | 'financial'
    | 'location'
    | 'system'
    | 'user_action'
    | 'threat'
    | 'investigation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  entities: string[];
  metadata?: Record<string, unknown>;
  source?: string;
  confidence: number;
}

interface TimeCluster {
  id: string;
  startTime: number;
  endTime: number;
  events: TimelineEvent[];
  intensity: number;
  anomaly: boolean;
}

type NormalizedTimeRange = {
  start: number;
  end: number;
};

type SupportedTimeRange =
  | NormalizedTimeRange
  | {
      min: number;
      max: number;
    };

interface TemporalAnalysisProps {
  events: TimelineEvent[];
  width?: number;
  height?: number;
  timeRange?: SupportedTimeRange;
  onEventClick?: (event: TimelineEvent) => void;
  onTimeRangeChange?: (range: { start: number; end: number }) => void;
  showClusters?: boolean;
  showAnomalies?: boolean;
  filters?: {
    eventTypes?: string[];
    severities?: string[];
    entities?: string[];
    minConfidence?: number;
  };
  className?: string;
  enableZoom?: boolean;
  investigationId?: string;
  onEventSelect?: (event: unknown) => void;
}

const TemporalAnalysis: React.FC<TemporalAnalysisProps> = ({
  events,
  width = 1000,
  height = 400,
  timeRange,
  onEventClick,
  onTimeRangeChange,
  showClusters = true,
  showAnomalies = true,
  filters,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStart, setViewportStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 });

  const toast = useToast();

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (filters) {
      if (filters.eventTypes?.length) {
        filtered = filtered.filter((e) => filters.eventTypes!.includes(e.type));
      }
      if (filters.severities?.length) {
        filtered = filtered.filter((e) =>
          filters.severities!.includes(e.severity),
        );
      }
      if (filters.entities?.length) {
        filtered = filtered.filter((e) =>
          e.entities.some((entity) => filters.entities!.includes(entity)),
        );
      }
      if (filters.minConfidence !== undefined) {
        filtered = filtered.filter(
          (e) => e.confidence >= filters.minConfidence!,
        );
      }
    }

    return filtered.sort((a, b) => a.timestamp - b.timestamp);
  }, [events, filters]);

  // Calculate time bounds
  const timeBounds = useMemo(() => {
    if (filteredEvents.length === 0) {
      const now = Date.now();
      return { min: now - 24 * 60 * 60 * 1000, max: now };
    }

    const min = Math.min(...filteredEvents.map((e) => e.timestamp));
    const max = Math.max(...filteredEvents.map((e) => e.timestamp));
    const padding = (max - min) * 0.05;

    return {
      min: min - padding,
      max: max + padding,
    };
  }, [filteredEvents]);

  // Calculate effective time range
  const effectiveTimeRange: NormalizedTimeRange = useMemo(() => {
    if (timeRange) {
      if ('start' in timeRange && 'end' in timeRange) {
        return { start: timeRange.start, end: timeRange.end };
      }
      if ('min' in timeRange && 'max' in timeRange) {
        return { start: timeRange.min, end: timeRange.max };
      }
    }

    return { start: timeBounds.min, end: timeBounds.max };
  }, [timeBounds.max, timeBounds.min, timeRange]);
  const timeSpan = effectiveTimeRange.end - effectiveTimeRange.start;
  const viewportEnd = viewportStart + timeSpan / zoomLevel;

  // Detect event clusters
  const eventClusters = useMemo(() => {
    if (!showClusters) return [];

    const clusters: TimeCluster[] = [];
    const clusterWindow = timeSpan * 0.02; // 2% of total time span
    const minEventsForCluster = 3;

    const sortedEvents = [...filteredEvents].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    let currentCluster: TimelineEvent[] = [];
    let clusterStart = 0;

    sortedEvents.forEach((event, index) => {
      if (currentCluster.length === 0) {
        currentCluster = [event];
        clusterStart = event.timestamp;
      } else {
        const timeDiff = event.timestamp - clusterStart;
        if (timeDiff <= clusterWindow) {
          currentCluster.push(event);
        } else {
          // Finalize current cluster
          if (currentCluster.length >= minEventsForCluster) {
            clusters.push({
              id: `cluster-${clusters.length}`,
              startTime: clusterStart,
              endTime: currentCluster[currentCluster.length - 1].timestamp,
              events: [...currentCluster],
              intensity: currentCluster.length,
              anomaly: currentCluster.some((e) => e.severity === 'critical'),
            });
          }

          // Start new cluster
          currentCluster = [event];
          clusterStart = event.timestamp;
        }
      }

      // Handle last cluster
      if (
        index === sortedEvents.length - 1 &&
        currentCluster.length >= minEventsForCluster
      ) {
        clusters.push({
          id: `cluster-${clusters.length}`,
          startTime: clusterStart,
          endTime: currentCluster[currentCluster.length - 1].timestamp,
          events: [...currentCluster],
          intensity: currentCluster.length,
          anomaly: currentCluster.some((e) => e.severity === 'critical'),
        });
      }
    });

    return clusters;
  }, [filteredEvents, showClusters, timeSpan]);

  // Detect temporal anomalies
  const anomalies = useMemo(() => {
    if (!showAnomalies) return [];

    const anomalousEvents: TimelineEvent[] = [];
    const timeWindow = timeSpan * 0.01; // 1% of time span
    const normalActivityThreshold = 2;

    filteredEvents.forEach((event) => {
      const windowStart = event.timestamp - timeWindow;
      const windowEnd = event.timestamp + timeWindow;

      const eventsInWindow = filteredEvents.filter(
        (e) =>
          e.timestamp >= windowStart &&
          e.timestamp <= windowEnd &&
          e.id !== event.id,
      );

      const highSeverityInWindow = eventsInWindow.filter(
        (e) => e.severity === 'high' || e.severity === 'critical',
      );

      // Mark as anomaly if unusual activity pattern
      if (
        eventsInWindow.length > normalActivityThreshold * 3 ||
        highSeverityInWindow.length > normalActivityThreshold ||
        (event.severity === 'critical' && eventsInWindow.length === 0)
      ) {
        anomalousEvents.push(event);
      }
    });

    return anomalousEvents;
  }, [filteredEvents, showAnomalies, timeSpan]);

  // Convert time to canvas X coordinate
  const timeToX = (timestamp: number): number => {
    const normalizedTime =
      (timestamp - viewportStart) / (viewportEnd - viewportStart);
    return normalizedTime * width;
  };

  // Convert canvas X to time
  const xToTime = (x: number): number => {
    const normalizedX = x / width;
    return viewportStart + normalizedX * (viewportEnd - viewportStart);
  };

  // Get event color
  const getEventColor = (event: TimelineEvent): string => {
    const colors = {
      communication: '#3B82F6',
      financial: '#10B981',
      location: '#F59E0B',
      system: '#8B5CF6',
      user_action: '#06B6D4',
      threat: '#EF4444',
      investigation: '#6366F1',
    };

    return colors[event.type] || '#6B7280';
  };

  // Get severity opacity
  const getSeverityOpacity = (severity: string): number => {
    switch (severity) {
      case 'critical':
        return 1.0;
      case 'high':
        return 0.8;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.4;
      default:
        return 0.5;
    }
  };

  // Mouse event handlers
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = xToTime(x);

    // Check if clicking on an event
    const clickedEvent = filteredEvents.find((e) => {
      const eventX = timeToX(e.timestamp);
      return Math.abs(x - eventX) < 10;
    });

    if (clickedEvent) {
      onEventClick?.(clickedEvent);
      setSelectedEvents(new Set([clickedEvent.id]));
    } else {
      setIsDragging(true);
      setDragStart({ x, time: clickTime });
      setSelectedEvents(new Set());
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = event.clientX - rect.left;

    if (isDragging) {
      const timeDiff = xToTime(dragStart.x) - xToTime(x);
      const newViewportStart = Math.max(
        timeBounds.min,
        Math.min(
          timeBounds.max - (viewportEnd - viewportStart),
          viewportStart + timeDiff,
        ),
      );
      setViewportStart(newViewportStart);
    } else {
      // Handle hover
      const hoveredEvent = filteredEvents.find((e) => {
        const eventX = timeToX(e.timestamp);
        return Math.abs(x - eventX) < 15;
      });
      setHoveredEvent(hoveredEvent || null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const delta = event.deltaY * -0.001;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  // Drawing function
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw time axis
    const axisY = height - 40;
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(width, axisY);
    ctx.stroke();

    // Draw time labels
    const timeStep = (viewportEnd - viewportStart) / 10;
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    for (let i = 0; i <= 10; i++) {
      const time = viewportStart + i * timeStep;
      const x = (i / 10) * width;
      const date = new Date(time);
      const label = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      ctx.fillText(label, x, axisY + 15);

      // Draw tick marks
      ctx.strokeStyle = '#D1D5DB';
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 5);
      ctx.stroke();
    }

    // Draw clusters
    if (showClusters) {
      eventClusters.forEach((cluster) => {
        const startX = timeToX(cluster.startTime);
        const endX = timeToX(cluster.endTime);

        if (startX < width && endX > 0) {
          ctx.fillStyle = cluster.anomaly
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(59, 130, 246, 0.1)';
          ctx.fillRect(
            Math.max(0, startX),
            50,
            Math.min(width, endX) - Math.max(0, startX),
            axisY - 50,
          );

          // Cluster label
          const centerX = (startX + endX) / 2;
          if (centerX > 0 && centerX < width) {
            ctx.fillStyle = cluster.anomaly ? '#DC2626' : '#2563EB';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(
              `Cluster: ${cluster.events.length} events`,
              centerX,
              65,
            );
          }
        }
      });
    }

    // Draw event lanes by type
    const eventTypes = [
      'threat',
      'system',
      'communication',
      'financial',
      'location',
      'user_action',
      'investigation',
    ];
    const laneHeight = (axisY - 80) / eventTypes.length;

    eventTypes.forEach((type, index) => {
      const laneY = 80 + index * laneHeight;
      const eventsOfType = filteredEvents.filter((e) => e.type === type);

      // Draw lane background
      ctx.fillStyle = index % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      ctx.fillRect(0, laneY, width, laneHeight);

      // Lane label
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1), 5, laneY + 15);

      // Draw events in this lane
      eventsOfType.forEach((event) => {
        const x = timeToX(event.timestamp);

        if (x >= 0 && x <= width) {
          const isSelected = selectedEvents.has(event.id);
          const isHovered = hoveredEvent?.id === event.id;
          const isAnomaly = anomalies.some((a) => a.id === event.id);

          // Event marker
          const radius = isSelected || isHovered ? 6 : 4;
          const centerY = laneY + laneHeight / 2;

          ctx.fillStyle = getEventColor(event);
          ctx.globalAlpha = getSeverityOpacity(event.severity);

          if (isAnomaly) {
            // Draw anomaly indicator
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, centerY, radius + 2, 0, 2 * Math.PI);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(x, centerY, radius, 0, 2 * Math.PI);
          ctx.fill();

          if (isSelected || isHovered) {
            ctx.strokeStyle = isSelected ? '#1D4ED8' : '#F59E0B';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.stroke();
          }

          ctx.globalAlpha = 1;

          // Draw severity indicator
          if (event.severity === 'critical') {
            ctx.fillStyle = '#DC2626';
            ctx.beginPath();
            ctx.arc(x + 3, centerY - 3, 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      });
    });

    // Draw legend
    const legendY = 20;
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Event Types:', 10, legendY);

    let legendX = 100;
    eventTypes.forEach((type) => {
      const color = getEventColor({ type } as TimelineEvent);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(legendX, legendY - 4, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#374151';
      ctx.fillText(type, legendX + 10, legendY);

      legendX += ctx.measureText(type).width + 25;
    });
  };

  // Animation loop
  useEffect(() => {
    const animationLoop = () => {
      draw();
      requestAnimationFrame(animationLoop);
    };

    requestAnimationFrame(animationLoop);
  }, [
    filteredEvents,
    viewportStart,
    viewportEnd,
    zoomLevel,
    selectedEvents,
    hoveredEvent,
    eventClusters,
    anomalies,
    showClusters,
    showAnomalies,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setViewportStart((prev) =>
            Math.max(timeBounds.min, prev - timeSpan * 0.1),
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          setViewportStart((prev) =>
            Math.min(
              timeBounds.max - (viewportEnd - viewportStart),
              prev + timeSpan * 0.1,
            ),
          );
          break;
        case '+':
        case '=':
          event.preventDefault();
          setZoomLevel((prev) => Math.min(10, prev * 1.2));
          break;
        case '-':
          event.preventDefault();
          setZoomLevel((prev) => Math.max(0.1, prev / 1.2));
          break;
        case 'Home':
          event.preventDefault();
          setViewportStart(timeBounds.min);
          setZoomLevel(1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [timeBounds, timeSpan, viewportEnd, viewportStart]);

  return (
    <div className={`temporal-analysis ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">Temporal Analysis</h3>
          <span className="text-sm text-gray-600">
            {filteredEvents.length} events | Zoom: {zoomLevel.toFixed(1)}x
          </span>
          {eventClusters.length > 0 && (
            <span className="text-sm text-blue-600">
              {eventClusters.length} clusters detected
            </span>
          )}
          {anomalies.length > 0 && (
            <span className="text-sm text-red-600">
              {anomalies.length} anomalies detected
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setZoomLevel((prev) => Math.min(10, prev * 1.5))}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          >
            🔍+
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(0.1, prev / 1.5))}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          >
            🔍-
          </button>
          <button
            onClick={() => {
              setViewportStart(timeBounds.min);
              setZoomLevel(1);
            }}
            className="px-3 py-1 bg-white border rounded hover:bg-gray-50 text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Timeline Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="border rounded-lg cursor-crosshair"
          style={{ backgroundColor: 'white' }}
        />

        {/* Event Details Tooltip */}
        {hoveredEvent && (
          <div className="absolute top-2 right-2 bg-black text-white rounded-lg p-3 text-sm max-w-xs z-10">
            <div className="font-medium">{hoveredEvent.title}</div>
            <div className="text-xs opacity-75 mt-1">
              {new Date(hoveredEvent.timestamp).toLocaleString()}
            </div>
            <div className="text-xs opacity-75">
              Type: {hoveredEvent.type} | Severity: {hoveredEvent.severity}
            </div>
            <div className="text-xs opacity-75">
              Confidence: {Math.round(hoveredEvent.confidence)}%
            </div>
            {hoveredEvent.entities.length > 0 && (
              <div className="text-xs opacity-75 mt-1">
                Entities: {hoveredEvent.entities.join(', ')}
              </div>
            )}
            <div className="text-xs mt-1">{hoveredEvent.description}</div>
          </div>
        )}
      </div>

      {/* Timeline Statistics */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-white p-3 rounded-lg border">
          <div className="font-medium text-gray-900">Total Events</div>
          <div className="text-2xl font-bold text-blue-600">
            {filteredEvents.length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="font-medium text-gray-900">Critical Events</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredEvents.filter((e) => e.severity === 'critical').length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="font-medium text-gray-900">Event Clusters</div>
          <div className="text-2xl font-bold text-green-600">
            {eventClusters.length}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg border">
          <div className="font-medium text-gray-900">Anomalies</div>
          <div className="text-2xl font-bold text-orange-600">
            {anomalies.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalysis;
