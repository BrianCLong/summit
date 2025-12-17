/**
 * MASINTOverlayPanel - MASINT sensor overlay display
 * Shows measurement and signature intelligence data with status indicators.
 */
import React, { useMemo, useState } from 'react';
import type { MASINTOverlay, MASINTDetection } from './types';

interface MASINTOverlayPanelProps {
  overlays: MASINTOverlay[];
  onSelectOverlay?: (overlay: MASINTOverlay) => void;
  onSelectDetection?: (detection: MASINTDetection) => void;
  selectedOverlayId?: string | null;
  className?: string;
}

const SENSOR_ICONS: Record<MASINTOverlay['sensorType'], string> = {
  RADAR: 'R',
  ACOUSTIC: 'A',
  SEISMIC: 'S',
  NUCLEAR: 'N',
  ELECTRO_OPTICAL: 'E',
};

const SENSOR_COLORS: Record<MASINTOverlay['sensorType'], string> = {
  RADAR: 'bg-blue-500',
  ACOUSTIC: 'bg-green-500',
  SEISMIC: 'bg-amber-500',
  NUCLEAR: 'bg-red-500',
  ELECTRO_OPTICAL: 'bg-purple-500',
};

const STATUS_COLORS: Record<MASINTOverlay['status'], string> = {
  ACTIVE: 'bg-green-500',
  DEGRADED: 'bg-yellow-500',
  OFFLINE: 'bg-red-500',
};

export const MASINTOverlayPanel: React.FC<MASINTOverlayPanelProps> = ({
  overlays,
  onSelectOverlay,
  onSelectDetection,
  selectedOverlayId,
  className,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group overlays by sensor type
  const groupedOverlays = useMemo(() => {
    const groups: Record<string, MASINTOverlay[]> = {};
    overlays.forEach((overlay) => {
      if (!groups[overlay.sensorType]) {
        groups[overlay.sensorType] = [];
      }
      groups[overlay.sensorType].push(overlay);
    });
    return groups;
  }, [overlays]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = overlays.filter((o) => o.status === 'ACTIVE').length;
    const totalDetections = overlays.reduce((sum, o) => sum + o.detections.length, 0);
    const recentDetections = overlays.reduce(
      (sum, o) =>
        sum +
        o.detections.filter((d) => Date.now() - d.timestamp < 300000).length,
      0
    );
    return { active, total: overlays.length, totalDetections, recentDetections };
  }, [overlays]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTimestamp = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(ts).toLocaleTimeString();
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 text-slate-100 rounded-lg overflow-hidden ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">MASINT Overlays</span>
          <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 rounded-full">
            {stats.active}/{stats.total} Active
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{stats.totalDetections} detections</span>
          {stats.recentDetections > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded animate-pulse">
              {stats.recentDetections} recent
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedOverlays).map(([sensorType, sensorOverlays]) => (
          <div key={sensorType} className="border-b border-slate-800">
            {/* Sensor type header */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-850 text-sm font-medium text-slate-400">
              <span
                className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold text-white ${SENSOR_COLORS[sensorType as MASINTOverlay['sensorType']]}`}
              >
                {SENSOR_ICONS[sensorType as MASINTOverlay['sensorType']]}
              </span>
              <span>{sensorType.replace('_', ' ')}</span>
              <span className="ml-auto text-xs">{sensorOverlays.length}</span>
            </div>

            {/* Overlays in this group */}
            {sensorOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className={`border-l-2 transition-colors ${
                  selectedOverlayId === overlay.id
                    ? 'border-l-cyan-400 bg-slate-800/50'
                    : 'border-l-transparent hover:bg-slate-800/30'
                }`}
              >
                {/* Overlay row */}
                <button
                  onClick={() => {
                    onSelectOverlay?.(overlay);
                    handleToggleExpand(overlay.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left"
                >
                  {/* Status indicator */}
                  <span
                    className={`w-2 h-2 rounded-full ${STATUS_COLORS[overlay.status]}`}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{overlay.id}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>
                        {overlay.coverage.center.lat.toFixed(2)}, {overlay.coverage.center.lng.toFixed(2)}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>{overlay.coverage.radiusKm}km radius</span>
                    </div>
                  </div>

                  {/* Detection count */}
                  {overlay.detections.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 rounded">
                      {overlay.detections.length}
                    </span>
                  )}

                  {/* Expand indicator */}
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedId === overlay.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded detections */}
                {expandedId === overlay.id && overlay.detections.length > 0 && (
                  <div className="px-4 pb-3 pl-10 space-y-1">
                    {overlay.detections.slice(0, 5).map((detection) => (
                      <button
                        key={detection.id}
                        onClick={() => onSelectDetection?.(detection)}
                        className="w-full flex items-center gap-2 p-2 text-left text-xs bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: `hsl(${detection.confidence * 120}, 80%, 50%)`,
                          }}
                        />
                        <span className="flex-1 truncate">{detection.classification}</span>
                        <span className="text-slate-400">
                          {formatTimestamp(detection.timestamp)}
                        </span>
                        <span className="text-slate-500">
                          {(detection.confidence * 100).toFixed(0)}%
                        </span>
                      </button>
                    ))}
                    {overlay.detections.length > 5 && (
                      <div className="text-center text-xs text-slate-500 py-1">
                        +{overlay.detections.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {overlays.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <svg
              className="w-12 h-12 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-sm">No MASINT overlays available</p>
          </div>
        )}
      </div>

      {/* Footer with legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span>{status.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MASINTOverlayPanel;
