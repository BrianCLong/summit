"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const material_1 = require("@mui/material");
const client_1 = require("@apollo/client");
const cytoscape_1 = __importDefault(require("cytoscape"));
const cytoscape_cola_1 = __importDefault(require("cytoscape-cola")); // Assuming cola layout is available or can be added
const cytoscape_dagre_1 = __importDefault(require("cytoscape-dagre")); // Assuming dagre layout is available or can be added
// Register layouts if not already registered globally
cytoscape_1.default.use(cytoscape_cola_1.default);
cytoscape_1.default.use(cytoscape_dagre_1.default);
const GET_NARRATIVE_HEATMAP_DATA = (0, client_1.gql) `
  query GetNarrativeHeatmapData($scenarioId: ID!) {
    getNarrativeHeatmapData(scenarioId: $scenarioId) {
      id
      narrative
      intensity
      location # This will be a JSON object, e.g., { lat, lon } or { x, y } for network
      timestamp
    }
  }
`;
const NarrativeHeatmap = ({ scenarioId }) => {
    const cyRef = (0, react_1.useRef)(null);
    const cyInstance = (0, react_1.useRef)(null);
    const { loading, error, data } = (0, client_1.useQuery)(GET_NARRATIVE_HEATMAP_DATA, {
        variables: { scenarioId },
        pollInterval: 15000, // Poll every 15 seconds
    });
    (0, react_1.useEffect)(() => {
        if (cyRef.current && !cyInstance.current && data) {
            cyInstance.current = (0, cytoscape_1.default)({
                container: cyRef.current,
                elements: [], // Initial empty elements
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#666',
                            label: 'data(narrative)',
                            'text-valign': 'center',
                            color: 'white',
                            'text-outline-width': 2,
                            'text-outline-color': '#333',
                            width: 'mapData(intensity, 0, 10, 20, 80)', // Scale node size by intensity
                            height: 'mapData(intensity, 0, 10, 20, 80)',
                            'font-size': 'mapData(intensity, 0, 10, 8, 24)',
                        },
                    },
                    {
                        selector: 'edge',
                        style: {
                            width: 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier',
                        },
                    },
                ],
                layout: {
                    name: 'cola', // Use cola for a force-directed layout
                    animate: true,
                    randomize: false,
                    maxSimulationTime: 1500,
                    fit: true,
                    padding: 30,
                    nodeDimensionsIncludeLabels: true,
                },
            });
        }
        if (cyInstance.current && data) {
            const cy = cyInstance.current;
            const elements = [];
            const narratives = new Set();
            data.getNarrativeHeatmapData.forEach((item) => {
                narratives.add(item.narrative);
                elements.push({
                    data: {
                        id: item.id,
                        narrative: item.narrative,
                        intensity: item.intensity,
                        location: item.location,
                        timestamp: item.timestamp,
                    },
                });
            });
            // Add dummy edges for visualization if needed, or infer from relationships
            // For a simple heatmap, nodes representing narratives might be enough.
            // If there are relationships between narratives (e.g., "supports", "counters"),
            // those would be added as edges. For now, just nodes.
            cy.json({ elements: elements });
            cy.layout({ name: 'cola' }).run(); // Re-run layout on data update
        }
    }, [data]); // Re-run effect when data changes
    (0, react_1.useEffect)(() => {
        return () => {
            if (cyInstance.current) {
                cyInstance.current.destroy();
                cyInstance.current = null;
            }
        };
    }, []);
    if (loading)
        return <material_1.CircularProgress />;
    if (error)
        return (<material_1.Alert severity="error">
        Error loading heatmap data: {error.message}
      </material_1.Alert>);
    const heatmapData = data?.getNarrativeHeatmapData || [];
    return (<material_1.Box>
      <material_1.Typography variant="h6" gutterBottom>
        Narrative Heatmaps
      </material_1.Typography>
      <material_1.Alert severity="info" sx={{ mb: 2 }}>
        WAR-GAMED SIMULATION - Visualizations are based on simulated data and
        for decision support only.
      </material_1.Alert>

      {heatmapData.length === 0 ? (<material_1.Typography variant="body1" color="text.secondary">
          No narrative heatmap data available for this scenario yet. Run a
          simulation to generate data.
        </material_1.Typography>) : (<material_1.Paper elevation={3} sx={{ p: 2, height: 600, width: '100%' }}>
          <div ref={cyRef} style={{ width: '100%', height: '100%' }}/>
        </material_1.Paper>)}
    </material_1.Box>);
};
exports.default = NarrativeHeatmap;
