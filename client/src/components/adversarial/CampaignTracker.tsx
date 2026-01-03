import React, { useState, useMemo } from 'react';
import type { Campaign, CampaignStatus, CampaignPhase, MitreTactic } from './types';

export interface CampaignTrackerProps {
  campaigns: Campaign[];
  onSelectCampaign?: (campaign: Campaign) => void;
  onViewPhase?: (campaign: Campaign, phase: CampaignPhase) => void;
  selectedCampaignId?: string;
  className?: string;
}

const statusColors: Record<CampaignStatus, string> = {
  active: 'bg-red-100 text-red-800 border-red-200',
  dormant: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  concluded: 'bg-green-100 text-green-800 border-green-200',
};

const statusIcons: Record<CampaignStatus, string> = {
  active: '\u{1F534}',
  dormant: '\u{1F7E1}',
  concluded: '\u{1F7E2}',
};

const phaseStatusColors: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
};

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

export const CampaignTracker: React.FC<CampaignTrackerProps> = ({
  campaigns,
  onSelectCampaign,
  onViewPhase,
  selectedCampaignId,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'grid'>('list');
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          campaign.name.toLowerCase().includes(query) ||
          campaign.description.toLowerCase().includes(query) ||
          campaign.adversary.toLowerCase().includes(query) ||
          campaign.targetSectors.some((s) => s.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      dormant: campaigns.filter((c) => c.status === 'dormant').length,
      concluded: campaigns.filter((c) => c.status === 'concluded').length,
    };
  }, [campaigns]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderCampaignCard = (campaign: Campaign) => {
    const isSelected = selectedCampaignId === campaign.id;
    const isExpanded = expandedCampaignId === campaign.id;

    return (
      <div
        key={campaign.id}
        className={`bg-white border rounded-lg overflow-hidden transition-all ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
        }`}
        data-testid={`campaign-${campaign.id}`}
      >
        {/* Header */}
        <div
          className={`p-4 cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
          onClick={() => onSelectCampaign?.(campaign)}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span>{statusIcons[campaign.status]}</span>
                <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-purple-600 font-medium">{campaign.adversary}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${statusColors[campaign.status]}`}>
                  {campaign.status.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Confidence</div>
              <div className="text-lg font-semibold text-gray-900">{campaign.confidence}%</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{campaign.description}</p>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{campaign.phases.length}</div>
            <div className="text-xs text-gray-500">Phases</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{campaign.techniques.length}</div>
            <div className="text-xs text-gray-500">Techniques</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{campaign.iocs.length}</div>
            <div className="text-xs text-gray-500">IOCs</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{campaign.incidents.length}</div>
            <div className="text-xs text-gray-500">Incidents</div>
          </div>
        </div>

        {/* Phases Timeline */}
        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Campaign Phases</h4>
            <div className="space-y-2">
              {campaign.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewPhase?.(campaign, phase);
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        phaseStatusColors[phase.status]
                      }`}
                    >
                      {index + 1}
                    </div>
                    {index < campaign.phases.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{phase.name}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${phaseStatusColors[phase.status]}`}>
                        {phase.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {phase.tactics.slice(0, 3).map((tactic) => (
                        <span
                          key={tactic}
                          className="px-1.5 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: `${tacticColors[tactic]}20`,
                            color: tacticColors[tactic],
                          }}
                        >
                          {tactic}
                        </span>
                      ))}
                      {phase.tactics.length > 3 && (
                        <span className="text-xs text-gray-400">+{phase.tactics.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Targets & Timeline */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Targets: </span>
              {campaign.targetSectors.slice(0, 3).map((sector, i) => (
                <span key={sector}>
                  {i > 0 && ', '}
                  <span className="text-gray-700">{sector}</span>
                </span>
              ))}
              {campaign.targetSectors.length > 3 && (
                <span className="text-gray-400"> +{campaign.targetSectors.length - 3}</span>
              )}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-gray-500 mt-2">
            <span>First seen: {formatDate(campaign.firstSeen)}</span>
            <span>Last seen: {formatDate(campaign.lastSeen)}</span>
          </div>
        </div>

        {/* IOCs Preview */}
        {isExpanded && campaign.iocs.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
              IOCs ({campaign.iocs.length})
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {campaign.iocs.slice(0, 5).map((ioc) => (
                <div key={ioc.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-gray-700 truncate max-w-[200px]">{ioc.value}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{ioc.type}</span>
                    <span className="text-gray-400">{ioc.confidence}%</span>
                  </div>
                </div>
              ))}
              {campaign.iocs.length > 5 && (
                <div className="text-xs text-gray-400 text-center">
                  +{campaign.iocs.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expand Toggle */}
        <button
          className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCampaignId(isExpanded ? null : campaign.id);
          }}
        >
          {isExpanded ? 'Show less' : 'Show more'}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="campaign-tracker">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Campaign Tracker</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-red-600">{stats.active} Active</span>
            <span className="text-yellow-600">{stats.dormant} Dormant</span>
            <span className="text-green-600">{stats.concluded} Concluded</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="concluded">Concluded</option>
          </select>
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            {(['list', 'timeline', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                className={`px-3 py-2 text-sm ${
                  viewMode === mode ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {filteredCampaigns.map(renderCampaignCard)}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {filteredCampaigns.map(renderCampaignCard)}
        </div>
      )}

      {viewMode === 'timeline' && (
        <div className="p-4 max-h-[600px] overflow-y-auto">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            {filteredCampaigns
              .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
              .map((campaign) => (
                <div key={campaign.id} className="relative pl-10 mb-6">
                  <div
                    className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white ${
                      campaign.status === 'active'
                        ? 'bg-red-500'
                        : campaign.status === 'dormant'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                  />
                  <div
                    className={`p-4 border rounded-lg cursor-pointer ${
                      selectedCampaignId === campaign.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectCampaign?.(campaign)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <span className="text-sm text-purple-600">{campaign.adversary}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${statusColors[campaign.status]}`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>{campaign.techniques.length} techniques</span>
                      <span>{campaign.phases.length} phases</span>
                      <span>{formatDate(campaign.firstSeen)} - {formatDate(campaign.lastSeen)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {filteredCampaigns.length === 0 && (
        <div className="p-8 text-center text-gray-500">No campaigns match your filters.</div>
      )}
    </div>
  );
};

export default CampaignTracker;
