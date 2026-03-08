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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapScreen = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const native_1 = require("@react-navigation/native");
const lucide_react_native_1 = require("lucide-react-native");
const geoint_1 = require("@/components/geoint");
const hooks_1 = require("@/graphql/hooks");
const mapStore_1 = require("@/stores/mapStore");
const ui_1 = require("@/components/ui");
const MapScreen = () => {
    const navigation = (0, native_1.useNavigation)();
    const [selectedFeature, setSelectedFeature] = (0, react_1.useState)(null);
    const { selectedEntityId, setSelectedEntity } = (0, mapStore_1.useMapStore)();
    const { entity: selectedEntity } = (0, hooks_1.useEntity)(selectedEntityId || '');
    const handleFeaturePress = (0, react_1.useCallback)((feature) => {
        setSelectedFeature(feature);
        if (feature.properties.entityId) {
            setSelectedEntity(feature.properties.entityId);
        }
    }, [setSelectedEntity]);
    const handleFullScreen = (0, react_1.useCallback)(() => {
        navigation.navigate('MapFullScreen');
    }, [navigation]);
    const handleEntityDetails = (0, react_1.useCallback)(() => {
        if (selectedFeature?.properties.entityId) {
            navigation.navigate('EntityDetails', {
                entityId: selectedFeature.properties.entityId,
            });
        }
    }, [navigation, selectedFeature]);
    return (<react_native_safe_area_context_1.SafeAreaView className="flex-1 bg-dark-bg" edges={['top']}>
      {/* Header */}
      <react_native_1.View className="absolute top-0 left-0 right-0 z-10 px-4 pt-12">
        <react_native_1.View className="flex-row items-center justify-between">
          <react_native_1.View className="bg-dark-surface/90 rounded-xl border border-dark-border px-4 py-2">
            <ui_1.Text size="lg" weight="semibold">
              GEOINT Map
            </ui_1.Text>
          </react_native_1.View>
          <react_native_1.View className="flex-row items-center gap-2">
            <react_native_1.TouchableOpacity className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center">
              <lucide_react_native_1.Filter size={18} color="#fff"/>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={handleFullScreen} className="w-10 h-10 rounded-full bg-dark-surface/90 border border-dark-border items-center justify-center">
              <lucide_react_native_1.Maximize2 size={18} color="#fff"/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>
      </react_native_1.View>

      {/* Map */}
      <geoint_1.GEOINTMap onFeaturePress={handleFeaturePress} showControls={true} showLayers={true}/>

      {/* Feature Details Bottom Sheet */}
      <ui_1.BottomSheet open={!!selectedFeature} onClose={() => {
            setSelectedFeature(null);
            setSelectedEntity(null);
        }} snapPoints={[0.35, 0.6]}>
        {selectedFeature && (<react_native_1.View className="py-2">
            {/* Feature header */}
            <react_native_1.View className="flex-row items-center justify-between mb-4">
              {selectedFeature.properties.entityType && (<ui_1.EntityTypeBadge type={selectedFeature.properties.entityType}/>)}
              {selectedFeature.properties.confidence !== undefined && (<ui_1.Badge variant="secondary">
                  {selectedFeature.properties.confidence}% confidence
                </ui_1.Badge>)}
            </react_native_1.View>

            {/* Feature name */}
            <ui_1.Text size="xl" weight="bold">
              {selectedFeature.properties.name || 'Unknown Location'}
            </ui_1.Text>

            {/* Description */}
            {selectedFeature.properties.description && (<ui_1.Text variant="muted" className="mt-2">
                {selectedFeature.properties.description}
              </ui_1.Text>)}

            {/* Coordinates */}
            {selectedFeature.geometry.type === 'Point' && (<react_native_1.View className="flex-row items-center mt-4 gap-4">
                <react_native_1.View className="flex-row items-center">
                  <lucide_react_native_1.Target size={14} color="#71717a"/>
                  <ui_1.Text size="sm" variant="muted" className="ml-1">
                    {selectedFeature.geometry.coordinates[1].toFixed(6)},{' '}
                    {selectedFeature.geometry.coordinates[0].toFixed(6)}
                  </ui_1.Text>
                </react_native_1.View>
              </react_native_1.View>)}

            {/* Source and timestamp */}
            <react_native_1.View className="flex-row items-center mt-2 gap-4">
              {selectedFeature.properties.source && (<ui_1.Text size="xs" variant="muted">
                  Source: {selectedFeature.properties.source}
                </ui_1.Text>)}
              {selectedFeature.properties.timestamp && (<ui_1.Text size="xs" variant="muted">
                  {new Date(selectedFeature.properties.timestamp).toLocaleString()}
                </ui_1.Text>)}
            </react_native_1.View>

            {/* Actions */}
            <react_native_1.View className="flex-row mt-6 gap-3">
              {selectedFeature.properties.entityId && (<ui_1.Button className="flex-1" onPress={handleEntityDetails}>
                  View Entity Details
                </ui_1.Button>)}
              <ui_1.Button variant="outline" className="flex-1" onPress={() => {
                // Copy coordinates
            }}>
                Copy Coordinates
              </ui_1.Button>
            </react_native_1.View>
          </react_native_1.View>)}
      </ui_1.BottomSheet>
    </react_native_safe_area_context_1.SafeAreaView>);
};
exports.MapScreen = MapScreen;
