import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { featureCollection } from '@turf/helpers';
import Supercluster from 'supercluster';

import { FEATURES, MAP_CONFIG } from '@/config';
import type { GEOINTFeature, Entity } from '@/types';
import { useGEOINTFeatures } from '@/graphql/hooks';
import { useMapStore } from '@/stores/mapStore';
import { EntityMarker } from './EntityMarker';
import { ClusterMarker } from './ClusterMarker';
import { GEOINTLayerControl } from './GEOINTLayerControl';
import { MapControls } from './MapControls';
import { ClusteringToggle } from './ClusteringToggle';

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
  const [clusteringEnabled, setClusteringEnabled] = useState(FEATURES.enableGEOINTClustering);
  const [page, setPage] = useState(0);

  const { mapStyle, visibleLayers, setMapStyle } = useMapStore();
  const { features, loading } = useGEOINTFeatures({ bounds: bounds || undefined });

  const clusteringFeatureEnabled = FEATURES.enableGEOINTClustering;
  const clusteringActive = clusteringFeatureEnabled ? clusteringEnabled : true;

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

  const pointFeatures = useMemo(
    () =>
      features
        .filter((f) => f.geometry.type === 'Point')
        .map((f) => ({
          type: 'Feature' as const,
          geometry: f.geometry as { type: 'Point'; coordinates: [number, number] },
          properties: {
            ...f.properties,
            featureId: f.id,
          },
        })),
    [features],
  );

  // Get clustered features
  const clusteredFeatures = useMemo(() => {
    if (!bounds || !clusteringActive) return [];

    const bbox: [number, number, number, number] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
    ];

    return cluster.getClusters(bbox, Math.floor(zoom));
  }, [cluster, bounds, zoom, clusteringActive]);

  const sortedPointFeatures = useMemo(() => {
    return [...pointFeatures].sort((a, b) => {
      const aTimestamp = a.properties?.timestamp ? new Date(a.properties.timestamp).getTime() : 0;
      const bTimestamp = b.properties?.timestamp ? new Date(b.properties.timestamp).getTime() : 0;

      if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;

      const aName = a.properties?.name || '';
      const bName = b.properties?.name || '';
      if (aName !== bName) return aName.localeCompare(bName);

      return (a.properties?.featureId || '').localeCompare(b.properties?.featureId || '');
    });
  }, [pointFeatures]);

  const totalPages = clusteringActive
    ? 1
    : Math.max(1, Math.ceil(sortedPointFeatures.length / MAP_CONFIG.renderedPointsPageSize));

  const paginatedFeatures = useMemo(() => {
    if (clusteringActive) return clusteredFeatures;

    const start = page * MAP_CONFIG.renderedPointsPageSize;
    return sortedPointFeatures.slice(start, start + MAP_CONFIG.renderedPointsPageSize);
  }, [clusteringActive, clusteredFeatures, page, sortedPointFeatures]);

  useEffect(() => {
    setPage(0);
  }, [bounds, clusteringActive]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

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
      const expansionZoom = Math.min(cluster.getClusterExpansionZoom(clusterId), 20);

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
      if (feature.properties.cluster && clusteringActive) {
        handleClusterPress(feature.properties.cluster_id, feature.geometry.coordinates);
      } else if (onFeaturePress) {
        const originalFeature = features.find((f) => f.id === feature.properties.featureId);
        if (originalFeature) {
          onFeaturePress(originalFeature);
        }
      }
    },
    [features, onFeaturePress, handleClusterPress, clusteringActive],
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

  const handleNextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages - 1));
  }, [totalPages]);

  const handlePrevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 0));
  }, []);

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
          shape={featureCollection(paginatedFeatures)}
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
              circleRadius: ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
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

      {clusteringFeatureEnabled && (
        <View className="absolute left-4 right-4 top-4 space-y-3">
          <ClusteringToggle
            enabled={clusteringEnabled}
            onToggle={() => setClusteringEnabled((prev) => !prev)}
            featureFlagEnabled={clusteringFeatureEnabled}
          />

          {!clusteringActive && (
            <View className="bg-dark-surface rounded-xl border border-dark-border px-4 py-3 flex-row items-center justify-between">
              <View>
                <Text className="text-white font-semibold">
                  Rendering {paginatedFeatures.length} of {sortedPointFeatures.length} points
                </Text>
                <Text className="text-xs text-gray-400">
                  Page {page + 1} of {totalPages}
                </Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <TouchableOpacity
                  accessibilityLabel="Previous page"
                  onPress={handlePrevPage}
                  disabled={page === 0}
                  className="px-3 py-2 rounded-lg border border-dark-border"
                >
                  <Text className={page === 0 ? 'text-gray-500' : 'text-white'}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Next page"
                  onPress={handleNextPage}
                  disabled={page + 1 >= totalPages}
                  className="px-3 py-2 rounded-lg border border-dark-border"
                >
                  <Text className={page + 1 >= totalPages ? 'text-gray-500' : 'text-white'}>
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
