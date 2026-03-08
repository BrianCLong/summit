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
exports.GEOINTMap = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const maps_1 = __importDefault(require("@rnmapbox/maps"));
const helpers_1 = require("@turf/helpers");
const supercluster_1 = __importDefault(require("supercluster"));
const config_1 = require("@/config");
const hooks_1 = require("@/graphql/hooks");
const mapStore_1 = require("@/stores/mapStore");
const GEOINTLayerControl_1 = require("./GEOINTLayerControl");
const MapControls_1 = require("./MapControls");
const ClusteringToggle_1 = require("./ClusteringToggle");
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = react_native_1.Dimensions.get('window');
const GEOINTMap = ({ initialCenter = config_1.MAP_CONFIG.defaultCenter, initialZoom = config_1.MAP_CONFIG.defaultZoom, onFeaturePress, onEntityPress, showControls = true, showLayers = true, interactive = true, }) => {
    const mapRef = (0, react_1.useRef)(null);
    const cameraRef = (0, react_1.useRef)(null);
    const [bounds, setBounds] = (0, react_1.useState)(null);
    const [zoom, setZoom] = (0, react_1.useState)(initialZoom);
    const [clusteringEnabled, setClusteringEnabled] = (0, react_1.useState)(config_1.FEATURES.enableGEOINTClustering);
    const [page, setPage] = (0, react_1.useState)(0);
    const { mapStyle, visibleLayers, setMapStyle } = (0, mapStore_1.useMapStore)();
    const { features, loading } = (0, hooks_1.useGEOINTFeatures)({ bounds: bounds || undefined });
    const clusteringFeatureEnabled = config_1.FEATURES.enableGEOINTClustering;
    const clusteringActive = clusteringFeatureEnabled ? clusteringEnabled : true;
    // Create supercluster for clustering
    const cluster = (0, react_1.useMemo)(() => {
        const index = new supercluster_1.default({
            radius: config_1.MAP_CONFIG.clusterRadius,
            maxZoom: config_1.MAP_CONFIG.maxClusterZoom,
        });
        const points = features
            .filter((f) => f.geometry.type === 'Point')
            .map((f) => ({
            type: 'Feature',
            geometry: f.geometry,
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
    const pointFeatures = (0, react_1.useMemo)(() => features
        .filter((f) => f.geometry.type === 'Point')
        .map((f) => ({
        type: 'Feature',
        geometry: f.geometry,
        properties: {
            ...f.properties,
            featureId: f.id,
        },
    })), [features]);
    // Get clustered features
    const clusteredFeatures = (0, react_1.useMemo)(() => {
        if (!bounds || !clusteringActive)
            return [];
        const bbox = [
            bounds.west,
            bounds.south,
            bounds.east,
            bounds.north,
        ];
        return cluster.getClusters(bbox, Math.floor(zoom));
    }, [cluster, bounds, zoom, clusteringActive]);
    const sortedPointFeatures = (0, react_1.useMemo)(() => {
        return [...pointFeatures].sort((a, b) => {
            const aTimestamp = a.properties?.timestamp ? new Date(a.properties.timestamp).getTime() : 0;
            const bTimestamp = b.properties?.timestamp ? new Date(b.properties.timestamp).getTime() : 0;
            if (aTimestamp !== bTimestamp)
                return bTimestamp - aTimestamp;
            const aName = a.properties?.name || '';
            const bName = b.properties?.name || '';
            if (aName !== bName)
                return aName.localeCompare(bName);
            return (a.properties?.featureId || '').localeCompare(b.properties?.featureId || '');
        });
    }, [pointFeatures]);
    const totalPages = clusteringActive
        ? 1
        : Math.max(1, Math.ceil(sortedPointFeatures.length / config_1.MAP_CONFIG.renderedPointsPageSize));
    const paginatedFeatures = (0, react_1.useMemo)(() => {
        if (clusteringActive)
            return clusteredFeatures;
        const start = page * config_1.MAP_CONFIG.renderedPointsPageSize;
        return sortedPointFeatures.slice(start, start + config_1.MAP_CONFIG.renderedPointsPageSize);
    }, [clusteringActive, clusteredFeatures, page, sortedPointFeatures]);
    (0, react_1.useEffect)(() => {
        setPage(0);
    }, [bounds, clusteringActive]);
    (0, react_1.useEffect)(() => {
        setPage((prev) => Math.min(prev, Math.max(totalPages - 1, 0)));
    }, [totalPages]);
    // Handle map region change
    const handleRegionChange = (0, react_1.useCallback)(async () => {
        if (!mapRef.current)
            return;
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
    const handleClusterPress = (0, react_1.useCallback)((clusterId, coordinates) => {
        const expansionZoom = Math.min(cluster.getClusterExpansionZoom(clusterId), 20);
        cameraRef.current?.setCamera({
            centerCoordinate: coordinates,
            zoomLevel: expansionZoom,
            animationDuration: 500,
        });
    }, [cluster]);
    // Handle feature press
    const handleFeaturePress = (0, react_1.useCallback)((feature) => {
        if (feature.properties.cluster && clusteringActive) {
            handleClusterPress(feature.properties.cluster_id, feature.geometry.coordinates);
        }
        else if (onFeaturePress) {
            const originalFeature = features.find((f) => f.id === feature.properties.featureId);
            if (originalFeature) {
                onFeaturePress(originalFeature);
            }
        }
    }, [features, onFeaturePress, handleClusterPress, clusteringActive]);
    // Zoom controls
    const handleZoomIn = (0, react_1.useCallback)(() => {
        cameraRef.current?.zoomTo(zoom + 1, 300);
    }, [zoom]);
    const handleZoomOut = (0, react_1.useCallback)(() => {
        cameraRef.current?.zoomTo(zoom - 1, 300);
    }, [zoom]);
    const handleRecenter = (0, react_1.useCallback)(() => {
        cameraRef.current?.setCamera({
            centerCoordinate: [initialCenter.longitude, initialCenter.latitude],
            zoomLevel: initialZoom,
            animationDuration: 500,
        });
    }, [initialCenter, initialZoom]);
    const handleNextPage = (0, react_1.useCallback)(() => {
        setPage((prev) => Math.min(prev + 1, totalPages - 1));
    }, [totalPages]);
    const handlePrevPage = (0, react_1.useCallback)(() => {
        setPage((prev) => Math.max(prev - 1, 0));
    }, []);
    return (<react_native_1.View style={styles.container}>
      <maps_1.default.MapView ref={mapRef} style={styles.map} styleURL={config_1.MAP_CONFIG.styles[mapStyle]} onRegionDidChange={handleRegionChange} onDidFinishLoadingMap={handleRegionChange} compassEnabled={true} scaleBarEnabled={false} attributionEnabled={false} logoEnabled={false} scrollEnabled={interactive} pitchEnabled={interactive} rotateEnabled={interactive} zoomEnabled={interactive}>
        <maps_1.default.Camera ref={cameraRef} defaultSettings={{
            centerCoordinate: [initialCenter.longitude, initialCenter.latitude],
            zoomLevel: initialZoom,
        }}/>

        {/* Render clustered features */}
        <maps_1.default.ShapeSource id="geoint-features" shape={(0, helpers_1.featureCollection)(paginatedFeatures)} cluster={false} onPress={(e) => {
            const feature = e.features?.[0];
            if (feature)
                handleFeaturePress(feature);
        }}>
          {/* Cluster circles */}
          <maps_1.default.CircleLayer id="cluster-circles" filter={['has', 'point_count']} style={{
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
        }}/>

          {/* Cluster count labels */}
          <maps_1.default.SymbolLayer id="cluster-count" filter={['has', 'point_count']} style={{
            textField: ['get', 'point_count_abbreviated'],
            textSize: 14,
            textColor: '#fff',
        }}/>

          {/* Individual markers */}
          <maps_1.default.CircleLayer id="individual-markers" filter={['!', ['has', 'point_count']]} style={{
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
        }}/>
        </maps_1.default.ShapeSource>

        {/* User location */}
        <maps_1.default.UserLocation visible={true} animated={true}/>
      </maps_1.default.MapView>

      {/* Map controls */}
      {showControls && (<MapControls_1.MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onRecenter={handleRecenter} mapStyle={mapStyle} onStyleChange={setMapStyle}/>)}

      {clusteringFeatureEnabled && (<react_native_1.View className="absolute left-4 right-4 top-4 space-y-3">
          <ClusteringToggle_1.ClusteringToggle enabled={clusteringEnabled} onToggle={() => setClusteringEnabled((prev) => !prev)} featureFlagEnabled={clusteringFeatureEnabled}/>

          {!clusteringActive && (<react_native_1.View className="bg-dark-surface rounded-xl border border-dark-border px-4 py-3 flex-row items-center justify-between">
              <react_native_1.View>
                <react_native_1.Text className="text-white font-semibold">
                  Rendering {paginatedFeatures.length} of {sortedPointFeatures.length} points
                </react_native_1.Text>
                <react_native_1.Text className="text-xs text-gray-400">
                  Page {page + 1} of {totalPages}
                </react_native_1.Text>
              </react_native_1.View>

              <react_native_1.View className="flex-row items-center space-x-2">
                <react_native_1.TouchableOpacity accessibilityLabel="Previous page" onPress={handlePrevPage} disabled={page === 0} className="px-3 py-2 rounded-lg border border-dark-border">
                  <react_native_1.Text className={page === 0 ? 'text-gray-500' : 'text-white'}>Prev</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity accessibilityLabel="Next page" onPress={handleNextPage} disabled={page + 1 >= totalPages} className="px-3 py-2 rounded-lg border border-dark-border">
                  <react_native_1.Text className={page + 1 >= totalPages ? 'text-gray-500' : 'text-white'}>Next</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </react_native_1.View>)}
        </react_native_1.View>)}

      {/* Layer control */}
      {showLayers && <GEOINTLayerControl_1.GEOINTLayerControl />}
    </react_native_1.View>);
};
exports.GEOINTMap = GEOINTMap;
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
});
