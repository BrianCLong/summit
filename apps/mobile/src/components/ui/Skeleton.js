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
exports.SkeletonEntityCard = exports.SkeletonListItem = exports.SkeletonCard = exports.Skeleton = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const cn_1 = require("@/utils/cn");
const Skeleton = ({ className, variant = 'default', width, height, style, ...props }) => {
    const shimmer = (0, react_native_reanimated_1.useSharedValue)(0);
    (0, react_1.useEffect)(() => {
        shimmer.value = (0, react_native_reanimated_1.withRepeat)((0, react_native_reanimated_1.withTiming)(1, { duration: 1500 }), -1, false);
    }, [shimmer]);
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        opacity: (0, react_native_reanimated_1.interpolate)(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
    }));
    const variantClasses = {
        default: 'rounded-lg',
        circular: 'rounded-full',
        text: 'rounded h-4',
    };
    return (<react_native_reanimated_1.default.View className={(0, cn_1.cn)('bg-dark-elevated', variantClasses[variant], className)} style={[{ width, height }, animatedStyle, style]} {...props}/>);
};
exports.Skeleton = Skeleton;
// Skeleton Card
const SkeletonCard = ({ className }) => (<react_native_1.View className={(0, cn_1.cn)('p-4 rounded-xl bg-dark-surface border border-dark-border', className)}>
    <react_native_1.View className="flex-row items-center mb-4">
      <exports.Skeleton variant="circular" width={40} height={40}/>
      <react_native_1.View className="ml-3 flex-1">
        <exports.Skeleton variant="text" className="w-3/4 mb-2"/>
        <exports.Skeleton variant="text" className="w-1/2"/>
      </react_native_1.View>
    </react_native_1.View>
    <exports.Skeleton variant="text" className="w-full mb-2"/>
    <exports.Skeleton variant="text" className="w-4/5 mb-2"/>
    <exports.Skeleton variant="text" className="w-2/3"/>
  </react_native_1.View>);
exports.SkeletonCard = SkeletonCard;
// Skeleton List Item
const SkeletonListItem = ({ className }) => (<react_native_1.View className={(0, cn_1.cn)('flex-row items-center p-4', className)}>
    <exports.Skeleton variant="circular" width={48} height={48}/>
    <react_native_1.View className="ml-3 flex-1">
      <exports.Skeleton variant="text" className="w-3/4 mb-2"/>
      <exports.Skeleton variant="text" className="w-1/2"/>
    </react_native_1.View>
  </react_native_1.View>);
exports.SkeletonListItem = SkeletonListItem;
// Skeleton Entity Card
const SkeletonEntityCard = ({ className }) => (<react_native_1.View className={(0, cn_1.cn)('p-4 rounded-xl bg-dark-surface border border-dark-border', className)}>
    <react_native_1.View className="flex-row items-center justify-between mb-3">
      <exports.Skeleton variant="default" width={80} height={24} className="rounded-full"/>
      <exports.Skeleton variant="default" width={60} height={20} className="rounded"/>
    </react_native_1.View>
    <exports.Skeleton variant="text" className="w-4/5 mb-2 h-6"/>
    <exports.Skeleton variant="text" className="w-full mb-2"/>
    <exports.Skeleton variant="text" className="w-2/3"/>
    <react_native_1.View className="flex-row mt-4 gap-2">
      <exports.Skeleton variant="default" width={60} height={24} className="rounded-full"/>
      <exports.Skeleton variant="default" width={60} height={24} className="rounded-full"/>
    </react_native_1.View>
  </react_native_1.View>);
exports.SkeletonEntityCard = SkeletonEntityCard;
