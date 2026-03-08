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
exports.CircularProgress = exports.ProgressBar = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const class_variance_authority_1 = require("class-variance-authority");
const cn_1 = require("@/utils/cn");
const progressVariants = (0, class_variance_authority_1.cva)('h-full rounded-full', {
    variants: {
        variant: {
            default: 'bg-intel-500',
            success: 'bg-green-500',
            warning: 'bg-amber-500',
            destructive: 'bg-red-500',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});
const ProgressBar = ({ value, max = 100, variant, showLabel = false, label, className, height = 'default', }) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const heightClasses = {
        sm: 'h-1',
        default: 'h-2',
        lg: 'h-3',
    };
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => ({
        width: (0, react_native_reanimated_1.withSpring)(`${percentage}%`, {
            damping: 15,
            stiffness: 100,
        }),
    }));
    return (<react_native_1.View className={(0, cn_1.cn)('w-full', className)}>
      {(showLabel || label) && (<react_native_1.View className="flex-row justify-between mb-1">
          {label && <react_native_1.Text className="text-sm text-dark-muted">{label}</react_native_1.Text>}
          {showLabel && (<react_native_1.Text className="text-sm text-dark-muted">{Math.round(percentage)}%</react_native_1.Text>)}
        </react_native_1.View>)}
      <react_native_1.View className={(0, cn_1.cn)('w-full rounded-full bg-dark-elevated overflow-hidden', heightClasses[height])}>
        <react_native_reanimated_1.default.View style={animatedStyle} className={progressVariants({ variant })}/>
      </react_native_1.View>
    </react_native_1.View>);
};
exports.ProgressBar = ProgressBar;
const CircularProgress = ({ value, max = 100, size = 60, strokeWidth = 6, color = '#0ea5e9', showLabel = true, className, }) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (<react_native_1.View className={(0, cn_1.cn)('items-center justify-center', className)} style={{ width: size, height: size }}>
      <react_native_1.View className="absolute" style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#27272a',
        }}/>
      <react_native_1.View className="absolute" style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: percentage > 25 ? color : 'transparent',
            borderBottomColor: percentage > 50 ? color : 'transparent',
            borderLeftColor: percentage > 75 ? color : 'transparent',
            transform: [{ rotate: '-90deg' }],
        }}/>
      {showLabel && (<react_native_1.Text className="text-sm font-semibold text-white">{Math.round(percentage)}%</react_native_1.Text>)}
    </react_native_1.View>);
};
exports.CircularProgress = CircularProgress;
