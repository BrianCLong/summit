import React, { useState, useMemo } from 'react';
import type {
  Incident,
  IncidentStatus,
  IncidentPriority,
  ResponseAction,
} from './types';

export interface IncidentResponsePanelProps {
  incident: Incident;
  onStatusChange?: (status: IncidentStatus) => void;
  onAssign?: (assignee: string) => void;
  onAddAction?: (action: Omit<ResponseAction, 'id'>) => void;
  onUpdateAction?: (actionId: string, updates: Partial<ResponseAction>) => void;
  onAddNote?: (note: string) => void;
  onEscalate?: () => void;
  onClose?: () => void;
  className?: string;
}

const statusColors: Record<IncidentStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  investigating: 'bg-purple-100 text-purple-800',
  containing: 'bg-orange-100 text-orange-800',
  eradicating: 'bg-yellow-100 text-yellow-800',
  recovering: 'bg-cyan-100 text-cyan-800',
  closed: 'bg-green-100 text-green-800',
};

const statusOrder: IncidentStatus[] = [
  'open',
  'investigating',
  'containing',
  'eradicating',
  'recovering',
  'closed',
];

const priorityColors: Record<IncidentPriority, string> = {
  p1: 'bg-red-600 text-white',
  p2: 'bg-orange-500 text-white',
  p3: 'bg-yellow-500 text-white',
  p4: 'bg-gray-400 text-white',
};

const actionTypeColors: Record<string, string> = {
  containment: 'bg-orange-100 text-orange-800',
  eradication: 'bg-red-100 text-red-800',
  recovery: 'bg-green-100 text-green-800',
  investigation: 'bg-blue-100 text-blue-800',
};

const actionStatusColors: Record<string, string> = {
  pending: 'text-gray-500',
  'in-progress': 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
};

export const IncidentResponsePanel: React.FC<IncidentResponsePanelProps> = ({
  incident,
  onStatusChange,
  onAssign: _onAssign,
  onAddAction,
  onUpdateAction,
  onAddNote,
  onEscalate,
  onClose,
  className = '',
}) => {
  // Note: _onAssign is available for future assignee selector functionality
  void _onAssign;
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'actions' | 'playbook'>(
    'overview'
  );
  const [newNote, setNewNote] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [newAction, setNewAction] = useState({
    name: '',
    description: '',
    type: 'investigation' as ResponseAction['type'],
    automated: false,
  });

  const currentStatusIndex = statusOrder.indexOf(incident.status);

  const timelineEvents = useMemo(() => {
    return [...incident.timeline].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [incident.timeline]);

  const actionStats = useMemo(() => {
    const stats = {
      total: incident.responseActions.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      failed: 0,
    };

    incident.responseActions.forEach((action) => {
      if (action.status === 'completed') stats.completed++;
      else if (action.status === 'in-progress') stats.inProgress++;
      else if (action.status === 'pending') stats.pending++;
      else if (action.status === 'failed') stats.failed++;
    });

    return stats;
  }, [incident.responseActions]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diff = endDate.getTime() - startDate.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote?.(newNote.trim());
      setNewNote('');
    }
  };

  const handleAddAction = () => {
    if (newAction.name.trim()) {
      onAddAction?.({
        name: newAction.name,
        description: newAction.description,
        type: newAction.type,
        status: 'pending',
        automated: newAction.automated,
      });
      setNewAction({
        name: '',
        description: '',
        type: 'investigation',
        automated: false,
      });
      setShowAddAction(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="incident-response-panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-bold rounded ${priorityColors[incident.priority]}`}>
                {incident.priority.toUpperCase()}
              </span>
              <h2 className="text-lg font-semibold text-gray-900">{incident.title}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              ID: {incident.id} | Created: {formatTimestamp(incident.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-sm font-medium rounded ${statusColors[incident.status]}`}>
              {incident.status.toUpperCase()}
            </span>
            {onEscalate && incident.status !== 'closed' && (
              <button
                className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100"
                onClick={onEscalate}
              >
                Escalate
              </button>
            )}
          </div>
        </div>

        {/* Status Progress */}
        <div className="flex items-center gap-1 mb-4">
          {statusOrder.map((status, index) => (
            <React.Fragment key={status}>
              <button
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  index <= currentStatusIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                } ${incident.status === 'closed' ? 'cursor-default' : 'hover:bg-blue-500'}`}
                onClick={() => {
                  if (incident.status !== 'closed') {
                    onStatusChange?.(status);
                  }
                }}
                disabled={incident.status === 'closed'}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
              {index < statusOrder.length - 1 && (
                <div
                  className={`w-4 h-0.5 ${
                    index < currentStatusIndex ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">{incident.detections.length}</div>
            <div className="text-xs text-gray-500">Detections</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">{incident.affectedAssets.length}</div>
            <div className="text-xs text-gray-500">Assets</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">{actionStats.completed}/{actionStats.total}</div>
            <div className="text-xs text-gray-500">Actions</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(incident.createdAt, incident.closedAt)}
            </div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex gap-4">
          {(['overview', 'timeline', 'actions', 'playbook'] as const).map((tab) => (
            <button
              key={tab}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{incident.description}</p>
            </div>

            {/* Adversary & Campaign */}
            {(incident.adversary || incident.campaign) && (
              <div className="flex gap-4">
                {incident.adversary && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Adversary</h3>
                    <span className="px-2 py-1 text-sm bg-purple-100 text-purple-800 rounded">
                      {incident.adversary}
                    </span>
                  </div>
                )}
                {incident.campaign && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Campaign</h3>
                    <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                      {incident.campaign}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Affected Assets */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Affected Assets</h3>
              <div className="flex flex-wrap gap-2">
                {incident.affectedAssets.map((asset) => (
                  <span key={asset} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                    {asset}
                  </span>
                ))}
              </div>
            </div>

            {/* Team */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Response Team</h3>
              <div className="flex items-center gap-2">
                {incident.assignee && (
                  <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded font-medium">
                    Lead: {incident.assignee}
                  </span>
                )}
                {incident.team.map((member) => (
                  <span key={member} className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                    {member}
                  </span>
                ))}
              </div>
            </div>

            {/* Add Note */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add Note</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter a note..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <button
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                  onClick={handleAddNote}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {timelineEvents.map((event) => (
                <div key={event.id} className="relative pl-10">
                  <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white bg-gray-300`} />
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{formatTimestamp(event.timestamp)}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                        {event.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{event.description}</p>
                    {event.actor && (
                      <p className="text-xs text-gray-500 mt-1">by {event.actor}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            {/* Add Action Button */}
            {!showAddAction && (
              <button
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                onClick={() => setShowAddAction(true)}
              >
                + Add Response Action
              </button>
            )}

            {/* Add Action Form */}
            {showAddAction && (
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3">New Response Action</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Action name"
                    value={newAction.name}
                    onChange={(e) => setNewAction({ ...newAction, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <textarea
                    placeholder="Description"
                    value={newAction.description}
                    onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    rows={2}
                  />
                  <div className="flex gap-3">
                    <select
                      value={newAction.type}
                      onChange={(e) => setNewAction({ ...newAction, type: e.target.value as ResponseAction['type'] })}
                      className="px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="investigation">Investigation</option>
                      <option value="containment">Containment</option>
                      <option value="eradication">Eradication</option>
                      <option value="recovery">Recovery</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newAction.automated}
                        onChange={(e) => setNewAction({ ...newAction, automated: e.target.checked })}
                      />
                      Automated
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      onClick={handleAddAction}
                    >
                      Add Action
                    </button>
                    <button
                      className="px-4 py-2 text-sm text-gray-600"
                      onClick={() => setShowAddAction(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action List */}
            <div className="space-y-2">
              {incident.responseActions.map((action) => (
                <div key={action.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${actionStatusColors[action.status]}`}>
                          {action.status === 'completed' ? '\u2713' : action.status === 'in-progress' ? '\u25CF' : '\u25CB'}
                        </span>
                        <span className="font-medium text-gray-900">{action.name}</span>
                        {action.automated && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Auto</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${actionTypeColors[action.type]}`}>
                      {action.type}
                    </span>
                  </div>
                  {action.status === 'pending' && onUpdateAction && (
                    <div className="mt-2 flex gap-2">
                      <button
                        className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                        onClick={() => onUpdateAction(action.id, { status: 'in-progress' })}
                      >
                        Start
                      </button>
                      <button
                        className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => onUpdateAction(action.id, { status: 'skipped' })}
                      >
                        Skip
                      </button>
                    </div>
                  )}
                  {action.status === 'in-progress' && onUpdateAction && (
                    <div className="mt-2 flex gap-2">
                      <button
                        className="px-2 py-1 text-xs text-green-600 bg-green-50 rounded hover:bg-green-100"
                        onClick={() => onUpdateAction(action.id, { status: 'completed' })}
                      >
                        Complete
                      </button>
                      <button
                        className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                        onClick={() => onUpdateAction(action.id, { status: 'failed' })}
                      >
                        Failed
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'playbook' && (
          <div className="text-center py-8 text-gray-500">
            {incident.playbook ? (
              <p>Playbook: {incident.playbook}</p>
            ) : (
              <p>No playbook attached to this incident.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex justify-between">
        <div className="text-sm text-gray-500">
          Last updated: {formatTimestamp(incident.updatedAt)}
        </div>
        {onClose && incident.status !== 'closed' && (
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
            onClick={onClose}
          >
            Close Incident
          </button>
        )}
      </div>
    </div>
  );
};

export default IncidentResponsePanel;
