import React, { useState, useMemo } from 'react';
import type { MitreTactic, MitreTechnique, Detection, DefenseStrategy } from './types';

export interface MitreAttackMatrixProps {
  techniques: MitreTechnique[];
  detections?: Detection[];
  defenseStrategies?: DefenseStrategy[];
  onSelectTechnique?: (technique: MitreTechnique) => void;
  onSelectTactic?: (tactic: MitreTactic) => void;
  highlightedTechniques?: string[];
  selectedTechniqueId?: string;
  showCoverage?: boolean;
  showDetections?: boolean;
  className?: string;
}

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

const tacticLabels: Record<MitreTactic, string> = {
  reconnaissance: 'Reconnaissance',
  'resource-development': 'Resource Development',
  'initial-access': 'Initial Access',
  execution: 'Execution',
  persistence: 'Persistence',
  'privilege-escalation': 'Privilege Escalation',
  'defense-evasion': 'Defense Evasion',
  'credential-access': 'Credential Access',
  discovery: 'Discovery',
  'lateral-movement': 'Lateral Movement',
  collection: 'Collection',
  'command-and-control': 'Command & Control',
  exfiltration: 'Exfiltration',
  impact: 'Impact',
};

const tacticColors: Record<MitreTactic, string> = {
  reconnaissance: 'bg-slate-500',
  'resource-development': 'bg-violet-500',
  'initial-access': 'bg-red-500',
  execution: 'bg-orange-500',
  persistence: 'bg-amber-500',
  'privilege-escalation': 'bg-lime-500',
  'defense-evasion': 'bg-green-500',
  'credential-access': 'bg-teal-500',
  discovery: 'bg-cyan-500',
  'lateral-movement': 'bg-sky-500',
  collection: 'bg-blue-500',
  'command-and-control': 'bg-indigo-500',
  exfiltration: 'bg-purple-500',
  impact: 'bg-pink-500',
};

export const MitreAttackMatrix: React.FC<MitreAttackMatrixProps> = ({
  techniques,
  detections = [],
  defenseStrategies = [],
  onSelectTechnique,
  onSelectTactic,
  highlightedTechniques = [],
  selectedTechniqueId,
  showCoverage = false,
  showDetections = false,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTechnique, setHoveredTechnique] = useState<MitreTechnique | null>(null);
  const [expandedTactics, setExpandedTactics] = useState<Set<MitreTactic>>(new Set());

  const techniquesByTactic = useMemo(() => {
    return techniques.reduce(
      (acc, technique) => {
        if (!acc[technique.tactic]) acc[technique.tactic] = [];
        acc[technique.tactic].push(technique);
        return acc;
      },
      {} as Record<MitreTactic, MitreTechnique[]>
    );
  }, [techniques]);

  const detectionsByTechnique = useMemo(() => {
    return detections.reduce(
      (acc, detection) => {
        if (!acc[detection.technique]) acc[detection.technique] = [];
        acc[detection.technique].push(detection);
        return acc;
      },
      {} as Record<string, Detection[]>
    );
  }, [detections]);

  const coverageByTechnique = useMemo(() => {
    const coverage: Record<string, number> = {};
    defenseStrategies.forEach((strategy) => {
      strategy.techniques.forEach((techniqueId) => {
        coverage[techniqueId] = (coverage[techniqueId] || 0) + strategy.effectiveness;
      });
    });
    return coverage;
  }, [defenseStrategies]);

  const filteredTechniquesByTactic = useMemo(() => {
    if (!searchQuery) return techniquesByTactic;

    const query = searchQuery.toLowerCase();
    const filtered: Record<MitreTactic, MitreTechnique[]> = {} as Record<MitreTactic, MitreTechnique[]>;

    Object.entries(techniquesByTactic).forEach(([tactic, techs]) => {
      const matching = techs.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
      if (matching.length > 0) {
        filtered[tactic as MitreTactic] = matching;
      }
    });

    return filtered;
  }, [techniquesByTactic, searchQuery]);

  const stats = useMemo(() => {
    const totalTechniques = techniques.length;
    const coveredTechniques = Object.keys(coverageByTechnique).length;
    const detectedTechniques = new Set(detections.map((d) => d.technique)).size;

    return {
      total: totalTechniques,
      covered: coveredTechniques,
      coveragePercent: totalTechniques > 0 ? Math.round((coveredTechniques / totalTechniques) * 100) : 0,
      detected: detectedTechniques,
    };
  }, [techniques, coverageByTechnique, detections]);

  const getTechniqueStyle = (technique: MitreTechnique) => {
    const isHighlighted = highlightedTechniques.includes(technique.id);
    const isSelected = selectedTechniqueId === technique.id;
    const hasDetections = (detectionsByTechnique[technique.id]?.length || 0) > 0;
    const coverage = coverageByTechnique[technique.id] || 0;

    let bgClass = 'bg-gray-100 hover:bg-gray-200';
    let borderClass = 'border-transparent';

    if (isSelected) {
      borderClass = 'border-blue-500 ring-2 ring-blue-200';
    } else if (isHighlighted) {
      bgClass = 'bg-yellow-100 hover:bg-yellow-200';
    }

    if (showDetections && hasDetections) {
      bgClass = 'bg-red-100 hover:bg-red-200';
    }

    if (showCoverage && coverage > 0) {
      if (coverage >= 80) {
        bgClass = 'bg-green-100 hover:bg-green-200';
      } else if (coverage >= 50) {
        bgClass = 'bg-yellow-100 hover:bg-yellow-200';
      } else {
        bgClass = 'bg-orange-100 hover:bg-orange-200';
      }
    }

    return `${bgClass} border ${borderClass}`;
  };

  const toggleTactic = (tactic: MitreTactic) => {
    setExpandedTactics((prev) => {
      const next = new Set(prev);
      if (next.has(tactic)) {
        next.delete(tactic);
      } else {
        next.add(tactic);
      }
      return next;
    });
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="mitre-attack-matrix">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">MITRE ATT&CK Matrix</h2>
          <div className="flex items-center gap-4">
            {showCoverage && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Coverage:</span>
                <span className="text-sm font-medium text-green-600">{stats.coveragePercent}%</span>
              </div>
            )}
            {showDetections && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Detected:</span>
                <span className="text-sm font-medium text-red-600">{stats.detected}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search techniques..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          {showCoverage && (
            <>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-100 rounded" />
                <span className="text-gray-600">High Coverage (80%+)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-100 rounded" />
                <span className="text-gray-600">Medium (50-79%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-100 rounded" />
                <span className="text-gray-600">Low (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-gray-100 rounded" />
                <span className="text-gray-600">No Coverage</span>
              </div>
            </>
          )}
          {showDetections && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-100 rounded" />
              <span className="text-gray-600">Active Detections</span>
            </div>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] p-4">
          <div className="grid grid-cols-14 gap-2">
            {tacticOrder.map((tactic) => {
              const tacticTechniques = filteredTechniquesByTactic[tactic] || [];
              const isExpanded = expandedTactics.has(tactic);

              return (
                <div key={tactic} className="min-w-[150px]">
                  {/* Tactic Header */}
                  <button
                    className={`w-full p-2 rounded-t-lg text-white text-xs font-medium text-center ${tacticColors[tactic]}`}
                    onClick={() => {
                      toggleTactic(tactic);
                      onSelectTactic?.(tactic);
                    }}
                  >
                    {tacticLabels[tactic]}
                    <span className="ml-1 opacity-75">({tacticTechniques.length})</span>
                  </button>

                  {/* Techniques */}
                  <div className="space-y-1 mt-1 max-h-[400px] overflow-y-auto">
                    {(isExpanded ? tacticTechniques : tacticTechniques.slice(0, 10)).map(
                      (technique) => (
                        <div
                          key={technique.id}
                          className={`p-2 rounded text-xs cursor-pointer transition-colors ${getTechniqueStyle(
                            technique
                          )}`}
                          onClick={() => onSelectTechnique?.(technique)}
                          onMouseEnter={() => setHoveredTechnique(technique)}
                          onMouseLeave={() => setHoveredTechnique(null)}
                          data-testid={`technique-${technique.id}`}
                        >
                          <div className="font-mono text-gray-500 text-[10px]">
                            {technique.id}
                          </div>
                          <div className="font-medium text-gray-800 line-clamp-2">
                            {technique.name}
                          </div>
                          {showDetections && detectionsByTechnique[technique.id] && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              <span className="text-red-600">
                                {detectionsByTechnique[technique.id].length}
                              </span>
                            </div>
                          )}
                          {showCoverage && coverageByTechnique[technique.id] && (
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                              <div
                                className={`h-1 rounded-full ${
                                  coverageByTechnique[technique.id] >= 80
                                    ? 'bg-green-500'
                                    : coverageByTechnique[technique.id] >= 50
                                    ? 'bg-yellow-500'
                                    : 'bg-orange-500'
                                }`}
                                style={{
                                  width: `${Math.min(coverageByTechnique[technique.id], 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    )}
                    {!isExpanded && tacticTechniques.length > 10 && (
                      <button
                        className="w-full p-2 text-xs text-blue-600 hover:bg-blue-50 rounded"
                        onClick={() => toggleTactic(tactic)}
                      >
                        +{tacticTechniques.length - 10} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTechnique && (
        <div className="fixed bottom-4 right-4 w-80 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="text-xs font-mono text-gray-500">{hoveredTechnique.id}</span>
              <h3 className="font-medium text-gray-900">{hoveredTechnique.name}</h3>
            </div>
            <span
              className={`px-2 py-0.5 text-xs text-white rounded ${
                tacticColors[hoveredTechnique.tactic]
              }`}
            >
              {tacticLabels[hoveredTechnique.tactic]}
            </span>
          </div>
          <p className="text-sm text-gray-600 line-clamp-3">{hoveredTechnique.description}</p>

          {hoveredTechnique.platforms.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Platforms: </span>
              <span className="text-xs text-gray-700">
                {hoveredTechnique.platforms.join(', ')}
              </span>
            </div>
          )}

          {detectionsByTechnique[hoveredTechnique.id] && (
            <div className="mt-2 p-2 bg-red-50 rounded">
              <span className="text-xs text-red-700">
                {detectionsByTechnique[hoveredTechnique.id].length} active detection(s)
              </span>
            </div>
          )}

          {coverageByTechnique[hoveredTechnique.id] && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Defense Coverage</span>
                <span className="text-gray-700">
                  {Math.min(coverageByTechnique[hoveredTechnique.id], 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(coverageByTechnique[hoveredTechnique.id], 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MitreAttackMatrix;
