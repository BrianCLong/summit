/**
 * IntelGraph GA-Core Enhanced Tri-Pane Explorer
 * Committee Requirements: Tri-pane explorer shell with guardrails, ledger, and XAI overlays
 * Golden path integration with synchronized timeline ↔ map ↔ graph
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

interface TriPaneState {
  activePane: 'timeline' | 'map' | 'graph';
  syncMode: boolean;
  selectedEntity: string | null;
  timeRange: { start: Date; end: Date };
  xaiOverlayEnabled: boolean;
  provenanceOverlayEnabled: boolean;
  goldenPathActive: boolean;
}

interface EntitySelection {
  id: string;
  type: string;
  properties: Record<string, any>;
  confidence: number;
  source: string;
}

interface XAIOverlayData {
  explanations: any[];
  confidence: number;
  model_version: string;
}

interface ProvenanceData {
  chain: any[];
  verified: boolean;
  last_update: Date;
}

export const EnhancedTriPaneExplorer: React.FC = () => {
  const dispatch = useDispatch();
  const [state, setState] = useState<TriPaneState>({
    activePane: 'timeline',
    syncMode: true,
    selectedEntity: null,
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    xaiOverlayEnabled: false,
    provenanceOverlayEnabled: false,
    goldenPathActive: false,
  });

  const [selectedEntity, setSelectedEntity] = useState<EntitySelection | null>(
    null,
  );
  const [xaiData, setXaiData] = useState<XAIOverlayData | null>(null);
  const [provenanceData, setProvenanceData] = useState<ProvenanceData | null>(
    null,
  );
  const [goldenPathStep, setGoldenPathStep] = useState(0);

  const timelineRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  // Committee requirement: Synchronized timeline ↔ map ↔ graph
  const handleEntitySelection = useCallback(
    async (entity: EntitySelection, sourcePane: string) => {
      setSelectedEntity(entity);
      setState((prev) => ({ ...prev, selectedEntity: entity.id }));

      if (state.syncMode) {
        // Synchronize selection across all panes
        if (sourcePane !== 'timeline') {
          // Update timeline to focus on entity's time range
          // This would integrate with actual timeline component
          console.log(`Timeline: Focusing on entity ${entity.id}`);
        }

        if (sourcePane !== 'map') {
          // Update map to center on entity's location
          // This would integrate with actual map component
          console.log(`Map: Centering on entity ${entity.id}`);
        }

        if (sourcePane !== 'graph') {
          // Update graph to highlight entity and connections
          // This would integrate with actual graph component
          console.log(`Graph: Highlighting entity ${entity.id}`);
        }
      }

      // Committee requirement: XAI overlay integration
      if (state.xaiOverlayEnabled) {
        await fetchXAIExplanation(entity);
      }

      // Committee requirement: Provenance overlay integration
      if (state.provenanceOverlayEnabled) {
        await fetchProvenanceData(entity);
      }
    },
    [state.syncMode, state.xaiOverlayEnabled, state.provenanceOverlayEnabled],
  );

  // Committee requirement: XAI explanation integration
  const fetchXAIExplanation = async (entity: EntitySelection) => {
    try {
      const response = await fetch('/api/xai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reason-For-Access':
            'Tri-pane explorer XAI explanation for user analysis',
        },
        body: JSON.stringify({
          query: `Explain entity ${entity.id} in investigation context`,
          graph_data: {
            nodes: [
              {
                id: entity.id,
                type: entity.type,
                properties: entity.properties,
              },
            ],
            edges: [], // Would include actual graph context
          },
          explanation_type: 'node_importance',
          context: {
            pane_source: 'tri_pane_explorer',
            entity_type: entity.type,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setXaiData({
          explanations: data.explanation.explanations,
          confidence: data.explanation.confidence,
          model_version: data.explanation.model_version,
        });
      }
    } catch (error) {
      console.error('XAI explanation failed:', error);
    }
  };

  // Committee requirement: Provenance data integration
  const fetchProvenanceData = async (entity: EntitySelection) => {
    try {
      const response = await fetch('/api/provenance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Reason-For-Access':
            'Tri-pane explorer provenance verification for data integrity',
        },
        body: JSON.stringify({
          entity_ids: [entity.id],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProvenanceData({
          chain: [], // Would include actual provenance chain
          verified: data.verification.valid,
          last_update: new Date(),
        });
      }
    } catch (error) {
      console.error('Provenance verification failed:', error);
    }
  };

  // Committee requirement: Golden path demo integration
  const startGoldenPathDemo = () => {
    setState((prev) => ({ ...prev, goldenPathActive: true }));
    setGoldenPathStep(0);

    // Golden path sequence
    const goldenPathSteps = [
      {
        step: 0,
        pane: 'timeline',
        action: 'Load temporal data',
        description: 'Demonstrate temporal analysis capabilities',
      },
      {
        step: 1,
        pane: 'map',
        action: 'Show geospatial correlation',
        description: 'Display location-based intelligence',
      },
      {
        step: 2,
        pane: 'graph',
        action: 'Reveal network connections',
        description: 'Show relationship analysis with XAI explanations',
      },
      {
        step: 3,
        pane: 'all',
        action: 'Enable all overlays',
        description: 'Demonstrate full platform capabilities',
      },
    ];

    // Execute golden path sequence
    goldenPathSteps.forEach((step, index) => {
      setTimeout(() => {
        setGoldenPathStep(index);
        setState((prev) => ({ ...prev, activePane: step.pane as any }));

        if (step.step === 2) {
          // Enable XAI overlay at graph step
          setState((prev) => ({ ...prev, xaiOverlayEnabled: true }));
        }

        if (step.step === 3) {
          // Enable all overlays for final demo
          setState((prev) => ({
            ...prev,
            xaiOverlayEnabled: true,
            provenanceOverlayEnabled: true,
          }));
        }
      }, index * 3000); // 3 second intervals
    });

    // Complete golden path demo
    setTimeout(() => {
      setState((prev) => ({ ...prev, goldenPathActive: false }));
      setGoldenPathStep(0);
    }, goldenPathSteps.length * 3000);
  };

  // Keyboard shortcuts for committee requirements
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Pane navigation (Committee requirement)
      if (e.ctrlKey && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const panes: ('timeline' | 'map' | 'graph')[] = [
          'timeline',
          'map',
          'graph',
        ];
        setState((prev) => ({
          ...prev,
          activePane: panes[parseInt(e.key) - 1],
        }));
      }

      // Toggle sync mode
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        setState((prev) => ({ ...prev, syncMode: !prev.syncMode }));
      }

      // Toggle XAI overlay
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          xaiOverlayEnabled: !prev.xaiOverlayEnabled,
        }));
      }

      // Toggle provenance overlay
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          provenanceOverlayEnabled: !prev.provenanceOverlayEnabled,
        }));
      }

      // Start golden path demo
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        startGoldenPathDemo();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Committee requirement: Tri-pane header with controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            IntelGraph Explorer
          </h2>

          {/* Pane selector */}
          <div className="flex space-x-1">
            {(['timeline', 'map', 'graph'] as const).map((pane, index) => (
              <button
                key={pane}
                onClick={() =>
                  setState((prev) => ({ ...prev, activePane: pane }))
                }
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  state.activePane === pane
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={`Switch to ${pane} view (Ctrl+${index + 1})`}
              >
                {pane.charAt(0).toUpperCase() + pane.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Committee requirement: Control toggles */}
        <div className="flex items-center space-x-4">
          {/* Sync mode toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.syncMode}
              onChange={(e) =>
                setState((prev) => ({ ...prev, syncMode: e.target.checked }))
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Sync Panes (Ctrl+S)</span>
          </label>

          {/* XAI overlay toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.xaiOverlayEnabled}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  xaiOverlayEnabled: e.target.checked,
                }))
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">XAI Overlay (Ctrl+X)</span>
          </label>

          {/* Provenance overlay toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={state.provenanceOverlayEnabled}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  provenanceOverlayEnabled: e.target.checked,
                }))
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">Provenance (Ctrl+P)</span>
          </label>

          {/* Golden path demo button */}
          <button
            onClick={startGoldenPathDemo}
            disabled={state.goldenPathActive}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              state.goldenPathActive
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title="Start golden path demo (Ctrl+G)"
          >
            {state.goldenPathActive
              ? `Demo Step ${goldenPathStep + 1}/4`
              : 'Golden Path Demo'}
          </button>
        </div>
      </div>

      {/* Main tri-pane layout */}
      <div className="flex-1 flex">
        {/* Timeline Pane */}
        <div
          ref={timelineRef}
          className="w-1/3 border-r border-gray-200 bg-white overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              📈 Timeline Analysis
              {state.xaiOverlayEnabled && (
                <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                  XAI
                </span>
              )}
            </h3>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {/* Sample timeline content */}
              <div className="space-y-2">
                <div
                  className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                  onClick={() =>
                    handleEntitySelection(
                      {
                        id: 'event-1',
                        type: 'event',
                        properties: {
                          timestamp: '2025-08-29T10:00:00Z',
                          severity: 'HIGH',
                        },
                        confidence: 0.92,
                        source: 'timeline',
                      },
                      'timeline',
                    )
                  }
                >
                  <div className="text-sm font-medium text-gray-900">
                    High Priority Event
                  </div>
                  <div className="text-xs text-gray-500">
                    10:00 AM - Network Anomaly Detected
                  </div>
                  {state.xaiOverlayEnabled && (
                    <div className="mt-2 text-xs text-purple-600">
                      🧠 XAI: High importance due to timing correlation
                    </div>
                  )}
                </div>

                <div
                  className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                  onClick={() =>
                    handleEntitySelection(
                      {
                        id: 'event-2',
                        type: 'event',
                        properties: {
                          timestamp: '2025-08-29T10:15:00Z',
                          severity: 'MEDIUM',
                        },
                        confidence: 0.78,
                        source: 'timeline',
                      },
                      'timeline',
                    )
                  }
                >
                  <div className="text-sm font-medium text-gray-900">
                    Communication Burst
                  </div>
                  <div className="text-xs text-gray-500">
                    10:15 AM - Increased Activity
                  </div>
                  {state.provenanceOverlayEnabled && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Provenance: Verified chain of custody
                    </div>
                  )}
                </div>
              </div>

              {state.goldenPathActive && goldenPathStep === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800">
                    🌟 Golden Path Demo
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Demonstrating temporal analysis capabilities
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Pane */}
        <div
          ref={mapRef}
          className="w-1/3 border-r border-gray-200 bg-white overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              🗺️ Geospatial Analysis
              {state.provenanceOverlayEnabled && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                  Provenance
                </span>
              )}
            </h3>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {/* Sample map content */}
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🗺️</div>
                  <div className="text-sm">Interactive Map View</div>
                  <div className="text-xs">Click entities for details</div>
                </div>
              </div>

              <div className="space-y-2">
                <div
                  className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                  onClick={() =>
                    handleEntitySelection(
                      {
                        id: 'location-1',
                        type: 'location',
                        properties: {
                          lat: 40.7128,
                          lng: -74.006,
                          name: 'NYC Office',
                        },
                        confidence: 0.95,
                        source: 'map',
                      },
                      'map',
                    )
                  }
                >
                  <div className="text-sm font-medium text-gray-900">
                    NYC Office
                  </div>
                  <div className="text-xs text-gray-500">
                    40.7128, -74.0060 - High Activity
                  </div>
                  {state.xaiOverlayEnabled && xaiData && (
                    <div className="mt-2 text-xs text-purple-600">
                      🧠 XAI Confidence: {Math.round(xaiData.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>

              {state.goldenPathActive && goldenPathStep === 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800">
                    🌟 Golden Path Demo
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    Demonstrating geospatial correlation analysis
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Graph Pane */}
        <div ref={graphRef} className="w-1/3 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              🕸️ Network Analysis
              {state.xaiOverlayEnabled && state.provenanceOverlayEnabled && (
                <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                  Full Analysis
                </span>
              )}
            </h3>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {/* Sample graph content */}
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">🕸️</div>
                  <div className="text-sm">Network Graph View</div>
                  <div className="text-xs">Interactive node exploration</div>
                </div>
              </div>

              <div className="space-y-2">
                <div
                  className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                  onClick={() =>
                    handleEntitySelection(
                      {
                        id: 'entity-1',
                        type: 'person',
                        properties: { name: 'John Doe', connections: 15 },
                        confidence: 0.88,
                        source: 'graph',
                      },
                      'graph',
                    )
                  }
                >
                  <div className="text-sm font-medium text-gray-900">
                    John Doe
                  </div>
                  <div className="text-xs text-gray-500">
                    Central Node - 15 connections
                  </div>
                  {state.xaiOverlayEnabled && (
                    <div className="mt-2 text-xs text-purple-600">
                      🧠 High centrality score explains importance
                    </div>
                  )}
                  {state.provenanceOverlayEnabled && (
                    <div className="mt-1 text-xs text-green-600">
                      ✓ Verified through multiple sources
                    </div>
                  )}
                </div>
              </div>

              {state.goldenPathActive && goldenPathStep >= 2 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800">
                    🌟 Golden Path Demo
                  </div>
                  <div className="text-xs text-yellow-700 mt-1">
                    {goldenPathStep === 2
                      ? 'Network analysis with XAI explanations'
                      : 'Full platform capabilities demonstrated'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Committee requirement: Entity details panel */}
      {selectedEntity && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                Selected: {selectedEntity.type} - {selectedEntity.id}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Confidence: {Math.round(selectedEntity.confidence * 100)}% |
                Source: {selectedEntity.source}
              </p>
            </div>

            <div className="flex space-x-2">
              {xaiData && (
                <div className="bg-purple-50 border border-purple-200 rounded px-3 py-2">
                  <div className="text-xs font-medium text-purple-800">
                    XAI Explanation
                  </div>
                  <div className="text-xs text-purple-600">
                    Model: {xaiData.model_version} | Confidence:{' '}
                    {Math.round(xaiData.confidence * 100)}%
                  </div>
                </div>
              )}

              {provenanceData && (
                <div className="bg-green-50 border border-green-200 rounded px-3 py-2">
                  <div className="text-xs font-medium text-green-800">
                    Provenance
                  </div>
                  <div className="text-xs text-green-600">
                    {provenanceData.verified ? '✓ Verified' : '⚠ Unverified'}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedEntity(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTriPaneExplorer;
