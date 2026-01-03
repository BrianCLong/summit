import React, { useMemo } from 'react';
import type { Adversary } from './types';

export interface AdversaryComparisonProps {
  adversaries: Adversary[];
  maxAdversaries?: number;
  onRemoveAdversary?: (adversaryId: string) => void;
  onSelectAdversary?: (adversary: Adversary) => void;
  className?: string;
}

const threatLevelColors: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

const adversaryColors = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

interface ComparisonCategory {
  label: string;
  key: keyof Adversary | 'techniqueCount' | 'malwareCount' | 'toolCount' | 'campaignCount';
  type: 'number' | 'list' | 'string' | 'date' | 'boolean';
  unit?: string;
}

const comparisonCategories: ComparisonCategory[] = [
  { label: 'Threat Level', key: 'threatLevel', type: 'string' },
  { label: 'Type', key: 'type', type: 'string' },
  { label: 'Confidence', key: 'confidence', type: 'number', unit: '%' },
  { label: 'Active', key: 'active', type: 'boolean' },
  { label: 'Techniques', key: 'techniqueCount', type: 'number' },
  { label: 'Malware', key: 'malwareCount', type: 'number' },
  { label: 'Tools', key: 'toolCount', type: 'number' },
  { label: 'Campaigns', key: 'campaignCount', type: 'number' },
  { label: 'Target Sectors', key: 'targetSectors', type: 'list' },
  { label: 'Target Regions', key: 'targetRegions', type: 'list' },
  { label: 'First Seen', key: 'firstSeen', type: 'date' },
  { label: 'Last Seen', key: 'lastSeen', type: 'date' },
];

export const AdversaryComparison: React.FC<AdversaryComparisonProps> = ({
  adversaries,
  maxAdversaries = 5,
  onRemoveAdversary,
  onSelectAdversary,
  className = '',
}) => {
  const displayedAdversaries = adversaries.slice(0, maxAdversaries);

  const getValue = (adversary: Adversary, key: ComparisonCategory['key']): unknown => {
    switch (key) {
      case 'techniqueCount':
        return adversary.techniques.length;
      case 'malwareCount':
        return adversary.malware.length;
      case 'toolCount':
        return adversary.tools.length;
      case 'campaignCount':
        return adversary.campaigns.length;
      default:
        return adversary[key as keyof Adversary];
    }
  };

  const formatValue = (value: unknown, type: ComparisonCategory['type'], unit?: string): string => {
    if (value === undefined || value === null) return '-';

    switch (type) {
      case 'number':
        return `${value}${unit || ''}`;
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        return new Date(value as string).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
      case 'list':
        return (value as string[]).length.toString();
      case 'string':
      default:
        return String(value);
    }
  };

  const sharedTechniques = useMemo(() => {
    if (displayedAdversaries.length < 2) return [];
    const techniqueCounts: Record<string, number> = {};
    displayedAdversaries.forEach((adv) => {
      adv.techniques.forEach((tech) => {
        techniqueCounts[tech] = (techniqueCounts[tech] || 0) + 1;
      });
    });
    return Object.entries(techniqueCounts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([tech, count]) => ({ technique: tech, count }));
  }, [displayedAdversaries]);

  const sharedTargets = useMemo(() => {
    if (displayedAdversaries.length < 2) return { sectors: [], regions: [] };

    const sectorCounts: Record<string, number> = {};
    const regionCounts: Record<string, number> = {};

    displayedAdversaries.forEach((adv) => {
      adv.targetSectors.forEach((sector) => {
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      });
      adv.targetRegions.forEach((region) => {
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      });
    });

    return {
      sectors: Object.entries(sectorCounts)
        .filter(([, count]) => count > 1)
        .map(([sector, count]) => ({ sector, count })),
      regions: Object.entries(regionCounts)
        .filter(([, count]) => count > 1)
        .map(([region, count]) => ({ region, count })),
    };
  }, [displayedAdversaries]);

  if (displayedAdversaries.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-8 text-center ${className}`}>
        <p className="text-gray-500">Select adversaries to compare</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="adversary-comparison">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Adversary Comparison</h2>
        <p className="text-sm text-gray-500 mt-1">
          Comparing {displayedAdversaries.length} adversar{displayedAdversaries.length === 1 ? 'y' : 'ies'}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase p-3 w-40">
                Attribute
              </th>
              {displayedAdversaries.map((adversary, index) => (
                <th key={adversary.id} className="text-center p-3 min-w-[150px]">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${adversaryColors[index % adversaryColors.length]}`}
                    />
                    <button
                      className="font-medium text-gray-900 hover:text-blue-600"
                      onClick={() => onSelectAdversary?.(adversary)}
                    >
                      {adversary.name}
                    </button>
                    {onRemoveAdversary && (
                      <button
                        className="ml-1 text-gray-400 hover:text-red-500"
                        onClick={() => onRemoveAdversary(adversary.id)}
                      >
                        \u00D7
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonCategories.map((category) => (
              <tr key={category.key} className="border-b border-gray-100">
                <td className="text-sm text-gray-600 p-3 font-medium">{category.label}</td>
                {displayedAdversaries.map((adversary) => {
                  const value = getValue(adversary, category.key);
                  const formattedValue = formatValue(value, category.type, category.unit);

                  return (
                    <td key={adversary.id} className="text-center p-3">
                      {category.key === 'threatLevel' ? (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            threatLevelColors[value as string] || ''
                          }`}
                        >
                          {String(value).toUpperCase()}
                        </span>
                      ) : category.key === 'active' ? (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {formattedValue}
                        </span>
                      ) : category.type === 'list' ? (
                        <div className="flex flex-col items-center">
                          <span className="font-medium">{formattedValue}</span>
                          <span className="text-xs text-gray-500">
                            {(value as string[]).slice(0, 3).join(', ')}
                            {(value as string[]).length > 3 && '...'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">{formattedValue}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shared Attributes */}
      {displayedAdversaries.length > 1 && (
        <div className="p-4 border-t border-gray-200 space-y-4">
          {/* Shared Techniques */}
          {sharedTechniques.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Shared Techniques ({sharedTechniques.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {sharedTechniques.slice(0, 15).map(({ technique, count }) => (
                  <span
                    key={technique}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded font-mono"
                  >
                    {technique}
                    <span className="ml-1 text-purple-500">({count})</span>
                  </span>
                ))}
                {sharedTechniques.length > 15 && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    +{sharedTechniques.length - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Shared Target Sectors */}
          {sharedTargets.sectors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Shared Target Sectors ({sharedTargets.sectors.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {sharedTargets.sectors.map(({ sector, count }) => (
                  <span
                    key={sector}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                  >
                    {sector}
                    <span className="ml-1 text-blue-500">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared Target Regions */}
          {sharedTargets.regions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Shared Target Regions ({sharedTargets.regions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {sharedTargets.regions.map(({ region, count }) => (
                  <span
                    key={region}
                    className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                  >
                    {region}
                    <span className="ml-1 text-green-500">({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {sharedTechniques.length === 0 &&
            sharedTargets.sectors.length === 0 &&
            sharedTargets.regions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No shared attributes found between selected adversaries.
              </p>
            )}
        </div>
      )}

      {/* Technique Overlap Visualization */}
      {displayedAdversaries.length > 1 && displayedAdversaries.length <= 3 && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Technique Coverage</h3>
          <div className="space-y-2">
            {displayedAdversaries.map((adversary, index) => (
              <div key={adversary.id} className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${adversaryColors[index % adversaryColors.length]}`}
                />
                <span className="text-sm text-gray-600 w-32 truncate">{adversary.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className={`${adversaryColors[index % adversaryColors.length]} h-4 rounded-full`}
                    style={{
                      width: `${Math.min(adversary.techniques.length * 2, 100)}%`,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-difference">
                    {adversary.techniques.length} techniques
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdversaryComparison;
