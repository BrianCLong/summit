import React, { useState } from 'react';
import type { DefenseStrategy, DefenseCategory, DefenseStatus } from './types';

export interface DefenseStrategyCardProps {
  strategy: DefenseStrategy;
  onSelect?: (strategy: DefenseStrategy) => void;
  onEdit?: (strategy: DefenseStrategy) => void;
  onActivate?: (strategy: DefenseStrategy) => void;
  onDeprecate?: (strategy: DefenseStrategy) => void;
  selected?: boolean;
  className?: string;
}

const categoryColors: Record<DefenseCategory, string> = {
  prevention: 'bg-blue-100 text-blue-800 border-blue-200',
  detection: 'bg-purple-100 text-purple-800 border-purple-200',
  response: 'bg-orange-100 text-orange-800 border-orange-200',
  recovery: 'bg-green-100 text-green-800 border-green-200',
};

const categoryIcons: Record<DefenseCategory, string> = {
  prevention: '\u{1F6E1}\uFE0F',
  detection: '\u{1F50D}',
  response: '\u26A1',
  recovery: '\u{1F504}',
};

const statusColors: Record<DefenseStatus, string> = {
  planned: 'bg-gray-100 text-gray-800',
  implementing: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  deprecated: 'bg-red-100 text-red-800',
};

const statusIcons: Record<DefenseStatus, string> = {
  planned: '\u{1F4DD}',
  implementing: '\u{1F6A7}',
  active: '\u2705',
  deprecated: '\u{1F6AB}',
};

export const DefenseStrategyCard: React.FC<DefenseStrategyCardProps> = ({
  strategy,
  onSelect,
  onEdit,
  onActivate,
  onDeprecate,
  selected = false,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'bg-green-500';
    if (coverage >= 60) return 'bg-yellow-500';
    if (coverage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getEffectivenessColor = (effectiveness: number) => {
    if (effectiveness >= 80) return 'text-green-600';
    if (effectiveness >= 60) return 'text-yellow-600';
    if (effectiveness >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden transition-all ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'
      } ${className}`}
      data-testid="defense-strategy-card"
    >
      {/* Header */}
      <div
        className={`p-4 cursor-pointer ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
        onClick={() => onSelect?.(strategy)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
              {categoryIcons[strategy.category]}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{strategy.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded border ${
                    categoryColors[strategy.category]
                  }`}
                >
                  {strategy.category.charAt(0).toUpperCase() + strategy.category.slice(1)}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    statusColors[strategy.status]
                  }`}
                >
                  {statusIcons[strategy.status]} {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{strategy.priority}</div>
            <div className="text-xs text-gray-500">Priority</div>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{strategy.description}</p>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-3 gap-4">
        {/* Coverage */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Coverage</span>
            <span className="font-medium">{strategy.coverage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${getCoverageColor(strategy.coverage)} h-2 rounded-full transition-all`}
              style={{ width: `${strategy.coverage}%` }}
            />
          </div>
        </div>

        {/* Effectiveness */}
        <div className="text-center">
          <div className={`text-xl font-bold ${getEffectivenessColor(strategy.effectiveness)}`}>
            {strategy.effectiveness}%
          </div>
          <div className="text-xs text-gray-500">Effectiveness</div>
        </div>

        {/* Cost */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            {[1, 2, 3].map((level) => (
              <span
                key={level}
                className={`w-2 h-4 rounded ${
                  (strategy.cost === 'low' && level <= 1) ||
                  (strategy.cost === 'medium' && level <= 2) ||
                  strategy.cost === 'high'
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {strategy.cost.charAt(0).toUpperCase() + strategy.cost.slice(1)} Cost
          </div>
        </div>
      </div>

      {/* Techniques */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Covered Techniques</h4>
          <span className="text-xs text-gray-400">{strategy.techniques.length}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {strategy.techniques.slice(0, 5).map((technique) => (
            <span
              key={technique}
              className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-mono"
            >
              {technique}
            </span>
          ))}
          {strategy.techniques.length > 5 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              +{strategy.techniques.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase">Security Controls</h4>
          <span className="text-xs text-gray-400">{strategy.controls.length}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {strategy.controls.slice(0, 4).map((control) => (
            <span
              key={control}
              className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
            >
              {control}
            </span>
          ))}
          {strategy.controls.length > 4 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
              +{strategy.controls.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-3">
          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Implemented:</span>
              <span className="ml-2 font-medium">{formatDate(strategy.implementedAt)}</span>
            </div>
            <div>
              <span className="text-gray-500">Last Review:</span>
              <span className="ml-2 font-medium">{formatDate(strategy.reviewedAt)}</span>
            </div>
          </div>

          {/* All Techniques */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">All Techniques</h4>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {strategy.techniques.map((technique) => (
                <span
                  key={technique}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded font-mono"
                >
                  {technique}
                </span>
              ))}
            </div>
          </div>

          {/* All Controls */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">All Controls</h4>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
              {strategy.controls.map((control) => (
                <span
                  key={control}
                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                >
                  {control}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toggle Details */}
      <button
        className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-1"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Hide details' : 'Show details'}
        <svg
          className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
        {onEdit && (
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(strategy);
            }}
          >
            Edit
          </button>
        )}
        {onActivate && strategy.status !== 'active' && strategy.status !== 'deprecated' && (
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100"
            onClick={(e) => {
              e.stopPropagation();
              onActivate(strategy);
            }}
          >
            Activate
          </button>
        )}
        {onDeprecate && strategy.status === 'active' && (
          <button
            className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              onDeprecate(strategy);
            }}
          >
            Deprecate
          </button>
        )}
      </div>
    </div>
  );
};

export default DefenseStrategyCard;
