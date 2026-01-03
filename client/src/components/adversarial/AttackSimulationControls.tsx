import React, { useState } from 'react';
import type { SimulationScenario, SimulationStatus, MitreTechnique } from './types';

export interface AttackSimulationControlsProps {
  scenario: SimulationScenario;
  availableTechniques?: MitreTechnique[];
  onStart?: (scenario: SimulationScenario) => void;
  onPause?: (scenarioId: string) => void;
  onStop?: (scenarioId: string) => void;
  onReset?: (scenarioId: string) => void;
  onUpdateTechniques?: (scenarioId: string, techniques: string[]) => void;
  onSchedule?: (scenarioId: string, scheduledAt: string) => void;
  className?: string;
}

const statusColors: Record<SimulationStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};

const statusIcons: Record<SimulationStatus, string> = {
  pending: '\u23F8',
  running: '\u25B6\uFE0F',
  completed: '\u2705',
  failed: '\u274C',
  cancelled: '\u{1F6AB}',
};

export const AttackSimulationControls: React.FC<AttackSimulationControlsProps> = ({
  scenario,
  availableTechniques = [],
  onStart,
  onPause,
  onStop,
  onReset,
  onUpdateTechniques,
  onSchedule,
  className = '',
}) => {
  const [showTechniqueSelector, setShowTechniqueSelector] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [searchTechnique, setSearchTechnique] = useState('');

  const isRunning = scenario.status === 'running';
  const isPending = scenario.status === 'pending';
  const isCompleted = scenario.status === 'completed';
  const isFailed = scenario.status === 'failed';

  const formatDuration = (startedAt?: string, completedAt?: string) => {
    if (!startedAt) return 'N/A';
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleSchedule = () => {
    if (scheduledDate && scheduledTime) {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      onSchedule?.(scenario.id, scheduledAt);
      setShowScheduler(false);
    }
  };

  const filteredTechniques = availableTechniques.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTechnique.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTechnique.toLowerCase())
  );

  const handleTechniqueToggle = (techniqueId: string) => {
    const newTechniques = scenario.techniques.includes(techniqueId)
      ? scenario.techniques.filter((t) => t !== techniqueId)
      : [...scenario.techniques, techniqueId];
    onUpdateTechniques?.(scenario.id, newTechniques);
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="attack-simulation-controls"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{scenario.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded ${statusColors[scenario.status]}`}>
            {statusIcons[scenario.status]} {scenario.status.charAt(0).toUpperCase() + scenario.status.slice(1)}
          </span>
        </div>

        {scenario.adversary && (
          <div className="mt-2">
            <span className="text-sm text-gray-500">Simulating: </span>
            <span className="text-sm font-medium text-purple-600">{scenario.adversary}</span>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        {isPending && (
          <>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              onClick={() => onStart?.(scenario)}
              data-testid="start-simulation"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Start Simulation
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              onClick={() => setShowScheduler(!showScheduler)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Schedule
            </button>
          </>
        )}

        {isRunning && (
          <>
            <button
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
              onClick={() => onPause?.(scenario.id)}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              onClick={() => onStop?.(scenario.id)}
              data-testid="stop-simulation"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z" />
              </svg>
              Stop
            </button>
          </>
        )}

        {(isCompleted || isFailed) && (
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            onClick={() => onReset?.(scenario.id)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Scheduler Panel */}
      {showScheduler && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule Simulation</h3>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              onClick={handleSchedule}
              disabled={!scheduledDate || !scheduledTime}
            >
              Confirm Schedule
            </button>
            <button
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              onClick={() => setShowScheduler(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Techniques */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            Techniques ({scenario.techniques.length})
          </h3>
          {isPending && (
            <button
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setShowTechniqueSelector(!showTechniqueSelector)}
            >
              {showTechniqueSelector ? 'Done' : 'Edit'}
            </button>
          )}
        </div>

        {showTechniqueSelector && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search techniques..."
              value={searchTechnique}
              onChange={(e) => setSearchTechnique(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredTechniques.map((technique) => (
                <label
                  key={technique.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={scenario.techniques.includes(technique.id)}
                    onChange={() => handleTechniqueToggle(technique.id)}
                    className="rounded"
                  />
                  <span className="text-sm font-mono text-gray-600">{technique.id}</span>
                  <span className="text-sm text-gray-700">{technique.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {scenario.techniques.map((techniqueId) => (
            <span
              key={techniqueId}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded font-mono"
            >
              {techniqueId}
            </span>
          ))}
        </div>
      </div>

      {/* Objectives */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Objectives</h3>
        <ul className="space-y-2">
          {scenario.objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="w-5 h-5 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                {index + 1}
              </span>
              {objective}
            </li>
          ))}
        </ul>
      </div>

      {/* Progress / Results */}
      {isRunning && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-700">Simulation in Progress</h3>
            <span className="text-sm text-blue-600">
              {formatDuration(scenario.startedAt)}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {scenario.results && (
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Results</h3>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {scenario.results.detected}
              </div>
              <div className="text-xs text-green-700">Detected</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {scenario.results.blocked}
              </div>
              <div className="text-xs text-blue-700">Blocked</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {scenario.results.evaded}
              </div>
              <div className="text-xs text-red-700">Evaded</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {scenario.results.successRate}%
              </div>
              <div className="text-xs text-purple-700">Success Rate</div>
            </div>
          </div>

          {/* Detection Time */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Detection Time</span>
              <span className="text-sm font-medium text-gray-900">
                {scenario.results.avgDetectionTime}ms
              </span>
            </div>
          </div>

          {/* Findings */}
          {scenario.results.findings.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Findings</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {scenario.results.findings.map((finding, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      finding.result === 'detected'
                        ? 'bg-green-50 border border-green-200'
                        : finding.result === 'blocked'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-700">{finding.technique}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          finding.result === 'detected'
                            ? 'bg-green-100 text-green-800'
                            : finding.result === 'blocked'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {finding.result.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{finding.details}</p>
                    {finding.detectionTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        Detection time: {finding.detectionTime}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {scenario.results.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {scenario.results.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-yellow-500">\u26A0\uFE0F</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        {scenario.scheduledAt && (
          <span>
            Scheduled: {new Date(scenario.scheduledAt).toLocaleString()}
          </span>
        )}
        {scenario.startedAt && (
          <span>
            Started: {new Date(scenario.startedAt).toLocaleString()}
          </span>
        )}
        {scenario.completedAt && (
          <span>
            Duration: {formatDuration(scenario.startedAt, scenario.completedAt)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AttackSimulationControls;
