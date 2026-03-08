"use strict";
// @ts-nocheck
/**
 * Comprehensive Geospatial Intelligence Dashboard
 */
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
exports.GeospatialDashboard = void 0;
const react_1 = __importStar(require("react"));
const Grid_1 = __importDefault(require("@mui/material/Grid"));
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const MapContainer_1 = require("./MapContainer");
const MarkerLayer_1 = require("./layers/MarkerLayer");
const HeatmapLayer_1 = require("./layers/HeatmapLayer");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GeoJSONLayer_1 = require("./layers/GeoJSONLayer");
const LayerControl_1 = require("./controls/LayerControl");
/**
 * Military-grade GEOINT dashboard with advanced visualization
 */
const GeospatialDashboard = ({ data, onIncidentClick, onEntityClick, }) => {
    const [viewMode, setViewMode] = (0, react_1.useState)('map');
    const [layers, setLayers] = (0, react_1.useState)([
        { id: 'incidents', name: 'Incidents', visible: true, opacity: 1, type: 'overlay' },
        { id: 'entities', name: 'Entities', visible: true, opacity: 1, type: 'overlay' },
        { id: 'geofences', name: 'Geofences', visible: true, opacity: 0.5, type: 'overlay' },
        { id: 'hotspots', name: 'Hotspots', visible: false, opacity: 0.7, type: 'overlay' },
    ]);
    const handleLayerToggle = (0, react_1.useCallback)((layerId, visible) => {
        setLayers((prev) => prev.map((layer) => layer.id === layerId ? { ...layer, visible } : layer));
    }, []);
    const handleOpacityChange = (0, react_1.useCallback)((layerId, opacity) => {
        setLayers((prev) => prev.map((layer) => layer.id === layerId ? { ...layer, opacity } : layer));
    }, []);
    const stats = {
        totalIncidents: data.incidents.length,
        criticalIncidents: data.incidents.filter((i) => i.severity >= 8).length,
        totalEntities: data.entities.length,
        activeGeofences: data.geofences?.features.length || 0,
    };
    const incidentsLayer = layers.find((l) => l.id === 'incidents');
    const entitiesLayer = layers.find((l) => l.id === 'entities');
    const geofencesLayer = layers.find((l) => l.id === 'geofences');
    const hotspotsLayer = layers.find((l) => l.id === 'hotspots');
    return (<material_1.Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <material_1.Paper elevation={2} sx={{
            p: 2,
            borderRadius: 0,
            borderBottom: '2px solid #1976d2',
        }}>
        <material_1.Typography variant="h5" fontWeight="bold">
          Geospatial Intelligence Dashboard
        </material_1.Typography>
        <material_1.Typography variant="caption" color="text.secondary">
          Real-time GEOINT analysis and visualization
        </material_1.Typography>
      </material_1.Paper>

      {/* Stats Bar */}
      <material_1.Paper sx={{ p: 1.5 }}>
        <Grid_1.default container spacing={2}>
          <Grid_1.default xs={12} sm={6} md={3}>
            <material_1.Card variant="outlined">
              <material_1.CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <material_1.Stack direction="row" alignItems="center" spacing={1}>
                  <icons_material_1.Place color="primary"/>
                  <material_1.Box>
                    <material_1.Typography variant="h6">{stats.totalIncidents}</material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Total Incidents
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default xs={12} sm={6} md={3}>
            <material_1.Card variant="outlined">
              <material_1.CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <material_1.Stack direction="row" alignItems="center" spacing={1}>
                  <icons_material_1.TrendingUp color="error"/>
                  <material_1.Box>
                    <material_1.Typography variant="h6">{stats.criticalIncidents}</material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Critical Events
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default xs={12} sm={6} md={3}>
            <material_1.Card variant="outlined">
              <material_1.CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <material_1.Stack direction="row" alignItems="center" spacing={1}>
                  <icons_material_1.MyLocation color="success"/>
                  <material_1.Box>
                    <material_1.Typography variant="h6">{stats.totalEntities}</material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Tracked Entities
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
          <Grid_1.default xs={12} sm={6} md={3}>
            <material_1.Card variant="outlined">
              <material_1.CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <material_1.Stack direction="row" alignItems="center" spacing={1}>
                  <icons_material_1.Timeline color="warning"/>
                  <material_1.Box>
                    <material_1.Typography variant="h6">{stats.activeGeofences}</material_1.Typography>
                    <material_1.Typography variant="caption" color="text.secondary">
                      Active Geofences
                    </material_1.Typography>
                  </material_1.Box>
                </material_1.Stack>
              </material_1.CardContent>
            </material_1.Card>
          </Grid_1.default>
        </Grid_1.default>
      </material_1.Paper>

      {/* View Mode Selector */}
      <material_1.Paper sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <material_1.ToggleButtonGroup value={viewMode} exclusive onChange={(_, newMode) => newMode && setViewMode(newMode)} size="small">
          <material_1.ToggleButton value="map">
            <icons_material_1.Place sx={{ mr: 0.5 }} fontSize="small"/>
            Map View
          </material_1.ToggleButton>
          <material_1.ToggleButton value="heatmap">
            <icons_material_1.TrendingUp sx={{ mr: 0.5 }} fontSize="small"/>
            Heatmap
          </material_1.ToggleButton>
          <material_1.ToggleButton value="cluster">
            <icons_material_1.MyLocation sx={{ mr: 0.5 }} fontSize="small"/>
            Cluster
          </material_1.ToggleButton>
        </material_1.ToggleButtonGroup>
      </material_1.Paper>

      {/* Map */}
      <material_1.Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer_1.MapContainer height="100%">
          {/* Layer Control */}
          <material_1.Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
            <LayerControl_1.LayerControl layers={layers} onLayerToggle={handleLayerToggle} onOpacityChange={handleOpacityChange}/>
          </material_1.Box>

          {/* Incidents Layer */}
          {viewMode === 'map' && incidentsLayer?.visible && (<>
              {data.incidents.map((incident) => (<MarkerLayer_1.Marker key={incident.id} position={incident.position} title={incident.type} popup={`
                    <strong>${incident.type}</strong><br/>
                    Severity: ${incident.severity}/10<br/>
                    Time: ${incident.timestamp.toLocaleString()}
                  `} onClick={() => onIncidentClick?.(incident.id)}/>))}
            </>)}

          {/* Cluster View */}
          {viewMode === 'cluster' && incidentsLayer?.visible && (<MarkerLayer_1.MarkerClusterLayer markers={data.incidents.map((i) => ({
                id: i.id,
                position: i.position,
                data: i,
            }))} onMarkerClick={(id) => onIncidentClick?.(id)}/>)}

          {/* Heatmap View */}
          {viewMode === 'heatmap' && hotspotsLayer?.visible && data.hotspots && (<HeatmapLayer_1.HeatmapLayer points={data.hotspots.map((h) => ({ ...h.position, intensity: h.intensity }))}/>)}

          {/* Entities Layer */}
          {entitiesLayer?.visible && (<MarkerLayer_1.MarkerClusterLayer markers={data.entities.map((e) => ({
                id: e.id,
                position: e.position,
                data: e,
            }))} onMarkerClick={(id) => onEntityClick?.(id)}/>)}

          {/* Geofences Layer */}
          {geofencesLayer?.visible && data.geofences && (<GeoJSONLayer_1.GeoJSONLayer data={data.geofences} style={{
                color: '#ff6b6b',
                weight: 2,
                opacity: geofencesLayer.opacity,
                fillOpacity: 0.2,
            }}/>)}
        </MapContainer_1.MapContainer>
      </material_1.Box>
    </material_1.Box>);
};
exports.GeospatialDashboard = GeospatialDashboard;
