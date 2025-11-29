/**
 * GEOINT Threat Analysis Dashboard
 * React UI components for geospatial intelligence visualization
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

interface GeoPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
}

interface ThreatHeatmapCell {
  h3Index: string;
  threatScore: number;
  incidentCount?: number;
}

interface ThreatActor {
  id: string;
  name: string;
  type: string;
  primaryCountry?: string;
  locations: Array<{
    location: GeoPoint;
    locationType: string;
    confidence: number;
  }>;
  threatLevel: number;
}

interface IOC {
  id: string;
  type: string;
  value: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  geolocation?: GeoPoint & { country?: string; city?: string };
}

interface FusionResult {
  id: string;
  correlations: Array<{
    type: string;
    entities: string[];
    confidence: number;
  }>;
  threatAssessment: {
    overallThreat: number;
    mitigationPriority: string;
  };
  geospatialSummary: {
    threatHeatmap: ThreatHeatmapCell[];
    criticalInfrastructureAtRisk: Array<{
      name: string;
      type: string;
      location: GeoPoint;
      riskLevel: string;
    }>;
  };
}

interface ViewshedResult {
  observerPoint: GeoPoint;
  visibleArea: number;
  visibleCells: Array<{ latitude: number; longitude: number; distance: number }>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Custom hook for fetching threat data with caching
 */
export function useThreatData(
  bounds: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null,
  refreshInterval: number = 30000
) {
  const [threatActors, setThreatActors] = useState<ThreatActor[]>([]);
  const [iocs, setIOCs] = useState<IOC[]>([]);
  const [heatmap, setHeatmap] = useState<ThreatHeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!bounds) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/geoint/threat-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      setThreatActors(data.threatActors || []);
      setIOCs(data.iocs || []);
      setHeatmap(data.heatmap || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch threat data'));
    } finally {
      setLoading(false);
    }
  }, [bounds]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { threatActors, iocs, heatmap, loading, error, lastUpdated, refresh: fetchData };
}

/**
 * Custom hook for fusion analysis
 */
export function useFusionAnalysis() {
  const [result, setResult] = useState<FusionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeFusion = useCallback(async (params: {
    threatActorIds?: string[];
    iocIds?: string[];
    spatialBounds?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/geoint/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Fusion analysis failed: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fusion analysis failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, executeFusion };
}

/**
 * Custom hook for terrain analysis
 */
export function useTerrainAnalysis() {
  const [viewshed, setViewshed] = useState<ViewshedResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeViewshed = useCallback(async (
    observer: GeoPoint,
    maxRadius: number
  ): Promise<ViewshedResult> => {
    setLoading(true);
    try {
      const response = await fetch('/api/geoint/terrain/viewshed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observer, maxRadius, resolution: 30 }),
      });

      const data = await response.json();
      setViewshed(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { viewshed, loading, analyzeViewshed };
}

// ============================================================================
// Components
// ============================================================================

/**
 * Threat Level Badge Component
 */
export const ThreatLevelBadge: React.FC<{
  level: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ level, size = 'md' }) => {
  const getColor = (level: number): string => {
    if (level >= 80) return '#dc2626'; // red-600
    if (level >= 60) return '#ea580c'; // orange-600
    if (level >= 40) return '#ca8a04'; // yellow-600
    if (level >= 20) return '#16a34a'; // green-600
    return '#6b7280'; // gray-500
  };

  const getLabel = (level: number): string => {
    if (level >= 80) return 'CRITICAL';
    if (level >= 60) return 'HIGH';
    if (level >= 40) return 'MEDIUM';
    if (level >= 20) return 'LOW';
    return 'INFO';
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: `${getColor(level)}20`, color: getColor(level) }}
    >
      {getLabel(level)} ({level}%)
    </span>
  );
};

/**
 * IOC Card Component
 */
export const IOCCard: React.FC<{
  ioc: IOC;
  onClick?: (ioc: IOC) => void;
  selected?: boolean;
}> = ({ ioc, onClick, selected }) => {
  const severityColors: Record<string, string> = {
    CRITICAL: 'border-red-500 bg-red-50',
    HIGH: 'border-orange-500 bg-orange-50',
    MEDIUM: 'border-yellow-500 bg-yellow-50',
    LOW: 'border-green-500 bg-green-50',
    INFO: 'border-gray-500 bg-gray-50',
  };

  return (
    <div
      className={`
        border-l-4 p-4 rounded-r cursor-pointer transition-all
        ${severityColors[ioc.severity]}
        ${selected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}
      `}
      onClick={() => onClick?.(ioc)}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase">{ioc.type}</span>
          <p className="font-mono text-sm mt-1 break-all">{ioc.value}</p>
        </div>
        <ThreatLevelBadge level={ioc.confidence} size="sm" />
      </div>
      {ioc.geolocation && (
        <div className="mt-2 text-xs text-gray-600">
          📍 {ioc.geolocation.city || 'Unknown'}, {ioc.geolocation.country || 'Unknown'}
        </div>
      )}
    </div>
  );
};

/**
 * Threat Actor Panel Component
 */
export const ThreatActorPanel: React.FC<{
  actor: ThreatActor;
  onLocationClick?: (location: GeoPoint) => void;
  expanded?: boolean;
  onToggle?: () => void;
}> = ({ actor, onLocationClick, expanded = false, onToggle }) => {
  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div
        className="p-4 cursor-pointer flex justify-between items-center"
        onClick={onToggle}
      >
        <div>
          <h3 className="font-semibold text-gray-900">{actor.name}</h3>
          <p className="text-sm text-gray-500">
            {actor.type} • {actor.primaryCountry || 'Unknown Origin'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThreatLevelBadge level={actor.threatLevel} />
          <svg
            className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mt-3 mb-2">Known Locations</h4>
          <div className="space-y-2">
            {actor.locations.map((loc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm cursor-pointer hover:bg-gray-100"
                onClick={() => onLocationClick?.(loc.location)}
              >
                <span>{loc.locationType}</span>
                <span className="text-gray-500">
                  {loc.location.latitude.toFixed(4)}, {loc.location.longitude.toFixed(4)}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {loc.confidence}% conf.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Fusion Results Panel Component
 */
export const FusionResultsPanel: React.FC<{
  result: FusionResult;
  onCorrelationClick?: (correlation: FusionResult['correlations'][0]) => void;
}> = ({ result, onCorrelationClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Intelligence Fusion Results</h2>
        <ThreatLevelBadge level={result.threatAssessment.overallThreat} size="lg" />
      </div>

      {/* Threat Assessment Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{result.correlations.length}</p>
          <p className="text-sm text-gray-500">Correlations Found</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {result.geospatialSummary.threatHeatmap.length}
          </p>
          <p className="text-sm text-gray-500">Threat Hotspots</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {result.geospatialSummary.criticalInfrastructureAtRisk.length}
          </p>
          <p className="text-sm text-gray-500">Infrastructure at Risk</p>
        </div>
      </div>

      {/* Correlations List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Key Correlations</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {result.correlations.slice(0, 10).map((correlation, idx) => (
            <div
              key={idx}
              className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
              onClick={() => onCorrelationClick?.(correlation)}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{correlation.type}</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {correlation.confidence}% confidence
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {correlation.entities.length} entities linked
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Mitigation Priority */}
      <div className="mt-6 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Mitigation Priority: {result.threatAssessment.mitigationPriority}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Terrain Analysis Controls Component
 */
export const TerrainAnalysisControls: React.FC<{
  onViewshedAnalysis: (observer: GeoPoint, radius: number) => void;
  onLineOfSightAnalysis: (observer: GeoPoint, target: GeoPoint) => void;
  loading?: boolean;
}> = ({ onViewshedAnalysis, onLineOfSightAnalysis, loading }) => {
  const [mode, setMode] = useState<'viewshed' | 'los'>('viewshed');
  const [observer, setObserver] = useState<GeoPoint>({ latitude: 38.9, longitude: -77.0, elevation: 100 });
  const [target, setTarget] = useState<GeoPoint>({ latitude: 38.95, longitude: -77.05, elevation: 50 });
  const [radius, setRadius] = useState(5000);

  const handleSubmit = () => {
    if (mode === 'viewshed') {
      onViewshedAnalysis(observer, radius);
    } else {
      onLineOfSightAnalysis(observer, target);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Terrain Analysis</h3>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${
            mode === 'viewshed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setMode('viewshed')}
        >
          Viewshed
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${
            mode === 'los'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setMode('los')}
        >
          Line of Sight
        </button>
      </div>

      {/* Observer Position */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Observer Position</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Latitude"
            value={observer.latitude}
            onChange={(e) => setObserver({ ...observer, latitude: parseFloat(e.target.value) })}
            className="border rounded px-2 py-1 text-sm"
            step="0.001"
          />
          <input
            type="number"
            placeholder="Longitude"
            value={observer.longitude}
            onChange={(e) => setObserver({ ...observer, longitude: parseFloat(e.target.value) })}
            className="border rounded px-2 py-1 text-sm"
            step="0.001"
          />
          <input
            type="number"
            placeholder="Elevation (m)"
            value={observer.elevation}
            onChange={(e) => setObserver({ ...observer, elevation: parseFloat(e.target.value) })}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      {mode === 'viewshed' ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Analysis Radius: {radius}m
          </label>
          <input
            type="range"
            min="1000"
            max="20000"
            step="500"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      ) : (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Position</label>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Latitude"
              value={target.latitude}
              onChange={(e) => setTarget({ ...target, latitude: parseFloat(e.target.value) })}
              className="border rounded px-2 py-1 text-sm"
              step="0.001"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={target.longitude}
              onChange={(e) => setTarget({ ...target, longitude: parseFloat(e.target.value) })}
              className="border rounded px-2 py-1 text-sm"
              step="0.001"
            />
            <input
              type="number"
              placeholder="Elevation (m)"
              value={target.elevation}
              onChange={(e) => setTarget({ ...target, elevation: parseFloat(e.target.value) })}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
      )}

      <button
        className={`w-full py-2 rounded font-medium ${
          loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : `Run ${mode === 'viewshed' ? 'Viewshed' : 'Line of Sight'} Analysis`}
      </button>
    </div>
  );
};

/**
 * Threat Heatmap Legend Component
 */
export const HeatmapLegend: React.FC<{
  min?: number;
  max?: number;
}> = ({ min = 0, max = 100 }) => {
  const gradientStops = [
    { color: '#22c55e', label: 'Low' },
    { color: '#eab308', label: 'Medium' },
    { color: '#f97316', label: 'High' },
    { color: '#dc2626', label: 'Critical' },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <h4 className="text-xs font-medium text-gray-700 mb-2">Threat Intensity</h4>
      <div
        className="h-3 rounded"
        style={{
          background: `linear-gradient(to right, ${gradientStops.map(s => s.color).join(', ')})`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

/**
 * Main GEOINT Dashboard Component
 */
export const GEOINTDashboard: React.FC<{
  initialBounds?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
}> = ({ initialBounds }) => {
  const [bounds, setBounds] = useState(initialBounds || {
    minLon: -77.5,
    minLat: 38.5,
    maxLon: -76.5,
    maxLat: 39.5,
  });
  const [selectedIOC, setSelectedIOC] = useState<IOC | null>(null);
  const [expandedActor, setExpandedActor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'threats' | 'iocs' | 'fusion'>('threats');

  const { threatActors, iocs, heatmap, loading, error, lastUpdated, refresh } = useThreatData(bounds);
  const { result: fusionResult, loading: fusionLoading, executeFusion } = useFusionAnalysis();
  const { viewshed, loading: terrainLoading, analyzeViewshed } = useTerrainAnalysis();

  const handleRunFusion = useCallback(() => {
    executeFusion({
      threatActorIds: threatActors.map(a => a.id),
      iocIds: iocs.map(i => i.id),
      spatialBounds: bounds,
    });
  }, [threatActors, iocs, bounds, executeFusion]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GEOINT Threat Analysis Platform</h1>
            <p className="text-sm text-gray-500">
              Multi-INT Fusion • Real-time Threat Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              onClick={handleRunFusion}
              disabled={fusionLoading || threatActors.length === 0}
            >
              {fusionLoading ? 'Running Fusion...' : 'Run Intelligence Fusion'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Threat Data */}
        <aside className="w-96 bg-white shadow-lg overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b sticky top-0 bg-white z-10">
            {(['threats', 'iocs', 'fusion'] as const).map((tab) => (
              <button
                key={tab}
                className={`flex-1 px-4 py-3 text-sm font-medium ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">
                Error: {error.message}
              </div>
            )}

            {activeTab === 'threats' && (
              <div className="space-y-3">
                <h2 className="font-semibold text-gray-900">
                  Threat Actors ({threatActors.length})
                </h2>
                {threatActors.map((actor) => (
                  <ThreatActorPanel
                    key={actor.id}
                    actor={actor}
                    expanded={expandedActor === actor.id}
                    onToggle={() => setExpandedActor(
                      expandedActor === actor.id ? null : actor.id
                    )}
                  />
                ))}
                {threatActors.length === 0 && !loading && (
                  <p className="text-gray-500 text-center py-8">
                    No threat actors in selected region
                  </p>
                )}
              </div>
            )}

            {activeTab === 'iocs' && (
              <div className="space-y-3">
                <h2 className="font-semibold text-gray-900">
                  Indicators of Compromise ({iocs.length})
                </h2>
                {iocs.map((ioc) => (
                  <IOCCard
                    key={ioc.id}
                    ioc={ioc}
                    onClick={setSelectedIOC}
                    selected={selectedIOC?.id === ioc.id}
                  />
                ))}
                {iocs.length === 0 && !loading && (
                  <p className="text-gray-500 text-center py-8">
                    No IOCs with geolocation in selected region
                  </p>
                )}
              </div>
            )}

            {activeTab === 'fusion' && fusionResult && (
              <FusionResultsPanel result={fusionResult} />
            )}

            {activeTab === 'fusion' && !fusionResult && (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Run intelligence fusion to see results</p>
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  onClick={handleRunFusion}
                  disabled={fusionLoading}
                >
                  Run Fusion Analysis
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Map Area (placeholder) */}
        <main className="flex-1 relative">
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 text-lg mb-2">
                Map Visualization Area
              </p>
              <p className="text-gray-400 text-sm">
                Bounds: {bounds.minLat.toFixed(2)}°N - {bounds.maxLat.toFixed(2)}°N,{' '}
                {bounds.minLon.toFixed(2)}°W - {bounds.maxLon.toFixed(2)}°W
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {heatmap.length} threat heatmap cells loaded
              </p>
            </div>
          </div>

          {/* Overlay Controls */}
          <div className="absolute top-4 right-4 w-72 space-y-4">
            <TerrainAnalysisControls
              onViewshedAnalysis={analyzeViewshed}
              onLineOfSightAnalysis={() => {}}
              loading={terrainLoading}
            />
            <HeatmapLegend />
          </div>

          {/* Viewshed Results Overlay */}
          {viewshed && (
            <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 w-64">
              <h4 className="font-semibold text-gray-900 mb-2">Viewshed Analysis</h4>
              <p className="text-sm text-gray-600">
                Visible area: {(viewshed.visibleArea / 1000000).toFixed(2)} km²
              </p>
              <p className="text-sm text-gray-600">
                Visible cells: {viewshed.visibleCells.length}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GEOINTDashboard;
