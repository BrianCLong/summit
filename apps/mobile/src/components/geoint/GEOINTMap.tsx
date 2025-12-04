import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { point, featureCollection } from '@turf/helpers';
import Supercluster from 'supercluster';

import { MAP_CONFIG } from '@/config';
import type { GEOINTFeature, Entity } from '@/types';
import { useGEOINTFeatures } from '@/graphql/hooks';
import { useMapStore } from '@/stores/mapStore';
import { EntityMarker } from './EntityMarker';
import { ClusterMarker } from './ClusterMarker';
import { GEOINTLayerControl } from './GEOINTLayerControl';
import { MapControls } from './MapControls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GEOINTMapProps {
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  onFeaturePress?: (feature: GEOINTFeature) => void;
  onEntityPress?: (entity: Entity) => void;
  showControls?: boolean;
  showLayers?: boolean;
  interactive?: boolean;
}

export const GEOINTMap: React.FC<GEOINTMapProps> = ({
  initialCenter = MAP_CONFIG.defaultCenter,
  initialZoom = MAP_CONFIG.defaultZoom,
  onFeaturePress,
  onEntityPress,
  showControls = true,
  showLayers = true,
  interactive = true,
}) => {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const [bounds, setBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [zoom, setZoom] = useState(initialZoom);

  const { mapStyle, visibleLayers, setMapStyle } = useMapStore();
  const { features, loading } = useGEOINTFeatures({ bounds: bounds || undefined });

  // Create supercluster for clustering
  const cluster = useMemo(() => {
    const index = new Supercluster({
      radius: MAP_CONFIG.clusterRadius,
      maxZoom: MAP_CONFIG.maxClusterZoom,
    });

    const points = features
      .filter((f) => f.geometry.type === 'Point')
      .map((f) => ({
        type: 'Feature' as const,
        geometry: f.geometry as { type: 'Point'; coordinates: [number, number] },
        properties: {
          ...f.properties,
          featureId: f.id,
        },
      }));

    if (points.length > 0) {
      index.load(points);
    }

    return index;
  }, [features]);

  // Get clustered features
  const clusteredFeatures = useMemo(() => {
    if (!bounds) return [];

    const bbox: [number, number, number, number] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
    ];

    return cluster.getClusters(bbox, Math.floor(zoom));
  }, [cluster, bounds, zoom]);

  // Handle map region change
  const handleRegionChange = useCallback(async () => {
    if (!mapRef.current) return;

    const visibleBounds = await mapRef.current.getVisibleBounds();
    const center = await mapRef.current.getCenter();
    const currentZoom = await mapRef.current.getZoom();

    setBounds({
      north: visibleBounds[0][1],
      south: visibleBounds[1][1],
      east: visibleBounds[0][0],
      west: visibleBounds[1][0],
    });
    setZoom(currentZoom);
  }, []);

  // Handle cluster press
  const handleClusterPress = useCallback(
    (clusterId: number, coordinates: [number, number]) => {
      const expansionZoom = Math.min(
        cluster.getClusterExpansionZoom(clusterId),
        20,
      );

      cameraRef.current?.setCamera({
        centerCoordinate: coordinates,
        zoomLevel: expansionZoom,
        animationDuration: 500,
      });
    },
    [cluster],
  );

  // Handle feature press
  const handleFeaturePress = useCallback(
    (feature: any) => {
      if (feature.properties.cluster) {
        handleClusterPress(feature.properties.cluster_id, feature.geometry.coordinates);
      } else if (onFeaturePress) {
        const originalFeature = features.find(
          (f) => f.id === feature.properties.featureId,
        );
        if (originalFeature) {
          onFeaturePress(originalFeature);
        }
      }
    },
    [features, onFeaturePress, handleClusterPress],
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    cameraRef.current?.zoomTo(zoom + 1, 300);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    cameraRef.current?.zoomTo(zoom - 1, 300);
  }, [zoom]);

  const handleRecenter = useCallback(() => {
    cameraRef.current?.setCamera({
      centerCoordinate: [initialCenter.longitude, initialCenter.latitude],
      zoomLevel: initialZoom,
      animationDuration: 500,
    });
  }, [initialCenter, initialZoom]);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={MAP_CONFIG.styles[mapStyle]}
        onRegionDidChange={handleRegionChange}
        onDidFinishLoadingMap={handleRegionChange}
        compassEnabled={true}
        scaleBarEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        scrollEnabled={interactive}
        pitchEnabled={interactive}
        rotateEnabled={interactive}
        zoomEnabled={interactive}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialCenter.longitude, initialCenter.latitude],
            zoomLevel: initialZoom,
          }}
        />

        {/* Render clustered features */}
        <MapboxGL.ShapeSource
          id="geoint-features"
          shape={featureCollection(clusteredFeatures)}
          cluster={false}
          onPress={(e) => {
            const feature = e.features?.[0];
            if (feature) handleFeaturePress(feature);
          }}
        >
          {/* Cluster circles */}
          <MapboxGL.CircleLayer
            id="cluster-circles"
            filter={['has', 'point_count']}
            style={{
              circleColor: [
                'step',
                ['get', 'point_count'],
                '#0ea5e9',
                10,
                '#f59e0b',
                50,
                '#ef4444',
              ],
              circleRadius: [
                'step',
                ['get', 'point_count'],
                20,
                10,
                30,
                50,
                40,
              ],
              circleOpacity: 0.8,
              circleStrokeColor: '#fff',
              circleStrokeWidth: 2,
            }}
          />

          {/* Cluster count labels */}
          <MapboxGL.SymbolLayer
            id="cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 14,
              textColor: '#fff',
            }}
          />

          {/* Individual markers */}
          <MapboxGL.CircleLayer
            id="individual-markers"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: [
                'match',
                ['get', 'entityType'],
                'PERSON',
                '#8b5cf6',
                'ORGANIZATION',
                '#06b6d4',
                'LOCATION',
                '#10b981',
                'EVENT',
                '#f97316',
                'THREAT',
                '#ef4444',
                '#6366f1',
              ],
              circleRadius: 8,
              circleStrokeColor: '#fff',
              circleStrokeWidth: 2,
            }}
          />
        </MapboxGL.ShapeSource>

        {/* User location */}
        <MapboxGL.UserLocation visible={true} animated={true} />
      </MapboxGL.MapView>

      {/* Map controls */}
      {showControls && (
        <MapControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenter}
          mapStyle={mapStyle}
          onStyleChange={setMapStyle}
        />
      )}

      {/* Layer control */}
      {showLayers && <GEOINTLayerControl />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
