/**
 * Comprehensive Geospatial Intelligence Dashboard
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  MyLocation,
  Timeline,
  Place,
  TrendingUp,
} from '@mui/icons-material';
import { MapContainer } from './MapContainer';
import { Marker, MarkerClusterLayer } from './layers/MarkerLayer';
import { HeatmapLayer } from './layers/HeatmapLayer';
import { GeoJSONLayer, ChoroplethLayer } from './layers/GeoJSONLayer';
import { LayerControl, LayerConfig } from './controls/LayerControl';
import type { GeoPoint } from '@intelgraph/geospatial';
import type { FeatureCollection } from 'geojson';

export interface DashboardData {
  incidents: Array<{
    id: string;
    position: GeoPoint;
    type: string;
    severity: number;
    timestamp: Date;
  }>;
  entities: Array<{
    id: string;
    position: GeoPoint;
    name: string;
    type: string;
  }>;
  geofences?: FeatureCollection;
  hotspots?: Array<{
    position: GeoPoint;
    intensity: number;
  }>;
}

export interface GeospatialDashboardProps {
  data: DashboardData;
  onIncidentClick?: (incidentId: string) => void;
  onEntityClick?: (entityId: string) => void;
}

/**
 * Military-grade GEOINT dashboard with advanced visualization
 */
export const GeospatialDashboard: React.FC<GeospatialDashboardProps> = ({
  data,
  onIncidentClick,
  onEntityClick,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'heatmap' | 'cluster'>('map');
  const [layers, setLayers] = useState<LayerConfig[]>([
    { id: 'incidents', name: 'Incidents', visible: true, opacity: 1, type: 'overlay' },
    { id: 'entities', name: 'Entities', visible: true, opacity: 1, type: 'overlay' },
    { id: 'geofences', name: 'Geofences', visible: true, opacity: 0.5, type: 'overlay' },
    { id: 'hotspots', name: 'Hotspots', visible: false, opacity: 0.7, type: 'overlay' },
  ]);

  const handleLayerToggle = useCallback((layerId: string, visible: boolean) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  }, []);

  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer
      )
    );
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: '2px solid #1976d2',
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Geospatial Intelligence Dashboard
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Real-time GEOINT analysis and visualization
        </Typography>
      </Paper>

      {/* Stats Bar */}
      <Paper sx={{ p: 1.5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Place color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalIncidents}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Incidents
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUp color="error" />
                  <Box>
                    <Typography variant="h6">{stats.criticalIncidents}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Critical Events
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <MyLocation color="success" />
                  <Box>
                    <Typography variant="h6">{stats.totalEntities}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tracked Entities
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Timeline color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.activeGeofences}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active Geofences
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* View Mode Selector */}
      <Paper sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="map">
            <Place sx={{ mr: 0.5 }} fontSize="small" />
            Map View
          </ToggleButton>
          <ToggleButton value="heatmap">
            <TrendingUp sx={{ mr: 0.5 }} fontSize="small" />
            Heatmap
          </ToggleButton>
          <ToggleButton value="cluster">
            <MyLocation sx={{ mr: 0.5 }} fontSize="small" />
            Cluster
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Map */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <MapContainer height="100%">
          {/* Layer Control */}
          <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
            <LayerControl
              layers={layers}
              onLayerToggle={handleLayerToggle}
              onOpacityChange={handleOpacityChange}
            />
          </Box>

          {/* Incidents Layer */}
          {viewMode === 'map' && incidentsLayer?.visible && (
            <>
              {data.incidents.map((incident) => (
                <Marker
                  key={incident.id}
                  position={incident.position}
                  title={incident.type}
                  popup={`
                    <strong>${incident.type}</strong><br/>
                    Severity: ${incident.severity}/10<br/>
                    Time: ${incident.timestamp.toLocaleString()}
                  `}
                  onClick={() => onIncidentClick?.(incident.id)}
                />
              ))}
            </>
          )}

          {/* Cluster View */}
          {viewMode === 'cluster' && incidentsLayer?.visible && (
            <MarkerClusterLayer
              markers={data.incidents.map((i) => ({
                id: i.id,
                position: i.position,
                data: i,
              }))}
              onMarkerClick={(id) => onIncidentClick?.(id)}
            />
          )}

          {/* Heatmap View */}
          {viewMode === 'heatmap' && hotspotsLayer?.visible && data.hotspots && (
            <HeatmapLayer points={data.hotspots.map((h) => ({ ...h.position, intensity: h.intensity }))} />
          )}

          {/* Entities Layer */}
          {entitiesLayer?.visible && (
            <MarkerClusterLayer
              markers={data.entities.map((e) => ({
                id: e.id,
                position: e.position,
                data: e,
              }))}
              onMarkerClick={(id) => onEntityClick?.(id)}
            />
          )}

          {/* Geofences Layer */}
          {geofencesLayer?.visible && data.geofences && (
            <GeoJSONLayer
              data={data.geofences}
              style={{
                color: '#ff6b6b',
                weight: 2,
                opacity: geofencesLayer.opacity,
                fillOpacity: 0.2,
              }}
            />
          )}
        </MapContainer>
      </Box>
    </Box>
  );
};
