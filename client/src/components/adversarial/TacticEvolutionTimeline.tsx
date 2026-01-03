import React, { useState, useMemo } from 'react';
import type { TacticEvent, MitreTactic, DetectionSeverity } from './types';

export interface TacticEvolutionTimelineProps {
  events: TacticEvent[];
  onSelectEvent?: (event: TacticEvent) => void;
  onFilterTactic?: (tactic: MitreTactic | null) => void;
  selectedEventId?: string;
  highlightTactic?: MitreTactic;
  className?: string;
}

const tacticColors: Record<MitreTactic, string> = {
  reconnaissance: '#94a3b8',
  'resource-development': '#a78bfa',
  'initial-access': '#f87171',
  execution: '#fb923c',
  persistence: '#fbbf24',
  'privilege-escalation': '#a3e635',
  'defense-evasion': '#4ade80',
  'credential-access': '#2dd4bf',
  discovery: '#22d3ee',
  'lateral-movement': '#38bdf8',
  collection: '#60a5fa',
  'command-and-control': '#818cf8',
  exfiltration: '#c084fc',
  impact: '#e879f9',
};

const tacticLabels: Record<MitreTactic, string> = {
  reconnaissance: 'Reconnaissance',
  'resource-development': 'Resource Dev',
  'initial-access': 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  'privilege-escalation': 'Priv Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  discovery: 'Discovery',
  'lateral-movement': 'Lateral Movement',
  collection: 'Collection',
  'command-and-control': 'C2',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
};

const tacticOrder: MitreTactic[] = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact',
];

const severityColors: Record<DetectionSeverity, string> = {
  info: '#64748b',
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export const TacticEvolutionTimeline: React.FC<TacticEvolutionTimelineProps> = ({
  events,
  onSelectEvent,
  onFilterTactic,
  selectedEventId,
  highlightTactic,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'swim-lanes' | 'compact'>('timeline');
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [showDetectedOnly, setShowDetectedOnly] = useState(false);

  const filteredEvents = useMemo(() => {
    let result = [...events];

    if (showDetectedOnly) {
      result = result.filter((e) => e.detected);
    }

    if (timeRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (timeRange) {
        case '24h':
          cutoff.setHours(now.getHours() - 24);
          break;
        case '7d':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
      }
      result = result.filter((e) => new Date(e.timestamp) >= cutoff);
    }

    return result.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [events, showDetectedOnly, timeRange]);

  const eventsByTactic = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        if (!acc[event.tactic]) acc[event.tactic] = [];
        acc[event.tactic].push(event);
        return acc;
      },
      {} as Record<MitreTactic, TacticEvent[]>
    );
  }, [filteredEvents]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimelinePosition = (timestamp: string) => {
    if (filteredEvents.length === 0) return 0;
    const times = filteredEvents.map((e) => new Date(e.timestamp).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const eventTime = new Date(timestamp).getTime();
    if (maxTime === minTime) return 50;
    return ((eventTime - minTime) / (maxTime - minTime)) * 100;
  };

  const stats = useMemo(() => {
    const detected = filteredEvents.filter((e) => e.detected).length;
    const tacticsUsed = new Set(filteredEvents.map((e) => e.tactic)).size;
    return {
      total: filteredEvents.length,
      detected,
      missed: filteredEvents.length - detected,
      detectionRate: filteredEvents.length > 0 ? Math.round((detected / filteredEvents.length) * 100) : 0,
      tacticsUsed,
    };
  }, [filteredEvents]);

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="tactic-evolution-timeline"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tactic Evolution Timeline</h2>
          <div className="flex items-center gap-2">
            {(['timeline', 'swim-lanes', 'compact'] as const).map((mode) => (
              <button
                key={mode}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === mode
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.detected}</div>
            <div className="text-xs text-gray-500">Detected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
            <div className="text-xs text-gray-500">Missed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.detectionRate}%</div>
            <div className="text-xs text-gray-500">Detection Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.tacticsUsed}</div>
            <div className="text-xs text-gray-500">Tactics Used</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
            className="px-3 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showDetectedOnly}
              onChange={(e) => setShowDetectedOnly(e.target.checked)}
              className="rounded"
            />
            Detected only
          </label>
        </div>
      </div>

      {/* Tactic Legend */}
      <div className="px-4 py-2 border-b border-gray-200 flex flex-wrap gap-2">
        {tacticOrder.map((tactic) => (
          <button
            key={tactic}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-opacity ${
              highlightTactic && highlightTactic !== tactic ? 'opacity-40' : ''
            }`}
            style={{ backgroundColor: `${tacticColors[tactic]}20`, color: tacticColors[tactic] }}
            onClick={() => onFilterTactic?.(highlightTactic === tactic ? null : tactic)}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tacticColors[tactic] }}
            />
            {tacticLabels[tactic]}
            {eventsByTactic[tactic] && (
              <span className="ml-1 px-1 bg-white/50 rounded">
                {eventsByTactic[tactic].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Events */}
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`relative pl-10 cursor-pointer ${
                    selectedEventId === event.id ? 'opacity-100' : 'hover:opacity-80'
                  }`}
                  onClick={() => onSelectEvent?.(event)}
                  data-testid={`timeline-event-${event.id}`}
                >
                  {/* Dot */}
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      event.detected ? '' : 'ring-2 ring-red-400'
                    }`}
                    style={{ backgroundColor: tacticColors[event.tactic] }}
                  >
                    {!event.detected && (
                      <span className="text-white text-xs">!</span>
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={`p-3 border rounded-lg ${
                      selectedEventId === event.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded"
                            style={{
                              backgroundColor: `${tacticColors[event.tactic]}20`,
                              color: tacticColors[event.tactic],
                            }}
                          >
                            {tacticLabels[event.tactic]}
                          </span>
                          <span className="font-mono text-sm text-gray-700">
                            {event.technique}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(event.timestamp)}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: severityColors[event.severity] }}
                          />
                          <span className="text-xs text-gray-500">
                            {event.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      {event.adversary && (
                        <span className="text-purple-600 font-medium">
                          {event.adversary}
                        </span>
                      )}
                      {event.campaign && (
                        <span className="text-blue-600">{event.campaign}</span>
                      )}
                      <span
                        className={`px-1.5 py-0.5 rounded ${
                          event.detected
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {event.detected ? 'Detected' : 'Missed'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Swim Lanes View */}
      {viewMode === 'swim-lanes' && (
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {tacticOrder.map((tactic) => {
              const tacticEvents = eventsByTactic[tactic] || [];
              if (tacticEvents.length === 0 && !highlightTactic) return null;

              return (
                <div
                  key={tactic}
                  className={`flex items-center border-b border-gray-100 py-2 ${
                    highlightTactic && highlightTactic !== tactic ? 'opacity-40' : ''
                  }`}
                >
                  <div className="w-32 flex-shrink-0 pr-4">
                    <div
                      className="text-xs font-medium"
                      style={{ color: tacticColors[tactic] }}
                    >
                      {tacticLabels[tactic]}
                    </div>
                  </div>
                  <div className="flex-1 relative h-8">
                    {/* Lane background */}
                    <div
                      className="absolute inset-0 rounded"
                      style={{ backgroundColor: `${tacticColors[tactic]}10` }}
                    />
                    {/* Events */}
                    {tacticEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute top-1 w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-offset-1"
                        style={{
                          left: `${getTimelinePosition(event.timestamp)}%`,
                          backgroundColor: tacticColors[tactic],
                          borderColor: event.detected ? 'transparent' : '#ef4444',
                          borderWidth: event.detected ? 0 : 2,
                        }}
                        onClick={() => onSelectEvent?.(event)}
                        title={`${event.technique} - ${formatTimestamp(event.timestamp)}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact View */}
      {viewMode === 'compact' && (
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`px-2 py-1 rounded cursor-pointer text-xs flex items-center gap-1 ${
                  selectedEventId === event.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  backgroundColor: `${tacticColors[event.tactic]}20`,
                  color: tacticColors[event.tactic],
                }}
                onClick={() => onSelectEvent?.(event)}
                title={event.description}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    event.detected ? '' : 'ring-1 ring-red-500'
                  }`}
                  style={{ backgroundColor: tacticColors[event.tactic] }}
                />
                {event.technique}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No tactic events found for the selected filters.</p>
        </div>
      )}
    </div>
  );
};

export default TacticEvolutionTimeline;
