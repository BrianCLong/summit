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
exports.GEOINTLayerControl = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const lucide_react_native_1 = require("lucide-react-native");
const mapStore_1 = require("@/stores/mapStore");
const hooks_1 = require("@/graphql/hooks");
const cn_1 = require("@/utils/cn");
const GEOINTLayerControl = ({ className, }) => {
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const { visibleLayers, toggleLayer, layerOpacity, setLayerOpacity } = (0, mapStore_1.useMapStore)();
    const { layers, loading } = (0, hooks_1.useGEOINTLayers)();
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        height: (0, react_native_reanimated_1.withSpring)(isExpanded ? 300 : 48, {
            damping: 15,
            stiffness: 150,
        }),
    }));
    const layerTypeIcons = {
        entities: 'Users',
        alerts: 'Bell',
        heatmap: 'Flame',
        routes: 'Route',
        areas: 'Square',
        custom: 'Star',
    };
    return (<react_native_reanimated_1.default.View style={animatedStyle} className={(0, cn_1.cn)('absolute right-4 top-4 bg-dark-surface rounded-xl border border-dark-border overflow-hidden w-64', className)}>
      {/* Header */}
      <react_native_1.TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} className="flex-row items-center justify-between p-3 border-b border-dark-border">
        <react_native_1.View className="flex-row items-center">
          <lucide_react_native_1.Layers size={18} color="#fff"/>
          <react_native_1.Text className="text-white font-medium ml-2">Layers</react_native_1.Text>
        </react_native_1.View>
        {isExpanded ? (<lucide_react_native_1.ChevronUp size={18} color="#71717a"/>) : (<lucide_react_native_1.ChevronDown size={18} color="#71717a"/>)}
      </react_native_1.TouchableOpacity>

      {/* Layer list */}
      {isExpanded && (<react_native_1.ScrollView className="flex-1 p-2">
          {layers.map((layer) => {
                const isVisible = visibleLayers.includes(layer.id);
                const opacity = layerOpacity[layer.id] ?? layer.opacity;
                return (<react_native_1.View key={layer.id} className="mb-2">
                <react_native_1.TouchableOpacity onPress={() => toggleLayer(layer.id)} className="flex-row items-center justify-between p-2 rounded-lg bg-dark-elevated">
                  <react_native_1.View className="flex-row items-center flex-1">
                    {isVisible ? (<lucide_react_native_1.Eye size={16} color="#0ea5e9"/>) : (<lucide_react_native_1.EyeOff size={16} color="#71717a"/>)}
                    <react_native_1.Text className={(0, cn_1.cn)('ml-2 text-sm', isVisible ? 'text-white' : 'text-dark-muted')}>
                      {layer.name}
                    </react_native_1.Text>
                  </react_native_1.View>
                  <react_native_1.Text className="text-xs text-dark-muted">
                    {layer.featureCount || 0}
                  </react_native_1.Text>
                </react_native_1.TouchableOpacity>

                {/* Opacity slider */}
                {isVisible && (<react_native_1.View className="flex-row items-center mt-1 px-2">
                    <react_native_1.Text className="text-xs text-dark-muted w-12">Opacity</react_native_1.Text>
                    <react_native_1.View className="flex-1 h-1 bg-dark-elevated rounded-full mx-2">
                      <react_native_1.View style={{ width: `${opacity * 100}%` }} className="h-full bg-intel-500 rounded-full"/>
                    </react_native_1.View>
                    <react_native_1.Text className="text-xs text-dark-muted w-8 text-right">
                      {Math.round(opacity * 100)}%
                    </react_native_1.Text>
                  </react_native_1.View>)}
              </react_native_1.View>);
            })}

          {layers.length === 0 && !loading && (<react_native_1.Text className="text-dark-muted text-center py-4 text-sm">
              No layers available
            </react_native_1.Text>)}
        </react_native_1.ScrollView>)}
    </react_native_reanimated_1.default.View>);
};
exports.GEOINTLayerControl = GEOINTLayerControl;
