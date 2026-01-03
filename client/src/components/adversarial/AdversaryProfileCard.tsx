import React, { useState } from 'react';
import type { Adversary, ThreatLevel, AdversaryType } from './types';

export interface AdversaryProfileCardProps {
  adversary: Adversary;
  onSelect?: (adversary: Adversary) => void;
  onViewDetails?: (adversary: Adversary) => void;
  onTrack?: (adversary: Adversary) => void;
  compact?: boolean;
  selected?: boolean;
  className?: string;
}

const threatLevelColors: Record<ThreatLevel, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const adversaryTypeLabels: Record<AdversaryType, string> = {
  apt: 'APT',
  cybercrime: 'Cybercrime',
  hacktivist: 'Hacktivist',
  insider: 'Insider Threat',
  'nation-state': 'Nation State',
  unknown: 'Unknown',
};

const adversaryTypeIcons: Record<AdversaryType, string> = {
  apt: '\u{1F3AF}',
  cybercrime: '\u{1F4B0}',
  hacktivist: '\u{1F3AD}',
  insider: '\u{1F464}',
  'nation-state': '\u{1F3DB}',
  unknown: '\u2753',
};

export const AdversaryProfileCard: React.FC<AdversaryProfileCardProps> = ({
  adversary,
  onSelect,
  onViewDetails,
  onTrack,
  compact = false,
  selected = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    onSelect?.(adversary);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(adversary);
  };

  const handleTrack = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrack?.(adversary);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (compact) {
    return (
      <div
        className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
          selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
        } ${className}`}
        onClick={handleClick}
        data-testid="adversary-card-compact"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{adversaryTypeIcons[adversary.type]}</span>
            <span className="font-medium text-gray-900">{adversary.name}</span>
          </div>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded border ${
              threatLevelColors[adversary.threatLevel]
            }`}
          >
            {adversary.threatLevel.toUpperCase()}
          </span>
        </div>
        <div className="mt-1 text-sm text-gray-500">
          {adversary.aliases.slice(0, 2).join(', ')}
          {adversary.aliases.length > 2 && ` +${adversary.aliases.length - 2}`}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      } ${className}`}
      data-testid="adversary-card"
    >
      {/* Header */}
      <div
        className={`p-4 cursor-pointer ${selected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
              {adversaryTypeIcons[adversary.type]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{adversary.name}</h3>
              <p className="text-sm text-gray-500">{adversaryTypeLabels[adversary.type]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {adversary.active && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Active
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${
                threatLevelColors[adversary.threatLevel]
              }`}
            >
              {adversary.threatLevel.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Aliases */}
        {adversary.aliases.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {adversary.aliases.map((alias) => (
              <span
                key={alias}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {alias}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{adversary.description}</p>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {adversary.techniques.length}
          </div>
          <div className="text-xs text-gray-500">Techniques</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{adversary.malware.length}</div>
          <div className="text-xs text-gray-500">Malware</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{adversary.tools.length}</div>
          <div className="text-xs text-gray-500">Tools</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {adversary.campaigns.length}
          </div>
          <div className="text-xs text-gray-500">Campaigns</div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-gray-200">
        <button
          className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Target Sectors */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Target Sectors</h4>
              <div className="flex flex-wrap gap-1">
                {adversary.targetSectors.map((sector) => (
                  <span
                    key={sector}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {sector}
                  </span>
                ))}
              </div>
            </div>

            {/* Target Regions */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Target Regions</h4>
              <div className="flex flex-wrap gap-1">
                {adversary.targetRegions.map((region) => (
                  <span
                    key={region}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                  >
                    {region}
                  </span>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">First Seen:</span>{' '}
                <span className="font-medium">{formatDate(adversary.firstSeen)}</span>
              </div>
              <div>
                <span className="text-gray-500">Last Seen:</span>{' '}
                <span className="font-medium">{formatDate(adversary.lastSeen)}</span>
              </div>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">Confidence</span>
                <span className="font-medium">{adversary.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${adversary.confidence}%` }}
                />
              </div>
            </div>

            {/* Tags */}
            {adversary.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {adversary.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
        <button
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
          onClick={handleViewDetails}
        >
          View Details
        </button>
        <button
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
          onClick={handleTrack}
        >
          Track
        </button>
      </div>
    </div>
  );
};

export default AdversaryProfileCard;
