import React, { useState, useMemo } from 'react';
import type { Detection, DetectionSeverity, DetectionStatus, MitreTactic } from './types';

export interface ThreatDetectionPanelProps {
  detections: Detection[];
  onSelectDetection?: (detection: Detection) => void;
  onStatusChange?: (detectionId: string, status: DetectionStatus) => void;
  onAssign?: (detectionId: string, assignee: string) => void;
  onEscalate?: (detection: Detection) => void;
  selectedId?: string;
  className?: string;
}

const severityColors: Record<DetectionSeverity, string> = {
  info: 'bg-gray-100 text-gray-800',
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const severityIcons: Record<DetectionSeverity, string> = {
  info: '\u2139\uFE0F',
  low: '\u26A0\uFE0F',
  medium: '\u26A0\uFE0F',
  high: '\u{1F6A8}',
  critical: '\u{1F6D1}',
};

const statusColors: Record<DetectionStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  investigating: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-red-100 text-red-800',
  'false-positive': 'bg-gray-100 text-gray-800',
  resolved: 'bg-green-100 text-green-800',
};

const tacticLabels: Record<MitreTactic, string> = {
  reconnaissance: 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  discovery: 'Discovery',
  'lateral-movement': 'Lateral Movement',
  collection: 'Collection',
  'command-and-control': 'Command & Control',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
};

type SortField = 'timestamp' | 'severity' | 'status';
type SortDirection = 'asc' | 'desc';

export const ThreatDetectionPanel: React.FC<ThreatDetectionPanelProps> = ({
  detections,
  onSelectDetection,
  onStatusChange,
  onAssign: _onAssign,
  onEscalate,
  selectedId,
  className = '',
}) => {
  // Note: _onAssign is available for future assignee functionality
  void _onAssign;
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<DetectionSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DetectionStatus | 'all'>('all');
  const [tacticFilter, setTacticFilter] = useState<MitreTactic | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const severityOrder: Record<DetectionSeverity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };

  const filteredAndSortedDetections = useMemo(() => {
    let result = [...detections];

    // Apply filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query) ||
          d.technique.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== 'all') {
      result = result.filter((d) => d.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter);
    }

    if (tacticFilter !== 'all') {
      result = result.filter((d) => d.tactic === tacticFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'severity':
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections, searchQuery, severityFilter, statusFilter, tacticFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const stats = useMemo(() => {
    const bySeverity = detections.reduce(
      (acc, d) => {
        acc[d.severity] = (acc[d.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byStatus = detections.reduce(
      (acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { bySeverity, byStatus };
  }, [detections]);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="threat-detection-panel">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Threat Detections</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {filteredAndSortedDetections.length} of {detections.length}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">Critical: {stats.bySeverity.critical || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-sm text-gray-600">High: {stats.bySeverity.high || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-gray-600">Medium: {stats.bySeverity.medium || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-600">New: {stats.byStatus.new || 0}</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search detections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as DetectionSeverity | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DetectionStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="investigating">Investigating</option>
            <option value="confirmed">Confirmed</option>
            <option value="false-positive">False Positive</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={tacticFilter}
            onChange={(e) => setTacticFilter(e.target.value as MitreTactic | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Tactics</option>
            {Object.entries(tacticLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Detection List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {filteredAndSortedDetections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No detections found matching your criteria.</p>
          </div>
        ) : (
          filteredAndSortedDetections.map((detection) => (
            <div
              key={detection.id}
              className={`p-4 cursor-pointer transition-colors ${
                selectedId === detection.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => onSelectDetection?.(detection)}
              data-testid={`detection-${detection.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{severityIcons[detection.severity]}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{detection.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{detection.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityColors[detection.severity]}`}>
                    {detection.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[detection.status]}`}>
                    {detection.status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTimestamp(detection.timestamp)}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  {detection.technique}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {tacticLabels[detection.tactic]}
                </span>
                {detection.adversary && (
                  <span className="text-purple-600 font-medium">{detection.adversary}</span>
                )}
              </div>

              {/* Expanded Details */}
              {expandedId === detection.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {/* Affected Assets */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Affected Assets</h4>
                    <div className="flex flex-wrap gap-1">
                      {detection.affectedAssets.map((asset) => (
                        <span key={asset} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                          {asset}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Indicators */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Indicators</h4>
                    <div className="flex flex-wrap gap-1">
                      {detection.indicators.map((indicator) => (
                        <span key={indicator} className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded font-mono">
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Evidence */}
                  {detection.evidence.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                        Evidence ({detection.evidence.length})
                      </h4>
                      <div className="space-y-1">
                        {detection.evidence.slice(0, 3).map((ev) => (
                          <div key={ev.id} className="flex items-center gap-2 text-xs">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                              {ev.type}
                            </span>
                            <span className="text-gray-600 truncate">{ev.source}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {onStatusChange && detection.status === 'new' && (
                      <button
                        className="px-3 py-1 text-sm font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(detection.id, 'investigating');
                        }}
                      >
                        Investigate
                      </button>
                    )}
                    {onEscalate && (
                      <button
                        className="px-3 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEscalate(detection);
                        }}
                      >
                        Escalate
                      </button>
                    )}
                    {onStatusChange && detection.status !== 'resolved' && (
                      <button
                        className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStatusChange(detection.id, 'resolved');
                        }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Expand Toggle */}
              <button
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedId(expandedId === detection.id ? null : detection.id);
                }}
              >
                {expandedId === detection.id ? 'Show less' : 'Show more'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Sort Controls */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center gap-4">
        <span className="text-sm text-gray-500">Sort by:</span>
        {(['timestamp', 'severity', 'status'] as SortField[]).map((field) => (
          <button
            key={field}
            className={`text-sm ${
              sortField === field ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
            onClick={() => handleSort(field)}
          >
            {field.charAt(0).toUpperCase() + field.slice(1)}
            {sortField === field && (
              <span className="ml-1">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreatDetectionPanel;
