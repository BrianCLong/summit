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
exports.DonutClusterMarker = exports.ClusterMarker = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const getClusterSize = (count) => {
    if (count < 10)
        return 40;
    if (count < 50)
        return 50;
    if (count < 100)
        return 60;
    return 70;
};
const getClusterColor = (count, priorityBreakdown) => {
    // If there are critical items, show red
    if (priorityBreakdown && priorityBreakdown.critical > 0) {
        return '#ef4444';
    }
    // If there are high priority items, show orange
    if (priorityBreakdown && priorityBreakdown.high > 0) {
        return '#f59e0b';
    }
    // Color based on count
    if (count < 10)
        return '#0ea5e9';
    if (count < 50)
        return '#8b5cf6';
    return '#6366f1';
};
const formatCount = (count) => {
    if (count < 1000)
        return count.toString();
    if (count < 10000)
        return `${(count / 1000).toFixed(1)}K`;
    return `${Math.floor(count / 1000)}K`;
};
const ClusterMarker = ({ count, onPress, priorityBreakdown, }) => {
    const scale = (0, react_native_reanimated_1.useSharedValue)(1);
    const size = getClusterSize(count);
    const color = getClusterColor(count, priorityBreakdown);
    const handlePressIn = () => {
        scale.value = (0, react_native_reanimated_1.withSpring)(0.9);
    };
    const handlePressOut = () => {
        scale.value = (0, react_native_reanimated_1.withSpring)(1);
    };
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        transform: [{ scale: scale.value }],
    }));
    return (<react_native_1.TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <react_native_reanimated_1.default.View style={[
            animatedStyle,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
            },
        ]} className="items-center justify-center border-2 border-white shadow-lg">
        <react_native_1.Text className="text-white font-bold" style={{ fontSize: size < 50 ? 12 : 14 }}>
          {formatCount(count)}
        </react_native_1.Text>
      </react_native_reanimated_1.default.View>

      {/* Priority ring indicator */}
      {priorityBreakdown && priorityBreakdown.critical > 0 && (<react_native_1.View style={{
                position: 'absolute',
                width: size + 8,
                height: size + 8,
                borderRadius: (size + 8) / 2,
                borderWidth: 2,
                borderColor: '#ef4444',
                top: -4,
                left: -4,
            }}/>)}
    </react_native_1.TouchableOpacity>);
};
exports.ClusterMarker = ClusterMarker;
// Donut cluster showing composition
const DonutClusterMarker = ({ count, composition, onPress }) => {
    const size = getClusterSize(count);
    const total = composition.reduce((sum, c) => sum + c.count, 0);
    // Calculate arc angles
    let currentAngle = 0;
    const arcs = composition.map((c) => {
        const angle = (c.count / total) * 360;
        const startAngle = currentAngle;
        currentAngle += angle;
        return { ...c, startAngle, endAngle: currentAngle };
    });
    return (<react_native_1.TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#1e1e20',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#27272a',
        }}>
      {/* Outer ring with composition - simplified representation */}
      <react_native_1.View style={{
            position: 'absolute',
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            borderWidth: 4,
            borderColor: composition[0]?.color || '#6366f1',
        }}/>

      {/* Inner count */}
      <react_native_1.View style={{
            width: size - 16,
            height: size - 16,
            borderRadius: (size - 16) / 2,
            backgroundColor: '#141415',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
        <react_native_1.Text className="text-white font-bold text-sm">{formatCount(count)}</react_native_1.Text>
      </react_native_1.View>
    </react_native_1.TouchableOpacity>);
};
exports.DonutClusterMarker = DonutClusterMarker;
