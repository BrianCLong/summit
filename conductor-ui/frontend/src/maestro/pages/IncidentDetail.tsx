import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

interface IncidentEvent {
  id: string;
  timestamp: string;
  type: 'alert' | 'run' | 'user_action' | 'system_change' | 'escalation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor: string;
  metadata: Record<string, any>;
}

interface RelatedRun {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  triggeredBy: string;
  outputs?: any;
}

interface ImpactedSLO {
  id: string;
  name: string;
  service: string;
  objective: number;
  currentSLI: number;
  errorBudgetRemaining: number;
  impact: 'minor' | 'major' | 'critical';
}

interface IncidentDetails {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  tags: string[];
  events: IncidentEvent[];
  relatedRuns: RelatedRun[];
  impactedSLOs: ImpactedSLO[];
  evidenceLinks: Array<{
    id: string;
    type: 'log' | 'screenshot' | 'report' | 'artifact';
    title: string;
    url: string;
    timestamp: string;
  }>;
}

export default function IncidentDetail() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [incident, setIncident] = useState<IncidentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  const { getIncident } = api();

  useEffect(() => {
    if (incidentId) {
      loadIncidentDetails();
    }
  }, [incidentId]);

  const loadIncidentDetails = async () => {
    if (!incidentId) return;

    setLoading(true);
    try {
      const data = await getIncident(incidentId);
      setIncident(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  };

  const groupedEvents = useMemo(() => {
    if (!incident?.events) return [];

    const phases = [
      { id: 'detection', label: 'Detection & Alert', types: ['alert'] },
      {
        id: 'investigation',
        label: 'Investigation',
        types: ['run', 'user_action'],
      },
      {
        id: 'response',
        label: 'Response & Changes',
        types: ['system_change', 'escalation'],
      },
    ];

    return phases.map((phase) => ({
      ...phase,
      events: incident.events
        .filter((event) => phase.types.includes(event.type))
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
    }));
  }, [incident?.events]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return '🚨';
      case 'run':
        return '⚙️';
      case 'user_action':
        return '👤';
      case 'system_change':
        return '🔧';
      case 'escalation':
        return '📈';
      default:
        return '📝';
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">
            Error Loading Incident
          </h2>
          <p className="text-red-600">{error || 'Incident not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {incident.title}
              </h1>
              <span
                className={`px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(incident.status)}`}
              >
                {incident.status.toUpperCase()}
              </span>
              <div className="flex items-center gap-1">
                <div
                  className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity)}`}
                ></div>
                <span className="text-sm font-medium">
                  {incident.severity.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-gray-600 max-w-3xl">{incident.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>
                Started: {new Date(incident.startedAt).toLocaleString()}
              </span>
              {incident.resolvedAt && (
                <span>
                  Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                </span>
              )}
              <span>
                Duration:{' '}
                {formatDuration(incident.startedAt, incident.resolvedAt)}
              </span>
              {incident.assignedTo && (
                <span>Assigned to: {incident.assignedTo}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {incident.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {incident.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Incident Timeline</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPhase('all')}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedPhase === 'all'
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All Events
                  </button>
                  {groupedEvents.map((phase) => (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedPhase(phase.id)}
                      className={`px-3 py-1 text-sm rounded ${
                        selectedPhase === phase.id
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {phase.label} ({phase.events.length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Virtualized Timeline */}
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                {(selectedPhase === 'all'
                  ? incident.events
                  : groupedEvents.find((p) => p.id === selectedPhase)?.events ||
                    []
                ).map((event, index) => (
                  <div
                    key={event.id}
                    className="relative flex items-start gap-4 pb-8"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-lg z-10">
                      {getEventIcon(event.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                            <span>by {event.actor}</span>
                            <span
                              className={`px-2 py-1 rounded ${getSeverityColor(event.severity)} text-white`}
                            >
                              {event.severity}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Event Metadata */}
                      {Object.keys(event.metadata).length > 0 && (
                        <details className="mt-3">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            View details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))}

                {incident.events.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No timeline events available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Runs */}
          {incident.relatedRuns.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold">Related Runs</h3>
              </div>
              <div className="p-4 space-y-3">
                {incident.relatedRuns.map((run) => (
                  <div key={run.id} className="border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        to={`/maestro/runs/${run.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {run.name}
                      </Link>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          run.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : run.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : run.status === 'running'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>
                        Started: {new Date(run.startedAt).toLocaleString()}
                      </div>
                      {run.completedAt && (
                        <div>
                          Completed:{' '}
                          {new Date(run.completedAt).toLocaleString()}
                        </div>
                      )}
                      {run.duration && (
                        <div>Duration: {Math.floor(run.duration / 1000)}s</div>
                      )}
                      <div>Triggered by: {run.triggeredBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impacted SLOs */}
          {incident.impactedSLOs.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold">Impacted SLOs</h3>
              </div>
              <div className="p-4 space-y-3">
                {incident.impactedSLOs.map((slo) => (
                  <div key={slo.id} className="border rounded p-3">
                    <div className="flex items-start justify-between mb-2">
                      <Link
                        to={`/maestro/slo/${slo.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {slo.name}
                      </Link>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          slo.impact === 'critical'
                            ? 'bg-red-100 text-red-800'
                            : slo.impact === 'major'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {slo.impact}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Service: {slo.service}</div>
                      <div>
                        Current SLI: {(slo.currentSLI * 100).toFixed(2)}%
                      </div>
                      <div>Objective: {(slo.objective * 100).toFixed(2)}%</div>
                      <div>
                        Error Budget: {slo.errorBudgetRemaining.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Links */}
          {incident.evidenceLinks.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold">Evidence & Artifacts</h3>
              </div>
              <div className="p-4 space-y-2">
                {incident.evidenceLinks.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="text-lg">
                      {evidence.type === 'log' && '📋'}
                      {evidence.type === 'screenshot' && '📸'}
                      {evidence.type === 'report' && '📊'}
                      {evidence.type === 'artifact' && '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                      >
                        {evidence.title}
                      </a>
                      <div className="text-xs text-gray-500">
                        {new Date(evidence.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
