/**
 * AgenticDemodulationPanel - AI-powered signal demodulation control
 * Manages autonomous demodulation agents with real-time status and results.
 */
import React, { useState, useCallback, useMemo } from 'react';
import type {
  DemodulationTask,
  DemodulationResult,
  SignalStream,
  ModulationType,
} from './types';

interface AgenticDemodulationPanelProps {
  tasks: DemodulationTask[];
  availableStreams: SignalStream[];
  onStartDemodulation?: (streamId: string) => void;
  onCancelTask?: (taskId: string) => void;
  onViewResult?: (result: DemodulationResult) => void;
  className?: string;
}

const MODULATION_BADGES: Record<ModulationType, { label: string; color: string }> = {
  AM: { label: 'AM', color: 'bg-blue-500' },
  FM: { label: 'FM', color: 'bg-green-500' },
  PM: { label: 'PM', color: 'bg-cyan-500' },
  ASK: { label: 'ASK', color: 'bg-amber-500' },
  FSK: { label: 'FSK', color: 'bg-orange-500' },
  PSK: { label: 'PSK', color: 'bg-purple-500' },
  QAM: { label: 'QAM', color: 'bg-pink-500' },
  OFDM: { label: 'OFDM', color: 'bg-indigo-500' },
  SPREAD_SPECTRUM: { label: 'SS', color: 'bg-rose-500' },
  UNKNOWN: { label: '???', color: 'bg-slate-500' },
};

const STATUS_CONFIG = {
  QUEUED: { label: 'Queued', color: 'text-slate-400', icon: 'clock' },
  ANALYZING: { label: 'Analyzing', color: 'text-blue-400', icon: 'search' },
  DEMODULATING: { label: 'Demodulating', color: 'text-cyan-400', icon: 'wave' },
  COMPLETED: { label: 'Completed', color: 'text-green-400', icon: 'check' },
  FAILED: { label: 'Failed', color: 'text-red-400', icon: 'x' },
};

export const AgenticDemodulationPanel: React.FC<AgenticDemodulationPanelProps> = ({
  tasks,
  availableStreams,
  onStartDemodulation,
  onCancelTask,
  onViewResult,
  className,
}) => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [showStreamSelector, setShowStreamSelector] = useState(false);

  // Separate active vs completed tasks
  const { activeTasks, completedTasks } = useMemo(() => {
    const active = tasks.filter(
      (t) => t.status === 'QUEUED' || t.status === 'ANALYZING' || t.status === 'DEMODULATING'
    );
    const completed = tasks.filter(
      (t) => t.status === 'COMPLETED' || t.status === 'FAILED'
    );
    return { activeTasks: active, completedTasks: completed.slice(0, 10) };
  }, [tasks]);

  const handleStartDemod = useCallback(() => {
    if (selectedStreamId && onStartDemodulation) {
      onStartDemodulation(selectedStreamId);
      setSelectedStreamId(null);
      setShowStreamSelector(false);
    }
  }, [selectedStreamId, onStartDemodulation]);

  const formatDuration = (start: number, end?: number): string => {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const renderStatusIcon = (status: DemodulationTask['status']) => {
    const config = STATUS_CONFIG[status];
    if (config.icon === 'clock') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (config.icon === 'search') {
      return (
        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    }
    if (config.icon === 'wave') {
      return (
        <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    if (config.icon === 'check') {
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 text-slate-100 rounded-lg overflow-hidden ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-lg font-semibold">Agentic Demodulation</span>
        </div>
        <button
          onClick={() => setShowStreamSelector(!showStreamSelector)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* Stream selector dropdown */}
      {showStreamSelector && (
        <div className="p-4 bg-slate-850 border-b border-slate-700">
          <label className="block text-xs text-slate-400 mb-2">Select signal stream:</label>
          <div className="flex gap-2">
            <select
              value={selectedStreamId || ''}
              onChange={(e) => setSelectedStreamId(e.target.value || null)}
              className="flex-1 px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Choose a stream...</option>
              {availableStreams
                .filter((s) => s.active)
                .map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name} ({stream.band} - {(stream.centerFrequency / 1e6).toFixed(2)} MHz)
                  </option>
                ))}
            </select>
            <button
              onClick={handleStartDemod}
              disabled={!selectedStreamId}
              className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Start
            </button>
            <button
              onClick={() => setShowStreamSelector(false)}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active tasks */}
      <div className="flex-1 overflow-y-auto">
        {activeTasks.length > 0 && (
          <div className="border-b border-slate-800">
            <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-850">
              Active Tasks ({activeTasks.length})
            </div>
            {activeTasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={STATUS_CONFIG[task.status].color}>
                      {renderStatusIcon(task.status)}
                    </span>
                    <span className="text-sm font-medium">{task.signalId}</span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded ${STATUS_CONFIG[task.status].color} bg-slate-800`}
                    >
                      {STATUS_CONFIG[task.status].label}
                    </span>
                  </div>
                  <button
                    onClick={() => onCancelTask?.(task.id)}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Cancel task"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Progress bar */}
                <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${task.progress * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-cyan-400/30 animate-pulse"
                    style={{ width: `${task.progress * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
                  <span>Agent: {task.agentId}</span>
                  <span>{formatDuration(task.startedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed tasks */}
        {completedTasks.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider bg-slate-850">
              Recent Results ({completedTasks.length})
            </div>
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className={`px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer ${
                  task.status === 'FAILED' ? 'opacity-60' : ''
                }`}
                onClick={() => task.result && onViewResult?.(task.result)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={STATUS_CONFIG[task.status].color}>
                      {renderStatusIcon(task.status)}
                    </span>
                    <span className="text-sm font-medium">{task.signalId}</span>
                    {task.result && (
                      <span
                        className={`px-1.5 py-0.5 text-xs font-bold text-white rounded ${
                          MODULATION_BADGES[task.result.modulation].color
                        }`}
                      >
                        {MODULATION_BADGES[task.result.modulation].label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {task.result && (
                      <span className="text-green-400">
                        {(task.result.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    <span>{formatDuration(task.startedAt, task.completedAt)}</span>
                  </div>
                </div>
                {task.result && (
                  <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs text-slate-300">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <span className="text-slate-500">Carrier:</span>{' '}
                        {(task.result.carrierFrequency / 1e6).toFixed(3)} MHz
                      </span>
                      <span>
                        <span className="text-slate-500">Symbol Rate:</span>{' '}
                        {task.result.symbolRate.toLocaleString()} Bd
                      </span>
                      {task.result.decodedPayload && (
                        <span className="text-cyan-400">
                          Payload decoded ({task.result.decodedPayload.format})
                        </span>
                      )}
                    </div>
                    {task.result.recommendations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <span className="text-slate-500">Recommendations:</span>
                        <ul className="mt-1 list-disc list-inside text-slate-400">
                          {task.result.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <svg
              className="w-16 h-16 mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">No demodulation tasks</p>
            <p className="text-xs mt-1">Click "New Task" to analyze a signal stream</p>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs">
        <span className="text-slate-400">
          <span className="text-cyan-400 font-medium">{activeTasks.length}</span> active
        </span>
        <span className="text-slate-400">
          <span className="text-green-400 font-medium">
            {tasks.filter((t) => t.status === 'COMPLETED').length}
          </span>{' '}
          completed
        </span>
        <span className="text-slate-400">
          <span className="text-red-400 font-medium">
            {tasks.filter((t) => t.status === 'FAILED').length}
          </span>{' '}
          failed
        </span>
      </div>
    </div>
  );
};

export default AgenticDemodulationPanel;
