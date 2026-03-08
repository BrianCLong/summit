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
exports.MapScaleBar = exports.MapCompass = exports.MapControls = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const lucide_react_native_1 = require("lucide-react-native");
const cn_1 = require("@/utils/cn");
const MapControls = ({ onZoomIn, onZoomOut, onRecenter, mapStyle, onStyleChange, className, }) => {
    const [showStylePicker, setShowStylePicker] = (0, react_1.useState)(false);
    const styles = [
        { key: 'satellite', icon: <lucide_react_native_1.Satellite size={18} color="#fff"/>, label: 'Satellite' },
        { key: 'streets', icon: <lucide_react_native_1.Map size={18} color="#fff"/>, label: 'Streets' },
        { key: 'dark', icon: <lucide_react_native_1.Moon size={18} color="#fff"/>, label: 'Dark' },
        { key: 'light', icon: <lucide_react_native_1.Sun size={18} color="#fff"/>, label: 'Light' },
    ];
    const currentStyle = styles.find((s) => s.key === mapStyle);
    return (<react_native_1.View className={(0, cn_1.cn)('absolute left-4 bottom-24', className)}>
      {/* Zoom controls */}
      <react_native_1.View className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden mb-3">
        <react_native_1.TouchableOpacity onPress={onZoomIn} className="p-3 border-b border-dark-border active:bg-dark-elevated">
          <lucide_react_native_1.Plus size={20} color="#fff"/>
        </react_native_1.TouchableOpacity>
        <react_native_1.TouchableOpacity onPress={onZoomOut} className="p-3 active:bg-dark-elevated">
          <lucide_react_native_1.Minus size={20} color="#fff"/>
        </react_native_1.TouchableOpacity>
      </react_native_1.View>

      {/* Recenter button */}
      <react_native_1.TouchableOpacity onPress={onRecenter} className="bg-dark-surface rounded-xl border border-dark-border p-3 mb-3 active:bg-dark-elevated">
        <lucide_react_native_1.Navigation size={20} color="#0ea5e9"/>
      </react_native_1.TouchableOpacity>

      {/* Map style picker */}
      <react_native_1.View className="relative">
        {showStylePicker && (<react_native_1.View className="absolute bottom-14 left-0 bg-dark-surface rounded-xl border border-dark-border overflow-hidden w-32">
            {styles.map((style) => (<react_native_1.TouchableOpacity key={style.key} onPress={() => {
                    onStyleChange(style.key);
                    setShowStylePicker(false);
                }} className={(0, cn_1.cn)('flex-row items-center p-3 border-b border-dark-border', style.key === mapStyle && 'bg-intel-600/20')}>
                {style.icon}
                <react_native_1.Text className={(0, cn_1.cn)('ml-2 text-sm', style.key === mapStyle ? 'text-intel-400' : 'text-white')}>
                  {style.label}
                </react_native_1.Text>
              </react_native_1.TouchableOpacity>))}
          </react_native_1.View>)}

        <react_native_1.TouchableOpacity onPress={() => setShowStylePicker(!showStylePicker)} className="bg-dark-surface rounded-xl border border-dark-border p-3 active:bg-dark-elevated">
          {currentStyle?.icon}
        </react_native_1.TouchableOpacity>
      </react_native_1.View>
    </react_native_1.View>);
};
exports.MapControls = MapControls;
// Compass component
const MapCompass = ({ bearing, onPress, }) => {
    return (<react_native_1.TouchableOpacity onPress={onPress} className="absolute right-4 bottom-24 bg-dark-surface rounded-full border border-dark-border w-12 h-12 items-center justify-center" style={{ transform: [{ rotate: `${-bearing}deg` }] }}>
      <react_native_1.View className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500"/>
      <react_native_1.View className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-white mt-0.5"/>
    </react_native_1.TouchableOpacity>);
};
exports.MapCompass = MapCompass;
// Scale bar component
const MapScaleBar = ({ metersPerPixel, }) => {
    // Calculate a nice round number for the scale bar
    const targetWidth = 100; // pixels
    const targetDistance = metersPerPixel * targetWidth;
    let distance;
    let unit;
    if (targetDistance >= 1000) {
        distance = Math.round(targetDistance / 1000);
        unit = 'km';
    }
    else {
        distance = Math.round(targetDistance / 100) * 100;
        unit = 'm';
    }
    const actualWidth = distance / metersPerPixel * (unit === 'km' ? 1000 : 1);
    return (<react_native_1.View className="absolute left-4 bottom-4 items-start">
      <react_native_1.View style={{ width: actualWidth }} className="h-1 bg-white border border-dark-bg"/>
      <react_native_1.Text className="text-xs text-white mt-1 font-medium">
        {distance} {unit}
      </react_native_1.Text>
    </react_native_1.View>);
};
exports.MapScaleBar = MapScaleBar;
