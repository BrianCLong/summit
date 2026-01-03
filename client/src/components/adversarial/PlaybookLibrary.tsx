import React, { useState, useMemo } from 'react';
import type { Playbook, PlaybookCategory, PlaybookStepType } from './types';

export interface PlaybookLibraryProps {
  playbooks: Playbook[];
  onSelectPlaybook?: (playbook: Playbook) => void;
  onExecutePlaybook?: (playbookId: string) => void;
  onCreatePlaybook?: () => void;
  onEditPlaybook?: (playbook: Playbook) => void;
  onExportPlaybook?: (playbookId: string, format: 'json' | 'yaml' | 'pdf') => void;
  selectedPlaybookId?: string;
  className?: string;
}

const categoryColors: Record<PlaybookCategory, string> = {
  'incident-response': 'bg-red-100 text-red-800 border-red-200',
  'threat-hunting': 'bg-purple-100 text-purple-800 border-purple-200',
  vulnerability: 'bg-orange-100 text-orange-800 border-orange-200',
  compliance: 'bg-blue-100 text-blue-800 border-blue-200',
  recovery: 'bg-green-100 text-green-800 border-green-200',
  custom: 'bg-gray-100 text-gray-800 border-gray-200',
};

const categoryIcons: Record<PlaybookCategory, string> = {
  'incident-response': '\u{1F6A8}',
  'threat-hunting': '\u{1F50D}',
  vulnerability: '\u{1F41B}',
  compliance: '\u{1F4DC}',
  recovery: '\u{1F504}',
  custom: '\u2699\uFE0F',
};

const stepTypeIcons: Record<PlaybookStepType, string> = {
  manual: '\u{1F44B}',
  automated: '\u{1F916}',
  decision: '\u{1F914}',
  notification: '\u{1F514}',
  integration: '\u{1F517}',
};

const categoryLabels: Record<PlaybookCategory, string> = {
  'incident-response': 'Incident Response',
  'threat-hunting': 'Threat Hunting',
  vulnerability: 'Vulnerability',
  compliance: 'Compliance',
  recovery: 'Recovery',
  custom: 'Custom',
};

export const PlaybookLibrary: React.FC<PlaybookLibraryProps> = ({
  playbooks,
  onSelectPlaybook,
  onExecutePlaybook,
  onCreatePlaybook,
  onEditPlaybook,
  onExportPlaybook: _onExportPlaybook,
  selectedPlaybookId,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PlaybookCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'executionCount' | 'successRate'>('name');

  const filteredPlaybooks = useMemo(() => {
    let result = [...playbooks];

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'executionCount':
          return b.executionCount - a.executionCount;
        case 'successRate':
          return b.successRate - a.successRate;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [playbooks, categoryFilter, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let totalExecutions = 0;
    let avgSuccessRate = 0;

    playbooks.forEach((p) => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      totalExecutions += p.executionCount;
      avgSuccessRate += p.successRate;
    });

    return {
      total: playbooks.length,
      byCategory,
      totalExecutions,
      avgSuccessRate: playbooks.length > 0 ? Math.round(avgSuccessRate / playbooks.length) : 0,
    };
  }, [playbooks]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderPlaybookCard = (playbook: Playbook) => {
    const isSelected = selectedPlaybookId === playbook.id;
    const isExpanded = expandedPlaybookId === playbook.id;

    return (
      <div
        key={playbook.id}
        className={`bg-white border rounded-lg overflow-hidden transition-all ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
        }`}
        data-testid={`playbook-${playbook.id}`}
      >
        {/* Header */}
        <div
          className={`p-4 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          onClick={() => onSelectPlaybook?.(playbook)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                {categoryIcons[playbook.category]}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{playbook.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${categoryColors[playbook.category]}`}>
                    {categoryLabels[playbook.category]}
                  </span>
                  <span className="text-xs text-gray-500">v{playbook.version}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{playbook.description}</p>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{playbook.steps.length}</div>
            <div className="text-xs text-gray-500">Steps</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {formatDuration(playbook.estimatedDuration)}
            </div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{playbook.executionCount}</div>
            <div className="text-xs text-gray-500">Runs</div>
          </div>
          <div>
            <div
              className={`text-lg font-semibold ${
                playbook.successRate >= 90
                  ? 'text-green-600'
                  : playbook.successRate >= 70
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}
            >
              {playbook.successRate}%
            </div>
            <div className="text-xs text-gray-500">Success</div>
          </div>
        </div>

        {/* Steps Preview */}
        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Steps</h4>
            <div className="space-y-2">
              {playbook.steps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{stepTypeIcons[step.type]}</span>
                      <span className="text-sm font-medium text-gray-900">{step.name}</span>
                      {step.automated && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {playbook.tags.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-1">
              {playbook.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              onExecutePlaybook?.(playbook.id);
            }}
          >
            Execute
          </button>
          <button
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedPlaybookId(isExpanded ? null : playbook.id);
            }}
          >
            {isExpanded ? 'Less' : 'View'}
          </button>
          <button
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            onClick={(e) => {
              e.stopPropagation();
              onEditPlaybook?.(playbook);
            }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  const renderPlaybookRow = (playbook: Playbook) => {
    const isSelected = selectedPlaybookId === playbook.id;

    return (
      <tr
        key={playbook.id}
        className={`cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
        onClick={() => onSelectPlaybook?.(playbook)}
        data-testid={`playbook-row-${playbook.id}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span>{categoryIcons[playbook.category]}</span>
            <span className="font-medium text-gray-900">{playbook.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${categoryColors[playbook.category]}`}>
            {categoryLabels[playbook.category]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{playbook.steps.length}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(playbook.estimatedDuration)}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{playbook.executionCount}</td>
        <td className="px-4 py-3">
          <span
            className={`text-sm font-medium ${
              playbook.successRate >= 90
                ? 'text-green-600'
                : playbook.successRate >= 70
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {playbook.successRate}%
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <button
              className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              onClick={(e) => {
                e.stopPropagation();
                onExecutePlaybook?.(playbook.id);
              }}
            >
              Run
            </button>
            <button
              className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                onEditPlaybook?.(playbook);
              }}
            >
              Edit
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="playbook-library">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Playbook Library</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{stats.total} playbooks</span>
              <span className="text-gray-300">|</span>
              <span>{stats.totalExecutions} executions</span>
              <span className="text-gray-300">|</span>
              <span>{stats.avgSuccessRate}% avg success</span>
            </div>
            {onCreatePlaybook && (
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                onClick={onCreatePlaybook}
              >
                New Playbook
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as PlaybookCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({stats.byCategory[value] || 0})
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="executionCount">Sort by Runs</option>
            <option value="successRate">Sort by Success Rate</option>
          </select>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {filteredPlaybooks.map(renderPlaybookCard)}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Steps
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Runs
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Success
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlaybooks.map(renderPlaybookRow)}
            </tbody>
          </table>
        </div>
      )}

      {filteredPlaybooks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No playbooks match your filters.
        </div>
      )}
    </div>
  );
};

export default PlaybookLibrary;
